from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import OAuthConnection
from app.services.security import decrypt_tokens, encrypt_tokens, refresh_google_access_token


def normalize_metrics(metrics: dict[str, float]) -> dict[str, float]:
    impressions = metrics.get("impressions", 0)
    clicks = metrics.get("clicks", 0)
    spend = metrics.get("spend", 0)
    conversions = metrics.get("conversions", 0)
    value = metrics.get("conversion_value", 0)
    return {
        **metrics,
        "ctr": clicks / impressions if impressions else 0.0,
        "average_cpc": spend / clicks if clicks else 0.0,
        "cost_per_conversion": spend / conversions if conversions else 0.0,
        "roas": value / spend if spend else 0.0,
    }


def optimize(metrics: dict[str, Any]) -> list[dict[str, str]]:
    normalized = normalize_metrics(metrics)
    suggestions = []
    if normalized["ctr"] < 0.02:
        suggestions.append({"area": "ad_copy", "recommendation": "Test clearer, more specific headlines", "automatic_change": "false"})
    if normalized["cost_per_conversion"] and normalized["cost_per_conversion"] > 0:
        suggestions.append({"area": "landing_page", "recommendation": "Review message match and conversion flow", "automatic_change": "false"})
    if not suggestions:
        suggestions.append({"area": "measurement", "recommendation": "Gather more performance data before changing settings", "automatic_change": "false"})
    return suggestions


def get_mock_report() -> dict[str, Any]:
    metrics = normalize_metrics({"impressions": 1250, "clicks": 42, "spend": 31.5, "conversions": 3, "conversion_value": 90})
    return {"source": "mock", "simulated": True, "metrics": metrics}


def get_live_google_ads_report(db: Session, customer_id: str | None = None) -> dict[str, Any]:
    settings = get_settings()
    if not settings.google_ads_developer_token:
        raise RuntimeError("GOOGLE_ADS_DEVELOPER_TOKEN is required for live Google Ads reporting")
    customer = (customer_id or settings.google_ads_customer_id).replace("-", "")
    if not customer.isdigit():
        raise RuntimeError("A valid GOOGLE_ADS_CUSTOMER_ID is required for live reporting")
    connection = db.scalar(select(OAuthConnection).where(OAuthConnection.provider == "google_ads").limit(1))
    if connection is None:
        raise RuntimeError("Connect a Google Ads account with OAuth before requesting live reports")
    try:
        from google.ads.googleads.client import GoogleAdsClient
    except ImportError as exc:
        raise RuntimeError("Install the optional 'google-ads' dependency for live reporting") from exc

    tokens = decrypt_tokens(connection.encrypted_tokens)
    try:
        access_token, refreshed = refresh_google_access_token(connection.encrypted_tokens)
        tokens = decrypt_tokens(refreshed)
        connection.encrypted_tokens = refreshed
        db.commit()
    except Exception as exc:
        raise RuntimeError("Google Ads OAuth token refresh failed") from exc
    config = {
        "developer_token": settings.google_ads_developer_token,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "refresh_token": tokens["refresh_token"],
        "use_proto_plus": True,
    }
    if settings.google_ads_customer_id:
        config["login_customer_id"] = settings.google_ads_customer_id.replace("-", "")
    client = GoogleAdsClient.load_from_dict(config)
    query = """
        SELECT metrics.impressions, metrics.clicks, metrics.cost_micros,
               metrics.conversions, metrics.conversions_value
        FROM customer
        WHERE segments.date DURING LAST_30_DAYS
    """
    try:
        service = client.get_service("GoogleAdsService")
        rows = service.search(customer_id=customer, query=query)
        totals = {"impressions": 0.0, "clicks": 0.0, "spend": 0.0, "conversions": 0.0, "conversion_value": 0.0}
        for row in rows:
            metrics = row.metrics
            totals["impressions"] += metrics.impressions
            totals["clicks"] += metrics.clicks
            totals["spend"] += metrics.cost_micros / 1_000_000
            totals["conversions"] += metrics.conversions
            totals["conversion_value"] += metrics.conversions_value
    except Exception as exc:
        raise RuntimeError("Google Ads read-only report query failed") from exc
    return {"source": "google_ads_live", "simulated": False, "period": "LAST_30_DAYS", "metrics": normalize_metrics(totals)}
