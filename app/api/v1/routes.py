from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import FileResponse
import httpx
from PIL import Image
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.graph.campaign_workflow import campaign_workflow
from app.graph.optimization import optimization_graph
from app.graph.workflows import copy_graph, planning_graph
from app.models.entities import ApprovalRecord, AuditLog, Campaign, CampaignAsset, ExecutionJob, OAuthConnection, OptimizationRecommendation, WebsiteAnalysis
from app.providers.media import MockImageProvider, MockVideoProvider, get_local_ltx_video_provider, get_local_sd_turbo_provider, get_paddle_ocr_provider, get_smolvlm_provider
from app.schemas.api import AdCopyGenerationResponse, ApprovalRequest, AssetAnalysisResponse, AssetReviewRequest, CampaignChatRequest, CampaignChatResponse, CampaignCreateRequest, CampaignHistoryResponse, CampaignOptimizationResponse, CampaignPlanRequest, CampaignPlanResponse, CampaignReportResponse, CampaignResponse, CampaignUpdateRequest, CampaignValidationResponse, CampaignWorkflowRequest, CampaignWorkflowResponse, CopyRequest, DisconnectResponse, HealthResponse, ImageGenerateRequest, ImageGenerationResponse, ImageToImageRequest, ImageToImageResponse, JobResponse, ModelCapabilitiesResponse, ModelStatusResponse, OAuthCallbackResponse, OAuthConnectionResponse, OAuthStartResponse, PublishResponse, RejectRequest, VideoGenerateRequest, VideoGenerationResponse, WebsiteAnalyzeRequest, WebsiteAnalysisResponse
from app.services.analytics import get_live_google_ads_report, get_mock_report
from app.services.campaigns import quality_check
from app.services.jobs import create_job, finish_job
from app.services.security import create_pkce_pair, encrypt_tokens, oauth_authorization_url, oauth_states
from app.services.website import analyze_website
from app.services.model_registry import MODEL_SPECS, check_model

router = APIRouter()


def require_actor(authorization: str | None = Header(default=None), x_actor: str | None = Header(default=None)) -> str:
    settings = get_settings()
    if settings.api_auth_token and authorization != f"Bearer {settings.api_auth_token}":
        raise HTTPException(status_code=401, detail="Valid bearer authentication is required")
    if not settings.api_auth_token and settings.app_env.lower() in {"production", "prod"}:
        raise HTTPException(status_code=503, detail="Protected actions require API_AUTH_TOKEN")
    return x_actor or "local-development-user"


def campaign_view(campaign: Campaign) -> dict[str, Any]:
    return {"id": campaign.id, "name": campaign.name, "status": campaign.status, "version": campaign.version, "goal": campaign.goal, "budget": campaign.budget, "currency": campaign.currency, "plan": campaign.plan, "copy": campaign.copy, "validation": campaign.validation, "approved_version": campaign.approved_version, "approved_at": campaign.approved_at, "assets": [{"id": asset.id, "kind": asset.kind, "provider": asset.provider, "uri": asset.uri, "metadata": asset.metadata_json} for asset in campaign.assets]}


def audit(db: Session, actor: str, action: str, entity_type: str, entity_id: str, details: dict[str, Any] | None = None) -> None:
    db.add(AuditLog(actor=actor, action=action, entity_type=entity_type, entity_id=entity_id, details=details or {}))


@router.get("/health", response_model=HealthResponse)
def health() -> dict[str, str]:
    return {"status": "ok", "environment": get_settings().app_env}


@router.get("/models/status", response_model=ModelStatusResponse)
def model_status() -> dict[str, Any]:
    checks = [check_model(key) for key in MODEL_SPECS]
    return {"models": checks, "providers": {"llm": get_settings().ai_provider, "image": get_settings().image_provider, "video": get_settings().video_provider, "vision": get_settings().vision_provider, "ocr": get_settings().ocr_provider}}


@router.get("/models/capabilities", response_model=ModelCapabilitiesResponse)
def model_capabilities() -> dict[str, Any]:
    return {"models": [{"key": spec.key, "repository": spec.repository, "purpose": spec.purpose, "license": spec.license_name, "license_url": spec.license_url, "dependencies": list(spec.dependencies), "hardware_notes": spec.hardware_notes} for spec in MODEL_SPECS.values()]}


