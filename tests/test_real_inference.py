import os
import importlib.util
from pathlib import Path

import pytest

from app.core.config import get_settings
from app.services.model_registry import check_model, record_inference_success

pytestmark = pytest.mark.real_inference


@pytest.fixture(autouse=True)
def require_explicit_real_inference_opt_in():
    if os.getenv("RUN_REAL_MODEL_TESTS") != "1":
        pytest.skip("Set RUN_REAL_MODEL_TESTS=1 explicitly to run local-weight inference smoke tests")


def test_qwen_real_cpu_inference():
    status = check_model("qwen")
    if not status["available"]:
        pytest.skip(f"Qwen weights unavailable: {status['missing_files']}")
    from app.providers.llm import LocalQwenProvider

    if not importlib.util.find_spec("torch") or not importlib.util.find_spec("transformers"):
        pytest.skip("Install the optional AI runtime before real Qwen inference")
    if LocalQwenProvider._available_memory_bytes() < (Path(status["path"]) / "model.safetensors").stat().st_size * 2.2:
        pytest.skip("Insufficient available RAM for the Qwen CPU inference smoke test")
    response = LocalQwenProvider().generate("Reply with the word ready.")
    assert response.strip()
    record_inference_success("qwen", "test_qwen_real_cpu_inference", Path(status["path"]))


def test_sd_turbo_real_image_inference():
    status = check_model("sd_turbo")
    if not status["available"]:
        pytest.skip(f"SD-Turbo weights unavailable: {status['missing_files']}")
    from app.providers.media import LocalSDTurboProvider

    if any(not importlib.util.find_spec(name) for name in ("torch", "transformers", "diffusers")):
        pytest.skip("Install the optional image inference runtime before SD-Turbo smoke test")
    import torch

    if not torch.cuda.is_available() or torch.cuda.get_device_properties(0).total_memory < 8 * 1024**3:
        pytest.skip("SD-Turbo real inference smoke test requires a CUDA GPU with at least 8 GiB VRAM")

    result = LocalSDTurboProvider().generate("A simple blue ceramic cup on white background", "1:1")
    output = Path(get_settings().storage_dir) / "generated" / Path(result["assets"][0]["uri"]).name
    assert output.is_file() and result["simulated"] is False
    record_inference_success("sd_turbo", "test_sd_turbo_real_image_inference")


def test_smolvlm_real_image_analysis():
    status = check_model("smolvlm")
    if not status["available"]:
        pytest.skip(f"SmolVLM weights unavailable: {status['missing_files']}")
    from app.providers.media import MockImageProvider, SmolVLMProvider

    if any(not importlib.util.find_spec(name) for name in ("torch", "transformers")):
        pytest.skip("Install the optional AI runtime before SmolVLM inference")
    import torch

    if not torch.cuda.is_available() or torch.cuda.get_device_properties(0).total_memory < 3 * 1024**3:
        pytest.skip("SmolVLM real inference smoke test requires a CUDA GPU with at least 3 GiB VRAM")

    asset = MockImageProvider().generate("simple test", "1:1")
    image_path = Path(get_settings().storage_dir) / "generated" / Path(asset["uri"]).name
    result = SmolVLMProvider().analyze_image(str(image_path))
    assert result["provider"] == "local-real"
    assert result["judgment_type"] == "model_assessment_not_confirmed_fact"
    record_inference_success("smolvlm", "test_smolvlm_real_image_analysis")


def test_paddle_ocr_real_image_analysis():
    if not check_model("ocr_det")["available"] or not check_model("ocr_rec")["available"]:
        pytest.skip("Both PP-OCRv5 model folders are required")
    from app.providers.media import MockImageProvider, PaddleOCRProvider

    if any(not importlib.util.find_spec(name) for name in ("paddle", "paddleocr")):
        pytest.skip("Install optional PaddleOCR CPU dependencies")

    asset = MockImageProvider().generate("simple test", "1:1")
    image_path = Path(get_settings().storage_dir) / "generated" / Path(asset["uri"]).name
    result = PaddleOCRProvider().analyze_image(str(image_path))
    assert result["provider"] == "local-real"
    assert isinstance(result["text_regions"], list)
    record_inference_success("ocr_det", "test_paddle_ocr_real_image_analysis", Path(check_model("ocr_det")["path"]))
    record_inference_success("ocr_rec", "test_paddle_ocr_real_image_analysis", Path(check_model("ocr_rec")["path"]))


def test_ltx_real_video_inference_requires_explicit_gpu_enablement():
    if not check_model("ltx_video")["available"]:
        pytest.skip("LTX model components are not complete")
    from app.providers.media import LocalLTXVideoProvider

    try:
        import torch
    except ImportError:
        pytest.skip("Install the isolated video inference environment")
    if not torch.cuda.is_available():
        pytest.skip("No CUDA device available for LTX inference")

    result = LocalLTXVideoProvider().generate("A product rotating slowly on a studio table", 2, "9:16")
    assert result["provider"] == "local-real"
    assert Path(get_settings().storage_dir, "generated", Path(result["uri"]).name).is_file()
    record_inference_success("ltx_video", "test_ltx_real_video_inference_requires_explicit_gpu_enablement")