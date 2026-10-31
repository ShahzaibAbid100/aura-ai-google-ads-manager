from scripts.export_openapi import build_and_validate


def test_openapi_contains_typed_frontend_contracts():
    schema = build_and_validate()
    paths = schema["paths"]
    expected = {
        "/api/v1/campaigns": "post",
        "/api/v1/campaigns/{campaign_id}/approve": "post",
        "/api/v1/media/images/generate": "post",
        "/api/v1/models/status": "get",
        "/api/v1/google-ads/report": "get",
    }
    for path, method in expected.items():
        operation = paths[path][method]
        success = operation["responses"].get("200") or operation["responses"].get("202")
        assert success["content"]["application/json"]["schema"]


def test_openapi_describes_binary_media_download():
    schema = build_and_validate()
    response = schema["paths"]["/api/v1/media/files/{filename}"]["get"]["responses"]["200"]
    assert "application/octet-stream" in response["content"]
    assert response["content"]["application/octet-stream"]["schema"]["format"] == "binary"
