from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class WebsiteAnalyzeRequest(BaseModel):
    url: HttpUrl


class WebsiteAnalysisResponse(BaseModel):
    url: str
    business_name: str = ""
    description: str = ""
    products_services: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
    pricing: list[str] = Field(default_factory=list)
    logo_url: str | None = None
    colors: list[str] = Field(default_factory=list)
    text: str = ""
    images: list[str] = Field(default_factory=list)
    landing_pages: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    provider: str = "httpx+beautifulsoup"


class CampaignPlanRequest(BaseModel):
    website_analysis: dict[str, Any] = Field(default_factory=dict)
    business_name: str = Field(min_length=1, max_length=200)
    product_details: str = Field(default="", max_length=4000)
    goal: str = Field(min_length=1, max_length=200)
    audience: str = Field(default="", max_length=1000)
    location: str = Field(default="", max_length=500)
    language: str = Field(default="English", max_length=80)
    daily_budget: float = Field(gt=0, le=1_000_000)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    target_roas: float | None = Field(default=None, gt=0, le=100_000)
    channels: list[Literal["Search", "YouTube", "Gmail", "Maps", "Discover", "Display"]] = Field(default_factory=list, max_length=6)


class CampaignCreateRequest(CampaignPlanRequest):
    name: str = Field(min_length=1, max_length=200)


class CampaignWorkflowRequest(CampaignCreateRequest):
    product_name: str = Field(min_length=1, max_length=200)
    benefits: list[str] = Field(default_factory=list, max_length=20)
    verified_claims: list[str] = Field(default_factory=list, max_length=20)
    variations: int = Field(default=3, ge=1, le=8)
    website_url: HttpUrl | None = None
    generate_image: bool = False
    image_prompt: str = Field(default="", max_length=2000)
    generate_video: bool = False
    video_prompt: str = Field(default="", max_length=2000)
    duration_seconds: int = Field(default=6, ge=1, le=15)


class CampaignChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    campaign_id: str | None = Field(default=None, max_length=36)
    action: Literal["auto", "plan", "generate_copy", "validate", "report", "optimize"] = "auto"
    business_name: str | None = Field(default=None, max_length=200)
    product_name: str | None = Field(default=None, max_length=200)
    product_details: str = Field(default="", max_length=4000)
    goal: str | None = Field(default=None, max_length=200)
    audience: str = Field(default="", max_length=1000)
    location: str = Field(default="", max_length=500)
    language: str = Field(default="English", max_length=80)
    daily_budget: float | None = Field(default=None, gt=0, le=1_000_000)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    website_analysis: dict[str, Any] = Field(default_factory=dict)
    benefits: list[str] = Field(default_factory=list, max_length=20)
    verified_claims: list[str] = Field(default_factory=list, max_length=20)


class CampaignChatResponse(BaseModel):
    reply: str
    action: str
    status: Literal["completed", "needs_details", "unavailable"]
    provider: str
    simulated: bool
    campaign_id: str | None = None
    result: dict[str, Any] = Field(default_factory=dict)
    missing_fields: list[str] = Field(default_factory=list)


class CampaignUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = Field(default=None, min_length=1, max_length=200)
    goal: str | None = Field(default=None, max_length=200)
    budget: float | None = Field(default=None, gt=0, le=1_000_000)
    currency: str | None = Field(default=None, pattern="^[A-Z]{3}$")
    plan: dict[str, Any] | None = None
    copy_data: dict[str, Any] | None = Field(default=None, alias="copy")


class ApprovalRequest(BaseModel):
    actor: str = Field(min_length=1, max_length=200)
    notes: str = Field(default="", max_length=2000)


class RejectRequest(ApprovalRequest):
    reason: str = Field(min_length=1, max_length=2000)


class CopyRequest(BaseModel):
    product_name: str = Field(min_length=1, max_length=200)
    benefits: list[str] = Field(default_factory=list)
    verified_claims: list[str] = Field(default_factory=list)
    variations: int = Field(default=3, ge=1, le=8)


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    brand_name: str = Field(default="", max_length=200)
    aspect_ratio: Literal["1:1", "4:5", "1.91:1", "9:16", "16:9"] = "1:1"
    variations: int = Field(default=1, ge=1, le=4)
    campaign_id: str | None = Field(default=None, max_length=36)


class ImageToImageRequest(BaseModel):
    asset_id: str = Field(min_length=1, max_length=36)
    prompt: str = Field(min_length=1, max_length=2000)
    strength: float = Field(default=0.5, ge=0.25, le=1)


class AssetReviewRequest(BaseModel):
    expected_text: list[str] = Field(default_factory=list, max_length=30)
    prompt: str = Field(default="Describe visible product, brand and potential quality issues.", max_length=1000)


class VideoGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    duration_seconds: int = Field(default=6, ge=1, le=60)
    aspect_ratio: Literal["9:16", "16:9", "1:1"] = "9:16"
    image_asset_id: str | None = Field(default=None, max_length=36)
    campaign_id: str | None = Field(default=None, max_length=36)


