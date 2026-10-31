from dataclasses import dataclass
from fnmatch import fnmatch
import importlib.util
from importlib.metadata import PackageNotFoundError, version
import json
from pathlib import Path
import sys
from typing import Any
from datetime import datetime, timezone

from app.core.config import get_settings


@dataclass(frozen=True)
class ModelSpec:
    key: str
    repository: str
    local_path: Path
    revision: str
    allow_patterns: tuple[str, ...]
    required_files: tuple[str, ...]
    license_name: str
    license_url: str
    purpose: str
    dependencies: tuple[str, ...]
    hardware_notes: str
    extra_downloads: tuple[tuple[str, str], ...] = ()


ROOT = Path(__file__).resolve().parents[2]
INFERENCE_STATUS_PATH = ROOT / "storage/model_inference_status.json"
MODEL_SPECS: dict[str, ModelSpec] = {
    "qwen": ModelSpec(
        "qwen", "Qwen/Qwen2.5-1.5B-Instruct", ROOT / "models/llm/qwen2.5-1.5b-instruct", "989aa7980e4cf806f80c7fef2b1adb7bc71aa306",
        ("config.json", "generation_config.json", "model.safetensors", "tokenizer.json", "tokenizer_config.json", "vocab.json", "merges.txt"),
        ("config.json", "model.safetensors", "tokenizer.json"), "Apache-2.0", "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct",
        "Local campaign planning and copy generation", ("torch", "transformers", "safetensors"),
        "CPU supported; 8 GiB RAM may be constrained during load and generation.",
    ),
    "sd_turbo": ModelSpec(
        "sd_turbo", "stabilityai/sd-turbo", ROOT / "models/image/sd-turbo", "b261bac6fd2cf515557d5d0707481eafa0485ec2",
        ("model_index.json", "scheduler/scheduler_config.json", "text_encoder/config.json", "text_encoder/model.safetensors", "tokenizer/*", "unet/config.json", "unet/diffusion_pytorch_model.fp16.safetensors", "vae/config.json", "vae/diffusion_pytorch_model.fp16.safetensors"),
        ("model_index.json", "unet/diffusion_pytorch_model.fp16.safetensors", "vae/diffusion_pytorch_model.fp16.safetensors"),
        "Stability AI Community License; review current terms", "https://stability.ai/license", "SD-Turbo text-to-image and image-to-image",
        ("torch", "diffusers", "transformers", "safetensors"),
        "512x512 recommended; 1-4 steps and guidance_scale=0. CPU is slow and memory intensive.",
    ),
    "ltx_video": ModelSpec(
        "ltx_video", "Lightricks/LTX-Video", ROOT / "models/video/ltx-video", "8984fa25007f376c1a299016d0957a37a2f797bb",
        ("ltxv-2b-0.9.8-distilled-fp8.safetensors", "ltxv-spatial-upscaler-0.9.8.safetensors"),
        ("ltxv-2b-0.9.8-distilled-fp8.safetensors", "ltxv-spatial-upscaler-0.9.8.safetensors", "ltxv-2b-0.9.8-distilled-fp8.yaml"),
        "LTX-Video model license (separate from repository code)", "https://huggingface.co/Lightricks/LTX-Video",
        "LTX-Video 2B FP8 distilled model and required multiscale upscaler",
        ("official LTX-Video inference extra", "compatible PyTorch/CUDA/FP8 support", "FFmpeg optional"),
        "No CUDA GPU detected; inference intentionally disabled on this machine.",
        (("ltxv-2b-0.9.8-distilled-fp8.yaml", "https://raw.githubusercontent.com/Lightricks/LTX-Video/4b2d053057623ddd4d0a1d3e9cd28890e9ef487f/configs/ltxv-2b-0.9.8-distilled-fp8.yaml"),),
    ),
    "pixart_encoder": ModelSpec(
        "pixart_encoder", "PixArt-alpha/PixArt-XL-2-1024-MS", ROOT / "models/video/pixart-text-encoder", "b89adadeccd9ead2adcb9fa2825d3fabec48d404",
        ("text_encoder/config.json", "text_encoder/model-00001-of-00002.safetensors", "text_encoder/model-00002-of-00002.safetensors", "text_encoder/model.safetensors.index.json", "tokenizer/*"),
        ("text_encoder/config.json", "text_encoder/model-00001-of-00002.safetensors", "text_encoder/model-00002-of-00002.safetensors", "tokenizer/tokenizer_config.json"),
        "OpenRAIL++ (review model license)", "https://huggingface.co/PixArt-alpha/PixArt-XL-2-1024-MS", "Required LTX-Video 0.9.8 text encoder and tokenizer",
        ("torch", "transformers", "safetensors"), "Large text encoder; selected files use about 18 GiB of disk.",
    ),
    "smolvlm": ModelSpec(
        "smolvlm", "HuggingFaceTB/SmolVLM2-500M-Video-Instruct", ROOT / "models/vision/smolvlm2-500m", "7b375e1b73b11138ff12fe22c8f2822d8fe03467",
        ("config.json", "generation_config.json", "model.safetensors", "preprocessor_config.json", "processor_config.json", "special_tokens_map.json", "tokenizer.json", "tokenizer_config.json", "chat_template.json"),
        ("config.json", "model.safetensors", "preprocessor_config.json", "tokenizer.json"), "Apache-2.0",
        "https://huggingface.co/HuggingFaceTB/SmolVLM2-500M-Video-Instruct", "Image/video creative description and visual review",
        ("torch", "transformers", "pillow", "decord for video input"), "Model card reports approximately 1.8 GiB GPU memory for video inference.",
    ),
    "ocr_det": ModelSpec(
        "ocr_det", "PaddlePaddle/PP-OCRv5_mobile_det", ROOT / "models/ocr/detection", "0d63e78e2b680928f6b1747d76a08db6e645efb7",
        ("config.json", "inference.json", "inference.pdiparams", "inference.yml"), ("inference.json", "inference.pdiparams"),
        "Apache-2.0", "https://huggingface.co/PaddlePaddle/PP-OCRv5_mobile_det", "PP-OCRv5 mobile text detection",
        ("paddlepaddle", "paddleocr"), "CPU inference supported by PaddleOCR CPU package.",
    ),
    "ocr_rec": ModelSpec(
        "ocr_rec", "PaddlePaddle/PP-OCRv5_mobile_rec", ROOT / "models/ocr/recognition", "682f20538d8c086cb2128e5cfac775e6c4904e85",
        ("config.json", "inference.json", "inference.pdiparams", "inference.yml"), ("inference.json", "inference.pdiparams"),
        "Apache-2.0", "https://huggingface.co/PaddlePaddle/PP-OCRv5_mobile_rec", "PP-OCRv5 mobile text recognition",
        ("paddlepaddle", "paddleocr"), "CPU inference supported by PaddleOCR CPU package.",
    ),
}


