from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.core.config import get_settings
from app.graph.workflows import copy_graph, planning_graph
from app.providers.media import MockImageProvider, MockVideoProvider, get_local_ltx_video_provider, get_local_sd_turbo_provider
from app.services.website import analyze_website


class CampaignWorkflowState(TypedDict, total=False):
    request: dict[str, Any]
    website_analysis: dict[str, Any]
    plan: dict[str, Any]
    copy: dict[str, Any]
    copy_issues: list[dict[str, str]]
    image_result: dict[str, Any]
    image_issues: list[dict[str, str]]
    video_result: dict[str, Any]
    errors: list[str]
    execution_status: str
    final_status: str


def build_campaign_workflow():
    def website(state: CampaignWorkflowState) -> dict[str, Any]:
        url = state["request"].get("website_url")
        if not url:
            return {"website_analysis": state["request"].get("website_analysis", {})}
        return {"website_analysis": analyze_website(str(url))}

    def plan(state: CampaignWorkflowState) -> dict[str, Any]:
        request = {**state["request"], "website_analysis": state.get("website_analysis", {})}
        return {"plan": planning_graph.invoke({"request": request})["plan"]}

    def copywriting(state: CampaignWorkflowState) -> dict[str, Any]:
        request = state["request"]
        result = copy_graph.invoke({"request": {"product_name": request["product_name"], "benefits": request.get("benefits", []), "verified_claims": request.get("verified_claims", []), "variations": request.get("variations", 3)}, "attempts": 0})
        return {"copy": result["copy"], "copy_issues": result.get("issues", [])}

    def image(state: CampaignWorkflowState) -> dict[str, Any]:
        if not state["request"].get("generate_image"):
            return {"image_result": {"status": "skipped"}}
        settings = get_settings()
        prompt = state["request"].get("image_prompt") or state["request"]["product_name"]
        if settings.image_provider == "local":
            provider = get_local_sd_turbo_provider()
            result = provider.generate(prompt, state["request"].get("aspect_ratio", "1:1"), state["request"].get("business_name", ""))
            return {"image_result": result}
        if settings.image_provider == "mock":
            return {"image_result": MockImageProvider().generate(prompt, state["request"].get("aspect_ratio", "1:1"))}
        raise RuntimeError(f"Unsupported image provider {settings.image_provider}")

    def image_quality(state: CampaignWorkflowState) -> dict[str, Any]:
        result = state.get("image_result", {})
        if result.get("status") == "skipped":
            return {"image_issues": []}
        assets = result.get("assets", [result])
        issues = []
        from pathlib import Path
        from PIL import Image

        storage = get_settings().storage_dir.resolve()
        for asset in assets:
            path = (storage / "generated" / Path(asset.get("uri", "")).name).resolve()
            if storage not in path.parents or not path.is_file():
                issues.append({"severity": "error", "code": "image_missing", "message": "Generated image file is missing or outside storage"})
                continue
            try:
                with Image.open(path) as image_file:
                    image_file.verify()
            except Exception:
                issues.append({"severity": "error", "code": "image_invalid", "message": "Generated image could not be decoded"})
        return {"image_issues": issues}

    def video(state: CampaignWorkflowState) -> dict[str, Any]:
        if not state["request"].get("generate_video"):
            return {"video_result": {"status": "skipped"}}
        request = state["request"]
        settings = get_settings()
        try:
            if settings.video_provider == "local":
                result = get_local_ltx_video_provider().generate(request.get("video_prompt", request["product_name"]), request.get("duration_seconds", 6), request.get("aspect_ratio", "9:16"))
            elif settings.video_provider == "mock":
                result = MockVideoProvider().generate(request.get("video_prompt", request["product_name"]), request.get("duration_seconds", 6), request.get("aspect_ratio", "9:16"))
            else:
                raise RuntimeError(f"Unsupported video provider {settings.video_provider}")
            return {"video_result": result}
        except Exception as exc:
            return {"video_result": {"status": "failed", "simulated": False, "error": f"{type(exc).__name__}: {exc}"}}

    def validate(state: CampaignWorkflowState) -> dict[str, Any]:
        errors = []
        errors.extend(issue["message"] for issue in state.get("copy_issues", []) if issue.get("severity") == "error")
        errors.extend(issue["message"] for issue in state.get("image_issues", []) if issue.get("severity") == "error")
        if state.get("video_result", {}).get("status") == "failed":
            errors.append(state["video_result"].get("error", "Video generation failed"))
        return {"errors": errors, "execution_status": "failed" if errors else "completed"}

    def approval_gate(state: CampaignWorkflowState) -> dict[str, Any]:
        return {"final_status": "failed" if state.get("errors") else "pending_approval"}

    graph = StateGraph(CampaignWorkflowState)
    graph.add_node("website_analyzer", website)
    graph.add_node("campaign_planner", plan)
    graph.add_node("ad_copy_generator", copywriting)
    graph.add_node("image_creative_generator", image)
    graph.add_node("image_quality_checker", image_quality)
    graph.add_node("video_creative_generator", video)
    graph.add_node("campaign_validator", validate)
    graph.add_node("human_approval_gate", approval_gate)
    graph.set_entry_point("website_analyzer")
    graph.add_edge("website_analyzer", "campaign_planner")
    graph.add_edge("campaign_planner", "ad_copy_generator")
    graph.add_edge("ad_copy_generator", "image_creative_generator")
    graph.add_edge("image_creative_generator", "image_quality_checker")
    graph.add_edge("image_quality_checker", "video_creative_generator")
    graph.add_edge("video_creative_generator", "campaign_validator")
    graph.add_edge("campaign_validator", "human_approval_gate")
    graph.add_edge("human_approval_gate", END)
    return graph.compile()


campaign_workflow = build_campaign_workflow()