class JobResponse(BaseModel):
    id: str
    kind: str
    status: str
    result: dict[str, Any]
    error: str


class CampaignAssetResponse(BaseModel):
    id: str
    kind: str
    provider: str
    uri: str
    metadata: dict[str, Any] = Field(default_factory=dict)

class CampaignResponse(BaseModel):
    id: str
    name: str
    status: str
    version: int
    goal: str
    budget: float
    currency: str
    plan: dict[str, Any]
    copy_data: dict[str, Any] = Field(alias="copy")
    validation: dict[str, Any]
    approved_version: int | None = None
    approved_at: datetime | None = None
    assets: list[CampaignAssetResponse] = Field(default_factory=list)


class CampaignPlanResponse(BaseModel):
    is_recommendation: bool
    objective: str
    recommended_campaign_type: str
    audience: str = ""
    geographic_targeting: str = ""
    language: str = "English"
    keyword_themes: list[str] = Field(default_factory=list)
    messaging: dict[str, Any] = Field(default_factory=dict)
    budget_recommendation: dict[str, Any]
    target_roas_recommendation: float | None = None
    channel_recommendations: list[str] = Field(default_factory=list)
    landing_page_recommendation: str
    required_creative_assets: list[str] = Field(default_factory=list)
    provider: str = "mock"


class ValidationIssueResponse(BaseModel):
    severity: str
    code: str
    message: str


class CampaignValidationResponse(BaseModel):
    status: str
    issues: list[ValidationIssueResponse] = Field(default_factory=list)
    deterministic_checks: bool = True
    model_judgments: list[dict[str, Any]] = Field(default_factory=list)
    revision_eligible: bool = False


class PublishResponse(BaseModel):
    status: Literal["dry_run", "blocked"]
    published: Literal[False]
    campaign_id: str
    message: str


class CampaignReportResponse(BaseModel):
    source: str
    simulated: bool
    period: str | None = None
    metrics: dict[str, float]


class CampaignOptimizationResponse(BaseModel):
    source: str
    simulated: bool
    metrics: dict[str, float]
    recommendations: list[dict[str, str]]
    applied: Literal[False]


class ModelStatusResponse(BaseModel):
    models: list[ModelStatusItem]
    providers: dict[str, str]


class ModelCapabilitiesResponse(BaseModel):
    models: list[ModelCapability]


class InferenceTestStatus(BaseModel):
    status: Literal["not_run", "passed", "stale"]
    tested_at: str | None = None
    revision: str
    test_name: str | None = None


class ModelStatusItem(BaseModel):
    key: str
    repository: str
    path: str
    available: bool
    missing_files: list[str]
    bytes_present: int
    runtime_ready: bool
    python_version: str
    python_requirement: str
    python_compatible: bool
    missing_dependencies: list[str]
    installed_versions: dict[str, str]
    capability_dependencies: dict[str, list[str]]
    inference_tested: bool
    inference_test: InferenceTestStatus
    readiness: Literal["weights_missing", "weights_downloaded", "runtime_ready", "inference_verified"]
    license: str
    license_url: str
    purpose: str
    dependencies: list[str]
    hardware_notes: str


class ModelCapability(BaseModel):
    key: str
    repository: str
    purpose: str
    license: str
    license_url: str
    dependencies: list[str]
    hardware_notes: str


class ImageAssetResult(BaseModel):
    provider: str
    uri: str
    simulated: bool
    mime_type: str = "image/png"
    width: int | None = None
    height: int | None = None
    asset_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ImageGenerationResponse(BaseModel):
    provider: str
    uri: str | None = None
    simulated: bool
    mime_type: str | None = None
    asset_id: str | None = None
    assets: list[ImageAssetResult] = Field(default_factory=list)


class VideoGenerationResponse(BaseModel):
    job_id: str
    status: str
    result: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    simulated: bool


class AssetAnalysisResponse(BaseModel):
    asset_id: str
    deterministic: dict[str, Any]
    vision: dict[str, Any]
    ocr: dict[str, Any]


class OAuthStartResponse(BaseModel):
    authorization_url: str
    state: str


class OAuthCallbackResponse(BaseModel):
    status: str
    connected: bool


class OAuthConnectionResponse(BaseModel):
    connected: bool
    account_label: str | None = None


class DisconnectResponse(BaseModel):
    disconnected: bool


class ImageToImageResponse(BaseModel):
    asset_id: str
    provider: str
    simulated: bool
    uri: str


class CampaignWorkflowResponse(BaseModel):
    job_id: str
    campaign: CampaignResponse
    workflow: dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    environment: str


class AdCopyGenerationResponse(BaseModel):
    copy_data: dict[str, Any] = Field(alias="copy")
    issues: list[dict[str, Any]] = Field(default_factory=list)
    revision_attempts: int
    simulated: bool
    provider: str


class CampaignHistoryResponse(BaseModel):
    type: Literal["audit", "approval"]
    id: str
    actor: str
    action: str | None = None
    decision: str | None = None
    campaign_version: int | None = None
    notes: str | None = None
    details: dict[str, Any] | None = None
    created_at: datetime