def configured_path(key: str) -> Path:
    settings = get_settings()
    configured = {
        "qwen": settings.local_llm_path,
        "sd_turbo": settings.image_model_path,
        "ltx_video": settings.video_model_path,
        "pixart_encoder": settings.pixart_encoder_model_path,
        "smolvlm": settings.vision_model_path,
        "ocr_det": settings.ocr_detection_model_path,
        "ocr_rec": settings.ocr_recognition_model_path,
    }.get(key)
    return Path(configured).expanduser().resolve() if configured else MODEL_SPECS[key].local_path


def check_model(key: str, path: Path | None = None) -> dict[str, Any]:
    spec = MODEL_SPECS[key]
    root = path or configured_path(key)
    missing = [required for required in spec.required_files if not (root / required).is_file()]
    present_bytes = sum((root / name).stat().st_size for name in spec.required_files if (root / name).is_file()) if root.is_dir() else 0
    package_requirements = {
        "qwen": ("torch", "transformers", "safetensors"),
        "sd_turbo": ("torch", "transformers", "diffusers", "safetensors"),
        "ltx_video": ("torch", "yaml", "ltx_video", "q8_kernels"),
        "pixart_encoder": ("torch", "transformers", "safetensors"),
        "smolvlm": ("torch", "transformers"),
        "ocr_det": ("paddle", "paddleocr"),
        "ocr_rec": ("paddle", "paddleocr"),
    }
    missing_dependencies = [package for package in package_requirements[key] if importlib.util.find_spec(package) is None]
    package_distributions = {"yaml": "PyYAML", "paddle": "paddlepaddle"}
    installed_versions: dict[str, str] = {}
    for package in package_requirements[key]:
        if package in missing_dependencies:
            continue
        try:
            installed_versions[package] = version(package_distributions.get(package, package))
        except PackageNotFoundError:
            installed_versions[package] = "importable-version-unknown"
    capability_dependencies = {
        "smolvlm": {"video_analysis": [name for name in ("decord",) if importlib.util.find_spec(name) is None]},
        "ltx_video": {"video_generation": [name for name in ("torch", "ltx_video", "q8_kernels") if importlib.util.find_spec(name) is None]},
        "sd_turbo": {"image_to_image": [name for name in ("torch", "diffusers") if importlib.util.find_spec(name) is None]},
        "qwen": {"text_generation": [name for name in ("torch", "transformers") if importlib.util.find_spec(name) is None]},
        "ocr_det": {"text_detection": [name for name in ("paddle", "paddleocr") if importlib.util.find_spec(name) is None]},
        "ocr_rec": {"text_recognition": [name for name in ("paddle", "paddleocr") if importlib.util.find_spec(name) is None]},
        "pixart_encoder": {"ltx_text_encoder": [name for name in ("torch", "transformers") if importlib.util.find_spec(name) is None]},
    }
    python_requirement = ">=3.11,<3.12" if key == "ltx_video" else ">=3.11,<3.14"
    python_compatible = (3, 10) <= sys.version_info[:2] < (3, 12) if key == "ltx_video" else (3, 11) <= sys.version_info[:2] < (3, 14)
    smoke_test = get_inference_evidence(key, root)
    return {
        "key": key, "repository": spec.repository, "path": str(root), "available": not missing,
        "missing_files": missing, "bytes_present": present_bytes, "runtime_ready": not missing and not missing_dependencies and python_compatible,
        "python_version": ".".join(map(str, sys.version_info[:3])), "python_requirement": python_requirement,
        "python_compatible": python_compatible,
        "missing_dependencies": missing_dependencies,
        "installed_versions": installed_versions,
        "capability_dependencies": capability_dependencies[key],
        "inference_tested": smoke_test["status"] == "passed",
        "inference_test": smoke_test,
        "readiness": "inference_verified" if smoke_test["status"] == "passed" else "runtime_ready" if not missing and not missing_dependencies and python_compatible else "weights_downloaded" if not missing else "weights_missing",
        "license": spec.license_name,
        "license_url": spec.license_url, "purpose": spec.purpose, "dependencies": list(spec.dependencies),
        "hardware_notes": spec.hardware_notes,
    }