@router.post("/websites/analyze", response_model=WebsiteAnalysisResponse)
def website_analyze(payload: WebsiteAnalyzeRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        result = analyze_website(str(payload.url))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    db.add(WebsiteAnalysis(url=result["url"], result=result))
    db.commit()
    return result


@router.post("/campaigns/plan", response_model=CampaignPlanResponse)
def plan(payload: CampaignPlanRequest) -> dict[str, Any]:
    return planning_graph.invoke({"request": payload.model_dump()})["plan"]


@router.post("/campaigns/chat", response_model=CampaignChatResponse)
def campaign_chat(payload: CampaignChatRequest, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    message = payload.message.casefold()
    selected_action = payload.action
    if selected_action == "auto":
        if any(word in message for word in ("headline", "headlines", "description", "ad copy", "copy variation")):
            selected_action = "generate_copy"
        elif any(word in message for word in ("optimize", "optimization", "improve performance")):
            selected_action = "optimize"
        elif any(word in message for word in ("report", "performance", "impressions", "clicks", "roas")):
            selected_action = "report"
        elif any(word in message for word in ("validate", "check campaign", "quality check")):
            selected_action = "validate"
        else:
            selected_action = "plan"

    campaign = db.get(Campaign, payload.campaign_id) if payload.campaign_id else None
    if payload.campaign_id and campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    provider = get_settings().ai_provider if selected_action in {"plan", "generate_copy", "optimize"} else "deterministic"
    simulated = provider == "mock"

    if selected_action == "plan":
        business_name = payload.business_name or (campaign.name if campaign else None)
        goal = payload.goal or (campaign.goal if campaign else None)
        budget = payload.daily_budget or (campaign.budget if campaign else None)
        missing = [field for field, value in (("business_name", business_name), ("goal", goal), ("daily_budget", budget)) if value is None]
        if missing:
            return {"reply": "I need the following campaign details before I can ask the campaign planner for a recommendation: " + ", ".join(missing) + ".", "action": selected_action, "status": "needs_details", "provider": provider, "simulated": simulated, "campaign_id": campaign.id if campaign else None, "result": {}, "missing_fields": missing}
        request = {
            "business_name": business_name, "goal": goal, "daily_budget": budget,
            "currency": payload.currency or (campaign.currency if campaign else "USD"),
            "product_details": payload.product_details,
            "audience": payload.audience, "location": payload.location,
            "language": payload.language, "website_analysis": payload.website_analysis or (campaign.plan if campaign else {}),
        }
        result = planning_graph.invoke({"request": request})["plan"]
        if campaign:
            campaign.plan = result
            campaign.version += 1
            if campaign.approved_version is not None:
                campaign.status = "generated"
                campaign.approved_at = None
                campaign.approval_actor = None
                campaign.approved_version = None
            audit(db, actor, "campaign.chat_plan_updated", "campaign", campaign.id, {"version": campaign.version})
            db.commit()
        return {"reply": f"Campaign plan recommendation prepared using the {result.get('provider', 'mock')} provider. Review the structured recommendation below; this does not create Google Ads settings or publish a campaign.", "action": selected_action, "status": "completed", "provider": result.get("provider", "mock"), "simulated": result.get("provider", "mock") == "mock", "campaign_id": campaign.id if campaign else None, "result": result, "missing_fields": []}

    if campaign is None:
        return {"reply": "Select or create a saved campaign before requesting copy, validation, reporting, or optimization.", "action": selected_action, "status": "needs_details", "provider": provider, "simulated": simulated, "campaign_id": None, "result": {}, "missing_fields": ["campaign_id"]}

    if selected_action == "generate_copy":
        product_name = payload.product_name or payload.business_name or campaign.name
        result = copy_graph.invoke({"request": {"product_name": product_name, "benefits": payload.benefits, "verified_claims": payload.verified_claims, "variations": 4}, "attempts": 0})
        campaign.copy = result["copy"]
        campaign.version += 1
        if campaign.approved_version is not None:
            campaign.status = "generated"
            campaign.approved_at = None
            campaign.approval_actor = None
            campaign.approved_version = None
        audit(db, actor, "campaign.chat_copy_generated", "campaign", campaign.id, {"version": campaign.version})
        db.commit()
        copy_provider = campaign.copy.get("provider", "mock")
        return {"reply": f"Ad copy draft generated with provider={copy_provider}, simulated={str(campaign.copy.get('simulated', True)).lower()}. Review it before validation or approval.", "action": selected_action, "status": "completed", "provider": copy_provider, "simulated": campaign.copy.get("simulated", True), "campaign_id": campaign.id, "result": {"copy": campaign.copy, "issues": result.get("issues", []), "revision_attempts": result.get("attempts", 0)}, "missing_fields": []}

    if selected_action == "validate":
        result = quality_check(campaign)
        campaign.validation = result
        campaign.status = "validated" if result["status"] != "failed" else "generated"
        campaign.version += 1
        audit(db, actor, "campaign.chat_validated", "campaign", campaign.id, {"status": result["status"]})
        db.commit()
        return {"reply": f"Deterministic campaign validation completed: {result['status']}. This is not official Google Ads approval.", "action": selected_action, "status": "completed", "provider": "deterministic", "simulated": False, "campaign_id": campaign.id, "result": result, "missing_fields": []}

    if selected_action == "report":
        result = get_mock_report()
        return {"reply": "This campaign report is deterministic mock data and is not connected to a Google Ads account.", "action": selected_action, "status": "completed", "provider": "mock", "simulated": True, "campaign_id": campaign.id, "result": result, "missing_fields": []}

    if selected_action == "optimize":
        metrics = get_mock_report()["metrics"]
        result = optimization_graph.invoke({"metrics": metrics})
        db.add(OptimizationRecommendation(campaign_id=campaign.id, recommendations=result["recommendations"], status="pending_approval"))
        audit(db, actor, "campaign.chat_optimization_recommended", "campaign", campaign.id, {"count": len(result["recommendations"])})
        db.commit()
        return {"reply": f"Optimization suggestions are ready from {result['provider']} metrics. They are recommendations only; no account changes were applied.", "action": selected_action, "status": "completed", "provider": result["provider"], "simulated": result["provider"] == "mock", "campaign_id": campaign.id, "result": {"metrics": result["normalized"], "recommendations": result["recommendations"], "applied": False}, "missing_fields": []}

    raise HTTPException(status_code=422, detail="Unsupported chat action")


@router.post("/campaigns", response_model=CampaignResponse)
def create_campaign(payload: CampaignCreateRequest, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    data = payload.model_dump()
    recommendation = planning_graph.invoke({"request": data})["plan"]
    campaign = Campaign(name=data["name"], goal=data["goal"], budget=data["daily_budget"], currency=data["currency"], plan=recommendation, status="generated")
    db.add(campaign)
    db.flush()
    audit(db, actor, "campaign.created", "campaign", campaign.id)
    db.commit()
    db.refresh(campaign)
    return campaign_view(campaign)


@router.get("/campaigns", response_model=list[CampaignResponse])
def list_campaigns(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [campaign_view(item) for item in db.scalars(select(Campaign).order_by(Campaign.created_at.desc())).all()]


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign_view(campaign)


@router.get("/campaigns/{campaign_id}/history", response_model=list[CampaignHistoryResponse])
def campaign_history(campaign_id: str, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    if db.get(Campaign, campaign_id) is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    events = db.scalars(select(AuditLog).where(AuditLog.entity_type == "campaign", AuditLog.entity_id == campaign_id).order_by(AuditLog.created_at.asc())).all()
    approvals = db.scalars(select(ApprovalRecord).where(ApprovalRecord.campaign_id == campaign_id).order_by(ApprovalRecord.created_at.asc())).all()
    return [{"type": "audit", "id": event.id, "actor": event.actor, "action": event.action, "details": event.details, "created_at": event.created_at} for event in events] + [{"type": "approval", "id": item.id, "actor": item.actor, "decision": item.decision, "campaign_version": item.campaign_version, "notes": item.notes, "created_at": item.created_at} for item in approvals]


@router.patch("/campaigns/{campaign_id}", response_model=CampaignResponse)
def update_campaign(campaign_id: str, payload: CampaignUpdateRequest, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    changes = payload.model_dump(exclude_unset=True, by_alias=True)
    for key, value in changes.items():
        setattr(campaign, key, value)
    if changes:
        campaign.version += 1
        if campaign.approved_version is not None:
            campaign.status = "generated"
            campaign.approved_at = None
            campaign.approval_actor = None
            campaign.approved_version = None
        audit(db, actor, "campaign.updated", "campaign", campaign.id, {"fields": list(changes)})
        db.commit()
        db.refresh(campaign)
    return campaign_view(campaign)


@router.post("/campaigns/{campaign_id}/generate", response_model=AdCopyGenerationResponse)
def generate_campaign_copy(campaign_id: str, payload: CopyRequest, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    result = copy_graph.invoke({"request": payload.model_dump(), "attempts": 0})
    campaign.copy = result["copy"]
    campaign.version += 1
    campaign.status = "generated"
    campaign.approved_at = None
    campaign.approved_version = None
    audit(db, actor, "campaign.copy_generated", "campaign", campaign.id)
    db.commit()
    return {"copy": campaign.copy, "issues": result.get("issues", []), "revision_attempts": result.get("attempts", 0), "simulated": campaign.copy.get("simulated", True), "provider": campaign.copy.get("provider", "mock")}


@router.post("/campaigns/{campaign_id}/workflow", response_model=CampaignWorkflowResponse)
def run_campaign_workflow(campaign_id: str, payload: CampaignWorkflowRequest, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    job = create_job(db, "campaign_generation", payload.model_dump())
    job.status = "running"
    db.commit()
    try:
        result = campaign_workflow.invoke({"request": payload.model_dump()})
        campaign.plan = result.get("plan", campaign.plan)
        campaign.copy = result.get("copy", campaign.copy)
        campaign.version += 1
        campaign.validation = {"status": "failed" if result.get("errors") else "passed", "issues": result.get("errors", []), "workflow": True}
        campaign.status = "generated" if result.get("errors") else "pending_approval"
        campaign.approved_at = None
        campaign.approved_version = None
        assets = result.get("image_result", {}).get("assets", [result.get("image_result", {})])
        for item in assets:
            if item.get("uri"):
                db.add(CampaignAsset(campaign_id=campaign.id, kind="image", provider=item.get("provider", "mock"), uri=item["uri"], metadata_json=item.get("metadata", {"simulated": item.get("simulated", True)})))
        video = result.get("video_result", {})
        if video.get("uri"):
            db.add(CampaignAsset(campaign_id=campaign.id, kind="video", provider=video.get("provider", "mock"), uri=video["uri"], metadata_json={"simulated": video.get("simulated", True), "status": video.get("status")}))
        audit(db, actor, "campaign.workflow_completed", "campaign", campaign.id, {"status": campaign.status, "job_id": job.id})
        job.status = "completed" if not result.get("errors") else "failed"
        job.result = {"campaign_id": campaign.id, "status": campaign.status, "provider": campaign.copy.get("provider", "mock"), "simulated": campaign.copy.get("simulated", True)}
        job.error = "; ".join(result.get("errors", []))
        db.commit()
        return {"job_id": job.id, "campaign": campaign_view(campaign), "workflow": result}
    except Exception as exc:
        db.rollback()
        job = db.get(ExecutionJob, job.id)
        if job:
            job.status = "failed"
            job.error = f"{type(exc).__name__}: {exc}"
            db.commit()
        raise HTTPException(status_code=422, detail=f"Campaign workflow failed: {type(exc).__name__}") from exc


@router.post("/campaigns/{campaign_id}/validate", response_model=CampaignValidationResponse)
def validate_campaign(campaign_id: str, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    result = quality_check(campaign)
    campaign.validation = result
    campaign.status = "validated" if result["status"] != "failed" else "generated"
    campaign.version += 1
    audit(db, actor, "campaign.validated", "campaign", campaign.id, {"status": result["status"]})
    db.commit()
    return result


@router.post("/campaigns/{campaign_id}/approve", response_model=CampaignResponse)
def approve_campaign(campaign_id: str, payload: ApprovalRequest, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status not in {"validated", "pending_approval"} or campaign.validation.get("status") == "failed":
        raise HTTPException(status_code=409, detail="Campaign must pass validation before approval")
    campaign.status = "approved"
    campaign.approval_actor = payload.actor
    campaign.approved_at = datetime.now(timezone.utc)
    campaign.approved_version = campaign.version
    db.add(ApprovalRecord(campaign_id=campaign.id, campaign_version=campaign.version, actor=payload.actor, decision="approved", notes=payload.notes))
    audit(db, actor, "campaign.approved", "campaign", campaign.id, {"approved_version": campaign.version})
    db.commit()
    db.refresh(campaign)
    return campaign_view(campaign)


@router.post("/campaigns/{campaign_id}/reject", response_model=CampaignResponse)
def reject_campaign(campaign_id: str, payload: RejectRequest, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = "rejected"
    campaign.approved_at = None
    campaign.approved_version = None
    db.add(ApprovalRecord(campaign_id=campaign.id, campaign_version=campaign.version, actor=payload.actor, decision="rejected", notes=payload.reason))
    audit(db, actor, "campaign.rejected", "campaign", campaign.id, {"reason": payload.reason})
    db.commit()
    return campaign_view(campaign)


@router.post("/campaigns/{campaign_id}/publish", response_model=PublishResponse)
def publish_campaign(campaign_id: str, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status != "approved" or campaign.approved_version != campaign.version:
        raise HTTPException(status_code=409, detail="Current campaign version lacks valid human approval")
    settings = get_settings()
    campaign.status = "ready_to_publish"
    audit(db, actor, "campaign.publish_prepared", "campaign", campaign.id, {"writes_enabled": settings.google_ads_enable_writes})
    db.commit()
    if not settings.google_ads_enable_writes:
        return {"status": "dry_run", "published": False, "campaign_id": campaign.id, "message": "Google Ads writes are disabled; no mutation request was sent."}
    return {"status": "blocked", "published": False, "campaign_id": campaign.id, "message": "Live Google Ads mutation provider is not implemented; no mutation request was sent."}


@router.get("/campaigns/{campaign_id}/report", response_model=CampaignReportResponse)
def campaign_report(campaign_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    if db.get(Campaign, campaign_id) is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return get_mock_report()


@router.get("/google-ads/report", response_model=CampaignReportResponse)
def google_ads_report(customer_id: str | None = Query(default=None), source: str = Query(default="mock", pattern="^(mock|live)$"), db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    if source == "mock":
        return get_mock_report()
    try:
        return get_live_google_ads_report(db, customer_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/campaigns/{campaign_id}/optimize", response_model=CampaignOptimizationResponse)
def optimize_campaign(campaign_id: str, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    if db.get(Campaign, campaign_id) is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    metrics = get_mock_report()["metrics"]
    result = optimization_graph.invoke({"metrics": metrics})
    metrics = result["normalized"]
    recommendations = result["recommendations"]
    db.add(OptimizationRecommendation(campaign_id=campaign_id, recommendations=recommendations, status="pending_approval"))
    audit(db, actor, "campaign.optimized", "campaign", campaign_id, {"recommendation_count": len(recommendations)})
    db.commit()
    return {"source": result["provider"], "simulated": result["provider"] == "mock", "metrics": metrics, "recommendations": recommendations, "applied": False}


@router.post("/media/images/generate", response_model=ImageGenerationResponse)
def generate_image(payload: ImageGenerateRequest, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    if payload.campaign_id and db.get(Campaign, payload.campaign_id) is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    provider = get_settings().image_provider
    if provider == "local":
        try:
            result = get_local_sd_turbo_provider().generate(payload.prompt, payload.aspect_ratio, payload.brand_name, payload.variations)
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Local SD-Turbo inference unavailable: {type(exc).__name__}") from exc
        for item in result["assets"]:
            asset = CampaignAsset(campaign_id=payload.campaign_id, kind="image", provider="local-real", uri=item["uri"], metadata_json=item["metadata"])
            db.add(asset)
            db.flush()
            item["asset_id"] = asset.id
    elif provider == "mock":
        result = MockImageProvider().generate(payload.prompt, payload.aspect_ratio)
        result["simulated"] = True
        asset = CampaignAsset(campaign_id=payload.campaign_id, kind="image", provider="mock", uri=result["uri"], metadata_json={"prompt": payload.prompt, "aspect_ratio": payload.aspect_ratio, "simulated": True})
        db.add(asset)
    else:
        raise HTTPException(status_code=503, detail=f"Unsupported IMAGE_PROVIDER: {provider}")
    db.commit()
    if provider == "mock":
        result["asset_id"] = asset.id
    return result


@router.post("/media/images/image-to-image", response_model=ImageToImageResponse)
def image_to_image(payload: ImageToImageRequest, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    asset = db.get(CampaignAsset, payload.asset_id)
    if asset is None or asset.kind != "image":
        raise HTTPException(status_code=404, detail="Image asset not found")
    source = (get_settings().storage_dir / "generated" / Path(asset.uri).name).resolve()
    root = (get_settings().storage_dir / "generated").resolve()
    if root not in source.parents or not source.is_file():
        raise HTTPException(status_code=404, detail="Image file is unavailable")
    try:
        with Image.open(source) as image:
            output = get_local_sd_turbo_provider().generate_from_image(image, payload.prompt, payload.strength)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Local image-to-image unavailable: {type(exc).__name__}") from exc
    name = f"sd-turbo-img2img-{uuid4().hex}.png"
    output.save(root / name, format="PNG")
    created = CampaignAsset(campaign_id=asset.campaign_id, kind="image", provider="local-real", uri=f"/media/files/{name}", metadata_json={"prompt": payload.prompt, "strength": payload.strength, "simulated": False, "source_asset_id": asset.id})
    db.add(created)
    db.commit()
    return {"asset_id": created.id, "provider": "local-real", "simulated": False, "uri": created.uri}


@router.post("/media/videos/generate", status_code=202, response_model=VideoGenerationResponse)
def generate_video(payload: VideoGenerateRequest, db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, Any]:
    if payload.campaign_id and db.get(Campaign, payload.campaign_id) is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    job = create_job(db, "video_generation", payload.model_dump())
    try:
        provider_name = get_settings().video_provider
        if provider_name == "local":
            provider = get_local_ltx_video_provider()
            if payload.image_asset_id:
                source_asset = db.get(CampaignAsset, payload.image_asset_id)
                if source_asset is None or source_asset.kind != "image":
                    raise ValueError("An existing campaign image asset is required for image-to-video generation")
                image_path = (get_settings().storage_dir / "generated" / Path(source_asset.uri).name).resolve()
                media_root = (get_settings().storage_dir / "generated").resolve()
                if media_root not in image_path.parents or not image_path.is_file():
                    raise ValueError("The conditioning image is unavailable")
                result = provider.generate_from_image(str(image_path), payload.prompt, payload.duration_seconds, payload.aspect_ratio)
            else:
                result = provider.generate(payload.prompt, payload.duration_seconds, payload.aspect_ratio)
        elif provider_name == "mock":
            result = MockVideoProvider().generate(payload.prompt, payload.duration_seconds, payload.aspect_ratio)
        else:
            raise RuntimeError(f"Unsupported VIDEO_PROVIDER: {provider_name}")
        finish_job(db, job, result)
        if result.get("uri"):
            db.add(CampaignAsset(campaign_id=payload.campaign_id, kind="video", provider=result.get("provider", "mock"), uri=result["uri"], metadata_json={"simulated": result.get("simulated", True), "status": result.get("status"), "prompt": payload.prompt}))
            db.commit()
        return {"job_id": job.id, "status": job.status, "result": result, "simulated": str(result.get("simulated", "false")).lower() == "true"}
    except Exception as exc:
        job.status = "failed"
        job.error = f"{type(exc).__name__}: {exc}"
        db.commit()
        return {"job_id": job.id, "status": job.status, "error": job.error, "simulated": False}


@router.post("/media/assets/{asset_id}/analyze", response_model=AssetAnalysisResponse)
def analyze_asset(asset_id: str, payload: AssetReviewRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    asset = db.get(CampaignAsset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Media asset not found")
    filename = Path(asset.uri).name
    target = (get_settings().storage_dir / "generated" / filename).resolve()
    if target.parent != (get_settings().storage_dir / "generated").resolve() or not target.is_file():
        raise HTTPException(status_code=404, detail="Stored asset file is unavailable")
    media_type = "image/png" if asset.kind == "image" else "video/mp4" if asset.kind == "video" else "application/octet-stream"
    results: dict[str, Any] = {"asset_id": asset.id, "deterministic": {"asset_exists": True, "asset_kind": asset.kind, "mime_type": media_type}}
    settings = get_settings()
    if settings.vision_provider == "local":
        try:
            results["vision"] = get_smolvlm_provider().analyze_video(str(target), payload.prompt) if asset.kind == "video" else get_smolvlm_provider().analyze_image(str(target), payload.prompt)
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Local visual analysis unavailable: {type(exc).__name__}") from exc
    elif settings.vision_provider != "mock":
        raise HTTPException(status_code=503, detail=f"Unsupported VISION_PROVIDER: {settings.vision_provider}")
    if settings.ocr_provider == "local":
        if asset.kind != "image":
            raise HTTPException(status_code=422, detail="OCR analysis currently supports image assets only")
        results["ocr"] = get_paddle_ocr_provider().analyze_image(str(target), payload.expected_text)
    elif settings.ocr_provider != "mock":
        raise HTTPException(status_code=503, detail=f"Unsupported OCR_PROVIDER: {settings.ocr_provider}")
    if settings.vision_provider == "mock":
        results["vision"] = {"provider": "mock", "simulated": True, "assessment": "No real visual assessment was performed."}
    if settings.ocr_provider == "mock":
        results["ocr"] = {"provider": "mock", "simulated": True, "text_regions": []}
    return results


@router.get("/media/files/{filename}", response_class=FileResponse, responses={200: {"content": {"application/octet-stream": {"schema": {"type": "string", "format": "binary"}}}}})
def get_media_file(filename: str) -> FileResponse:
    root = (get_settings().storage_dir / "generated").resolve()
    target = (root / filename).resolve()
    if target.parent != root or not target.is_file():
        raise HTTPException(status_code=404, detail="Media file not found")
    return FileResponse(target)


@router.get("/google-ads/oauth/start", response_model=OAuthStartResponse)
def oauth_start() -> dict[str, str]:
    try:
        verifier, challenge = create_pkce_pair()
        state = oauth_states.create(verifier)
        return {"authorization_url": oauth_authorization_url(state, challenge), "state": state}
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/google-ads/oauth/callback", response_model=OAuthCallbackResponse)
def oauth_callback(state: str = Query(...), code: str | None = Query(default=None), db: Session = Depends(get_db)) -> dict[str, Any]:
    verifier = oauth_states.consume(state)
    if verifier is None:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    if not code:
        raise HTTPException(status_code=400, detail="OAuth authorization code is required")
    settings = get_settings()
    try:
        settings.validate_google_oauth()
        response = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={"code": code, "client_id": settings.google_client_id, "client_secret": settings.google_client_secret, "redirect_uri": settings.oauth_redirect_uri, "grant_type": "authorization_code", "code_verifier": verifier},
            timeout=10.0,
        )
        response.raise_for_status()
        tokens = response.json()
    except (ValueError, httpx.HTTPError) as exc:
        raise HTTPException(status_code=502, detail="Google OAuth token exchange failed") from exc
    refresh_token = tokens.get("refresh_token")
    access_token = tokens.get("access_token")
    if not refresh_token or not access_token:
        raise HTTPException(status_code=502, detail="Google OAuth response did not contain required tokens")
    for existing in db.scalars(select(OAuthConnection).where(OAuthConnection.provider == "google_ads")).all():
        db.delete(existing)
    db.add(OAuthConnection(provider="google_ads", account_label=settings.google_ads_customer_id or "Google Ads account", encrypted_tokens=encrypt_tokens({"access_token": access_token, "refresh_token": refresh_token, "expires_in": str(tokens.get("expires_in", ""))})))
    db.commit()
    return {"status": "connected", "connected": True}


@router.get("/google-ads/connection", response_model=OAuthConnectionResponse)
def oauth_connection(db: Session = Depends(get_db)) -> dict[str, Any]:
    connection = db.scalar(select(OAuthConnection).where(OAuthConnection.provider == "google_ads").limit(1))
    return {"connected": connection is not None, "account_label": connection.account_label if connection else None}


@router.delete("/google-ads/connection", response_model=DisconnectResponse)
def disconnect_oauth(db: Session = Depends(get_db), actor: str = Depends(require_actor)) -> dict[str, bool]:
    for connection in db.scalars(select(OAuthConnection).where(OAuthConnection.provider == "google_ads")).all():
        try:
            from app.services.security import decrypt_tokens

            token = decrypt_tokens(connection.encrypted_tokens).get("refresh_token", "")
            if token:
                httpx.post("https://oauth2.googleapis.com/revoke", data={"token": token}, timeout=5.0)
        except Exception:
            pass
        db.delete(connection)
    db.commit()
    return {"disconnected": True}


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    job = db.get(ExecutionJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"id": job.id, "kind": job.kind, "status": job.status, "result": job.result, "error": job.error}