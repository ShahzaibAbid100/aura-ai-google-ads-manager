from pathlib import Path

import pytest

from app.graph.campaign_workflow import campaign_workflow
from app.providers.llm import LocalQwenProvider
from app.providers.media import LocalLTXVideoProvider, LocalSDTurboProvider, MockImageProvider
from app.services.model_registry import MODEL_SPECS, check_model, matches_allowlist, record_inference_success


def test_model_manifest_uses_pinned_revisions_and_required_license_metadata():
    assert all(len(spec.revision) == 40 for spec in MODEL_SPECS.values())
    assert MODEL_SPECS["pixart_encoder"].license_name.startswith("OpenRAIL")
    assert "ltxv-spatial-upscaler-0.9.8.safetensors" in MODEL_SPECS["ltx_video"].required_files
    assert "tokenizer/*" in MODEL_SPECS["sd_turbo"].allow_patterns


def test_model_registry_reports_missing_local_components(tmp_path):
    status = check_model("qwen", tmp_path)
    assert status["available"] is False
    assert status["runtime_ready"] is False
    assert status["missing_dependencies"]
    assert "model.safetensors" in status["missing_files"]


def test_model_inference_readiness_requires_revision_bound_success_record(tmp_path, monkeypatch):
    import app.services.model_registry as registry

    spec = MODEL_SPECS["qwen"]
    for required in spec.required_files:
        target = tmp_path / required
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"checked-test-fixture")
    monkeypatch.setattr(registry, "INFERENCE_STATUS_PATH", tmp_path / "inference-status.json")
    monkeypatch.setattr(registry.importlib.util, "find_spec", lambda name: object())

    initial = check_model("qwen", tmp_path)
    assert initial["available"] is True
    assert initial["runtime_ready"] is True
    assert initial["inference_tested"] is False
    assert initial["readiness"] == "runtime_ready"

    evidence = record_inference_success("qwen", "unit-fixture-inference", tmp_path)
    assert evidence["status"] == "passed"
    verified = check_model("qwen", tmp_path)
    assert verified["inference_tested"] is True
    assert verified["readiness"] == "inference_verified"

    (tmp_path / "model.safetensors").write_bytes(b"changed-weight-file")
    stale = check_model("qwen", tmp_path)
    assert stale["inference_tested"] is False
    assert stale["inference_test"]["status"] == "stale"


def test_allowlist_matches_selected_files_only():
    patterns = MODEL_SPECS["sd_turbo"].allow_patterns
    assert matches_allowlist("unet/diffusion_pytorch_model.fp16.safetensors", patterns)
    assert not matches_allowlist("unet/diffusion_pytorch_model.safetensors", patterns)
    assert not matches_allowlist("README.md", patterns)


def test_qwen_explicit_local_provider_fails_without_weights(tmp_path):
    with pytest.raises(RuntimeError, match="Local Qwen model is unavailable"):
        LocalQwenProvider(tmp_path).generate("write a headline")


def test_sd_turbo_does_not_fall_back_to_mock_when_local_selected(monkeypatch, tmp_path):
    monkeypatch.setenv("IMAGE_MODEL_PATH", str(tmp_path))
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="SD-Turbo is unavailable"):
            LocalSDTurboProvider().generate("product image", "1:1")
    finally:
        get_settings.cache_clear()


def test_ltx_local_provider_is_disabled_before_model_runtime_import(monkeypatch):
    monkeypatch.setenv("LTX_VIDEO_INFERENCE_ENABLED", "false")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="LTX inference is disabled"):
            LocalLTXVideoProvider().generate("product motion", 4, "9:16")
    finally:
        get_settings.cache_clear()


def test_mock_image_provider_is_explicit_and_saved(monkeypatch, tmp_path):
    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        result = MockImageProvider().generate("test visual", "1:1")
        assert result["provider"] == "mock"
        assert result["simulated"] == "true"
        assert (tmp_path / "generated" / Path(result["uri"]).name).is_file()
    finally:
        get_settings.cache_clear()


def test_campaign_workflow_finishes_at_human_approval_gate(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    from app.core.config import get_settings

    get_settings.cache_clear()
    try:
        result = campaign_workflow.invoke({"request": {
            "business_name": "Test business", "goal": "leads", "daily_budget": 20,
            "product_name": "Consulting", "benefits": ["Experienced team"],
            "verified_claims": [], "generate_image": False, "generate_video": False,
        }})
        assert result["final_status"] == "pending_approval"
        assert result["execution_status"] == "completed"
        assert result["copy"]["provider"] == "mock"
    finally:
        get_settings.cache_clear()