def get_inference_evidence(key: str, path: Path | None = None) -> dict[str, Any]:
    spec = MODEL_SPECS[key]
    root = path or configured_path(key)
    try:
        records = json.loads(INFERENCE_STATUS_PATH.read_text(encoding="utf-8")) if INFERENCE_STATUS_PATH.is_file() else {}
    except (OSError, json.JSONDecodeError):
        records = {}
    record = records.get(key)
    if not isinstance(record, dict):
        return {"status": "not_run", "tested_at": None, "revision": spec.revision}
    current_files = {
        name: (root / name).stat().st_size
        for name in spec.required_files
        if (root / name).is_file()
    }
    valid = record.get("revision") == spec.revision and record.get("path") == str(root) and record.get("required_file_sizes") == current_files and record.get("status") == "passed"
    if not valid:
        return {"status": "stale", "tested_at": record.get("tested_at"), "revision": spec.revision}
    return {"status": "passed", "tested_at": record.get("tested_at"), "revision": record.get("revision"), "test_name": record.get("test_name")}


def record_inference_success(key: str, test_name: str, path: Path | None = None) -> dict[str, Any]:
    spec = MODEL_SPECS[key]
    root = path or configured_path(key)
    status = check_model(key, root)
    if not status["available"] or not status["runtime_ready"]:
        raise RuntimeError(f"Cannot record successful inference while model is not ready: {status}")
    file_sizes = {name: (root / name).stat().st_size for name in spec.required_files}
    try:
        records = json.loads(INFERENCE_STATUS_PATH.read_text(encoding="utf-8")) if INFERENCE_STATUS_PATH.is_file() else {}
    except (OSError, json.JSONDecodeError):
        records = {}
    records[key] = {
        "status": "passed", "tested_at": datetime.now(timezone.utc).isoformat(),
        "test_name": test_name, "revision": spec.revision, "path": str(root),
        "required_file_sizes": file_sizes,
    }
    INFERENCE_STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = INFERENCE_STATUS_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(records, indent=2), encoding="utf-8")
    temporary.replace(INFERENCE_STATUS_PATH)
    return get_inference_evidence(key, root)


def matches_allowlist(path: str, patterns: tuple[str, ...]) -> bool:
    return any(fnmatch(path, pattern) for pattern in patterns)