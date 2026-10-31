import re
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from app.core.config import get_settings
from app.providers.llm import get_llm_provider


class PlanOutput(BaseModel):
    objective: str
    recommended_campaign_type: str
    audience: str = ""
    geographic_targeting: str = ""
    language: str = "English"
    keyword_themes: list[str] = Field(default_factory=list)
    messaging: dict[str, Any] = Field(default_factory=dict)
    required_creative_assets: list[str] = Field(default_factory=list)


class CopyOutput(BaseModel):
    headlines: list[str]
    long_headlines: list[str] = Field(default_factory=list)
    descriptions: list[str]
    calls_to_action: list[str] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)


class OptimizationOutput(BaseModel):
    recommendations: list[dict[str, str]]


def plan_campaign(data: dict[str, Any]) -> dict[str, Any]:
    analysis = data.get("website_analysis", {})
    landing = analysis.get("url") or ""
    if get_settings().ai_provider == "local":
        facts = {"business_name": data.get("business_name"), "product_details": data.get("product_details"), "website_analysis": analysis, "goal": data["goal"], "audience": data.get("audience"), "location": data.get("location"), "language": data.get("language", "English"), "budget": data["daily_budget"], "currency": data.get("currency", "USD"), "target_roas": data.get("target_roas"), "channels": data.get("channels", [])}
        prompt = "Return only a JSON object with objective, recommended_campaign_type, audience, geographic_targeting, language, keyword_themes, messaging, required_creative_assets. Use only facts provided; do not make platform settings claims. Input: " + str(facts)
        try:
            generated = PlanOutput.model_validate(get_llm_provider().generate_json(prompt)).model_dump()
        except (ValueError, ValidationError) as exc:
            raise RuntimeError(f"Local LLM returned an invalid campaign plan: {exc}") from exc
        return {**generated, "is_recommendation": True, "budget_recommendation": {"daily_budget": data["daily_budget"], "currency": data.get("currency", "USD")}, "target_roas_recommendation": data.get("target_roas"), "channel_recommendations": data.get("channels", []), "landing_page_recommendation": landing, "provider": "local-real"}
    return {
        "provider": "mock",
        "is_recommendation": True,
        "objective": data["goal"],
        "recommended_campaign_type": "Search",
        "audience": data.get("audience", ""),
        "geographic_targeting": data.get("location", ""),
        "language": data.get("language", "English"),
        "keyword_themes": [data.get("business_name", "brand"), *[x for x in data.get("product_details", "").split(",") if x.strip()][:5]],
        "messaging": {"positioning": "Emphasize only supplied product facts", "claims_policy": "No unverified claims"},
        "budget_recommendation": {"daily_budget": data["daily_budget"], "currency": data.get("currency", "USD")},
        "target_roas_recommendation": data.get("target_roas"),
        "channel_recommendations": data.get("channels", []),
        "landing_page_recommendation": landing,
        "required_creative_assets": ["headlines", "descriptions", "brand-approved image"],
    }


def generate_ad_copy(product_name: str, benefits: list[str], verified_claims: list[str], variations: int) -> dict[str, Any]:
    supported = [item.strip() for item in [*benefits, *verified_claims] if item.strip()]
    if get_settings().ai_provider == "local":
        prompt = f"Generate ad copy as only JSON with keys headlines (array of strings), long_headlines, descriptions, calls_to_action, benefits. Need {variations} varied headlines, each <=30 characters; long headlines and descriptions <=90 characters. Product: {product_name}. Verified facts only: {supported}. Never invent claims, prices, guarantees, or discounts."
        try:
            output = CopyOutput.model_validate(get_llm_provider().generate_json(prompt))
        except (ValueError, ValidationError) as exc:
            raise RuntimeError(f"Local LLM returned invalid ad copy: {exc}") from exc
        return {
            "provider": "local-real", "simulated": False,
            "headlines": [{"text": text, "max_length": 30} for text in output.headlines[:variations]],
            "long_headlines": [{"text": text, "max_length": 90} for text in output.long_headlines],
            "descriptions": [{"text": text, "max_length": 90} for text in output.descriptions],
            "calls_to_action": output.calls_to_action, "benefits": output.benefits,
        }
    safe_benefit = supported[0] if supported else f"Explore {product_name}"
    headlines = []
    for suffix in ["Discover More", "Explore Today", "Learn More", "See Details", "Find Your Fit", "Get Started", "Shop Now", "Explore Options"][:variations]:
        headline = f"{product_name} - {suffix}"
        headlines.append({"text": headline[:30], "max_length": 30})
    return {
        "provider": "mock", "simulated": True,
        "headlines": headlines,
        "long_headlines": [{"text": f"{product_name}: {safe_benefit}"[:90], "max_length": 90}],
        "descriptions": [{"text": f"{safe_benefit}. Learn more about {product_name}."[:90], "max_length": 90}],
        "calls_to_action": ["Learn more", "Shop now"],
        "benefits": supported,
    }


def validate_copy(copy: dict[str, Any]) -> list[dict[str, str]]:
    issues: list[dict[str, str]] = []
    for item in copy.get("headlines", []):
        text = item.get("text", "")
        if len(text) > 30:
            issues.append({"severity": "error", "code": "headline_too_long", "message": "Headline exceeds 30 characters"})
    for item in [*copy.get("long_headlines", []), *copy.get("descriptions", [])]:
        if len(item.get("text", "")) > item.get("max_length", 90):
            issues.append({"severity": "error", "code": "text_too_long", "message": "Copy exceeds its configured character limit"})
    texts = [re.sub(r"\W", "", item.get("text", "")).lower() for item in copy.get("headlines", [])]
    if len(texts) != len(set(texts)):
        issues.append({"severity": "warning", "code": "duplicate_headline", "message": "Duplicate headlines were found"})
    all_text = " ".join(item.get("text", "") for item in copy.get("headlines", []) + copy.get("descriptions", []))
    if re.search(r"\b(guaranteed|100%|number one|#1)\b", all_text, re.I):
        issues.append({"severity": "warning", "code": "potential_unverified_claim", "message": "Review absolute or superiority claims against evidence"})
    return issues


def quality_check(campaign: Any) -> dict[str, Any]:
    issues = validate_copy(campaign.copy or {})
    if not campaign.plan:
        issues.append({"severity": "error", "code": "missing_plan", "message": "Campaign plan is missing"})
    if campaign.budget <= 0:
        issues.append({"severity": "error", "code": "invalid_budget", "message": "A positive campaign budget is required"})
    if not campaign.plan.get("landing_page_recommendation"):
        issues.append({"severity": "warning", "code": "missing_landing_page", "message": "No landing page recommendation is present"})
    errors = any(issue["severity"] == "error" for issue in issues)
    return {"status": "failed" if errors else "passed_with_warnings" if issues else "passed", "issues": issues, "deterministic_checks": True, "model_judgments": [], "revision_eligible": errors}
