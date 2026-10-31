def create_validatable_campaign(client):
    response = client.post("/api/v1/campaigns", json={
        "name": "Test campaign",
        "business_name": "Test business",
        "goal": "leads",
        "daily_budget": 25,
        "currency": "USD",
        "product_details": "consulting",
    })
    assert response.status_code == 200
    campaign = response.json()
    copy = client.post(f"/api/v1/campaigns/{campaign['id']}/generate", json={
        "product_name": "Consulting",
        "benefits": ["Experienced team"],
        "verified_claims": [],
        "variations": 3,
    })
    assert copy.status_code == 200
    validation = client.post(f"/api/v1/campaigns/{campaign['id']}/validate")
    assert validation.status_code == 200
    return campaign["id"]


def test_health_and_openapi(client):
    assert client.get("/api/v1/health").json()["status"] == "ok"
    assert "/api/v1/campaigns/{campaign_id}/approve" in client.get("/openapi.json").json()["paths"]


def test_campaign_requires_validation_and_approval_then_dry_runs(client):
    response = client.post("/api/v1/campaigns", json={"name": "Test", "business_name": "Biz", "goal": "sales", "daily_budget": 10})
    campaign_id = response.json()["id"]
    assert client.post(f"/api/v1/campaigns/{campaign_id}/publish").status_code == 409

    campaign_id = create_validatable_campaign(client)
    approved = client.post(f"/api/v1/campaigns/{campaign_id}/approve", json={"actor": "reviewer"})
    assert approved.status_code == 200
    publish = client.post(f"/api/v1/campaigns/{campaign_id}/publish")
    assert publish.status_code == 200
    assert publish.json()["status"] == "dry_run"
    assert publish.json()["published"] is False


def test_edit_invalidates_approval(client):
    campaign_id = create_validatable_campaign(client)
    client.post(f"/api/v1/campaigns/{campaign_id}/approve", json={"actor": "reviewer"})
    client.patch(f"/api/v1/campaigns/{campaign_id}", json={"budget": 50})
    assert client.post(f"/api/v1/campaigns/{campaign_id}/publish").status_code == 409


def test_mock_report_and_optimization_are_labeled(client):
    campaign_id = create_validatable_campaign(client)
    report = client.get(f"/api/v1/campaigns/{campaign_id}/report").json()
    result = client.post(f"/api/v1/campaigns/{campaign_id}/optimize").json()
    assert report["source"] == "mock" and report["simulated"]
    assert result["applied"] is False


def test_invalid_website_url_rejected_before_fetch(client):
    response = client.post("/api/v1/websites/analyze", json={"url": "http://127.0.0.1/"})
    assert response.status_code == 422


def test_mock_media_is_labeled_and_video_job_is_persisted(client):
    image = client.post("/api/v1/media/images/generate", json={"prompt": "A product on a clean table"})
    assert image.status_code == 200
    assert image.json()["provider"] == "mock"
    assert image.json()["simulated"] is True

    video = client.post("/api/v1/media/videos/generate", json={"prompt": "A slow product pan"})
    assert video.status_code == 202
    assert video.json()["simulated"] is True
    job = client.get(f"/api/v1/jobs/{video.json()['job_id']}")
    assert job.status_code == 200
    assert job.json()["status"] == "completed"


def test_live_writes_stay_blocked_even_when_flag_is_enabled(client, monkeypatch):
    campaign_id = create_validatable_campaign(client)
    client.post(f"/api/v1/campaigns/{campaign_id}/approve", json={"actor": "reviewer"})
    from app.core.config import get_settings

    monkeypatch.setenv("GOOGLE_ADS_ENABLE_WRITES", "true")
    get_settings.cache_clear()
    result = client.post(f"/api/v1/campaigns/{campaign_id}/publish").json()
    assert result["status"] == "blocked"
    assert result["published"] is False


def test_model_inventory_endpoints_are_stable(client):
    status = client.get("/api/v1/models/status")
    capabilities = client.get("/api/v1/models/capabilities")
    assert status.status_code == 200
    assert any(model["key"] == "qwen" for model in status.json()["models"])
    assert any(model["key"] == "ltx_video" for model in capabilities.json()["models"])


def test_local_image_provider_does_not_fall_back_to_mock(client, monkeypatch, tmp_path):
    from app.core.config import get_settings

    monkeypatch.setenv("IMAGE_PROVIDER", "local")
    monkeypatch.setenv("IMAGE_MODEL_PATH", str(tmp_path / "missing-checkpoint"))
    get_settings.cache_clear()
    response = client.post("/api/v1/media/images/generate", json={"prompt": "a local-only request"})
    assert response.status_code == 503
    assert "Local SD-Turbo inference unavailable" in response.json()["detail"]


def test_campaign_workflow_stops_at_approval_and_persists_history(client):
    created = client.post("/api/v1/campaigns", json={"name": "Workflow campaign", "business_name": "Test business", "goal": "leads", "daily_budget": 20})
    campaign_id = created.json()["id"]
    result = client.post(f"/api/v1/campaigns/{campaign_id}/workflow", json={
        "name": "Workflow campaign", "business_name": "Test business", "goal": "leads", "daily_budget": 20,
        "product_name": "Consulting", "benefits": ["Experienced team"], "generate_image": False, "generate_video": False,
    })
    assert result.status_code == 200
    assert result.json()["campaign"]["status"] == "pending_approval"
    assert result.json()["workflow"]["final_status"] == "pending_approval"
    history = client.get(f"/api/v1/campaigns/{campaign_id}/history")
    assert any(item["action"] == "campaign.workflow_completed" for item in history.json())
    assert client.post(f"/api/v1/campaigns/{campaign_id}/approve", json={"actor": "reviewer"}).status_code == 200


def test_google_ads_report_explicitly_separates_mock_and_live(client):
    mocked = client.get("/api/v1/google-ads/report?source=mock")
    assert mocked.status_code == 200
    assert mocked.json()["source"] == "mock"
    live = client.get("/api/v1/google-ads/report?source=live")
    assert live.status_code == 503
    assert "DEVELOPER_TOKEN" in live.json()["detail"]
