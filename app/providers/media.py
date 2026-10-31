from abc import ABC, abstractmethod
from functools import lru_cache
from pathlib import Path
import json
from typing import Any
from uuid import uuid4

from PIL import Image, ImageDraw, ImageOps

from app.core.config import get_settings
from app.services.model_registry import check_model


class ImageProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, aspect_ratio: str) -> dict[str, str]:
        raise NotImplementedError


class MockImageProvider(ImageProvider):
    def generate(self, prompt: str, aspect_ratio: str) -> dict[str, str]:
        sizes = {"1:1": (512, 512), "4:5": (512, 640), "1.91:1": (640, 335), "9:16": (360, 640), "16:9": (640, 360)}
        width, height = sizes[aspect_ratio]
        directory = get_settings().storage_dir / "generated"
        directory.mkdir(parents=True, exist_ok=True)
        filename = f"mock-{uuid4().hex}.png"
        image = Image.new("RGB", (width, height), "#eef1e8")
        draw = ImageDraw.Draw(image)
        draw.rectangle((18, 18, width - 18, height - 18), outline="#334b3f", width=3)
        draw.text((32, height // 2 - 12), "SIMULATED MOCK ASSET", fill="#243b32")
        draw.text((32, height // 2 + 12), prompt[:60], fill="#52685d")
        image.save(directory / filename)
        return {"provider": "mock", "uri": f"/media/files/{filename}", "simulated": "true", "mime_type": "image/png"}


class LocalSDTurboProvider(ImageProvider):
    def __init__(self) -> None:
        self._text_pipeline = None
        self._image_pipeline = None

    def _load(self, image_to_image: bool = False) -> Any:
        from app.services.model_registry import configured_path

        path = configured_path("sd_turbo")
        status = check_model("sd_turbo", path)
        if not status["available"]:
            raise RuntimeError(f"SD-Turbo is unavailable; missing files: {status['missing_files']}")
        try:
            import torch
            from diffusers import AutoPipelineForImage2Image, AutoPipelineForText2Image
        except ImportError as exc:
            raise RuntimeError("Install the image optional dependencies to run SD-Turbo") from exc
        attribute = "_image_pipeline" if image_to_image else "_text_pipeline"
        pipeline = getattr(self, attribute)
        if pipeline is None:
            loader = AutoPipelineForImage2Image if image_to_image else AutoPipelineForText2Image
            dtype = torch.float16 if torch.cuda.is_available() else torch.float32
            options = {"local_files_only": True, "torch_dtype": dtype, "variant": "fp16"}
            pipeline = loader.from_pretrained(str(path), **options)
            if torch.cuda.is_available():
                pipeline.to("cuda")
            else:
                pipeline.enable_attention_slicing()
            setattr(self, attribute, pipeline)
        return pipeline

    @staticmethod
    def _dimensions(aspect_ratio: str) -> tuple[int, int]:
        sizes = {"1:1": (512, 512), "4:5": (512, 640), "1.91:1": (768, 402), "9:16": (360, 640), "16:9": (640, 360)}
        if aspect_ratio not in sizes:
            raise ValueError(f"Unsupported image aspect ratio: {aspect_ratio}")
        return sizes[aspect_ratio]

    def generate(self, prompt: str, aspect_ratio: str, brand_name: str = "", variations: int = 1) -> dict[str, Any]:
        from app.core.config import get_settings

        width, height = self._dimensions(aspect_ratio)
        pipeline = self._load()
        settings = get_settings()
        enhanced_prompt = f"Brand identity: {brand_name}. {prompt}" if brand_name else prompt
        results = []
        for index in range(max(1, min(variations, 4))):
            image = pipeline(prompt=enhanced_prompt, width=512, height=512, num_inference_steps=max(1, min(settings.image_inference_steps, 4)), guidance_scale=0.0).images[0]
            image = ImageOps.fit(image, (width, height), method=Image.Resampling.LANCZOS)
            directory = settings.storage_dir / "generated"
            directory.mkdir(parents=True, exist_ok=True)
            name = f"sd-turbo-{uuid4().hex}.png"
            image.save(directory / name, format="PNG")
            results.append({"provider": "local-real", "uri": f"/media/files/{name}", "simulated": False, "mime_type": "image/png", "width": width, "height": height, "metadata": {"prompt": enhanced_prompt, "aspect_ratio": aspect_ratio, "steps": settings.image_inference_steps, "checkpoint_resolution": "512x512", "format_strategy": "resize then center-crop with Pillow; model inference remains 512x512"}})
        return {"provider": "local-real", "simulated": False, "assets": results}

    def generate_from_image(self, image: Image.Image, prompt: str, strength: float = 0.5) -> Image.Image:
        if not 0.25 <= strength <= 1:
            raise ValueError("SD-Turbo image-to-image strength must be between 0.25 and 1")
        pipeline = self._load(image_to_image=True)
        init_image = image.convert("RGB").resize((512, 512))
        steps = max(1, round(2 / strength))
        return pipeline(prompt=prompt, image=init_image, num_inference_steps=steps, strength=strength, guidance_scale=0.0).images[0]


class VideoProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, duration_seconds: int, aspect_ratio: str) -> dict[str, str]:
        raise NotImplementedError


class MockVideoProvider(VideoProvider):
    def generate(self, prompt: str, duration_seconds: int, aspect_ratio: str) -> dict[str, str]:
        directory = get_settings().storage_dir / "generated"
        directory.mkdir(parents=True, exist_ok=True)
        filename = f"mock-{uuid4().hex}.mp4"
        # A metadata-only placeholder deliberately avoids misrepresenting an MP4 as generated video.
        metadata = directory / f"{filename}.json"
        metadata.write_text(json.dumps({"simulated": True, "prompt": prompt, "duration_seconds": duration_seconds, "aspect_ratio": aspect_ratio}), encoding="utf-8")
        return {"provider": "mock", "uri": f"/media/files/{metadata.name}", "simulated": "true", "status": "metadata_only"}


class LocalLTXVideoProvider(VideoProvider):
    def generate(self, prompt: str, duration_seconds: int, aspect_ratio: str) -> dict[str, str]:
        return self._generate(prompt, duration_seconds, aspect_ratio, None)

    def generate_from_image(self, image_path: str, prompt: str, duration_seconds: int, aspect_ratio: str) -> dict[str, str]:
        from pathlib import Path

        image = Path(image_path).resolve()
        storage = get_settings().storage_dir.resolve()
        if storage not in image.parents or not image.is_file():
            raise ValueError("LTX conditioning image must be an existing image inside configured storage")
        return self._generate(prompt, duration_seconds, aspect_ratio, str(image))

    def _generate(self, prompt: str, duration_seconds: int, aspect_ratio: str, conditioning_image: str | None) -> dict[str, str]:
        import json
        import shutil
        import tempfile
        from pathlib import Path


        settings = get_settings()
        if not settings.ltx_video_inference_enabled:
            raise RuntimeError("LTX inference is disabled until explicitly enabled on a validated CUDA worker")
        try:
            import torch
        except ImportError as exc:
            raise RuntimeError("Install the pinned video inference environment with CUDA-compatible PyTorch") from exc
        if not torch.cuda.is_available():
            raise RuntimeError("LTX-Video requires a compatible CUDA GPU; none is available")
        try:
            import yaml
        except ImportError as exc:
            raise RuntimeError("Install PyYAML in the isolated LTX inference environment") from exc
        from app.services.model_registry import MODEL_SPECS, check_model, configured_path

        model_path = configured_path("ltx_video")
        status = check_model("ltx_video", model_path)
        if not status["available"]:
            raise RuntimeError(f"LTX checkpoint unavailable: {status['missing_files']}")
        encoder_path = configured_path("pixart_encoder")
        encoder_status = check_model("pixart_encoder", encoder_path)
        if not encoder_status["available"]:
            raise RuntimeError(f"Required PixArt text encoder is unavailable: {encoder_status['missing_files']}")
        if not shutil.which("ffmpeg"):
            raise RuntimeError("FFmpeg is required to validate and finalize generated MP4 output")
        properties = torch.cuda.get_device_properties(0)
        if properties.total_memory < 12 * 1024**3:
            raise RuntimeError("This LTX 0.9.8 FP8 pipeline is gated to CUDA GPUs with at least 12 GiB VRAM; current device is below the conservative minimum")
        try:
            from ltx_video.inference import InferenceConfig, infer
            import q8_kernels.integration.patch_transformer
        except ImportError as exc:
            raise RuntimeError("Install the pinned official LTX-Video inference worker and Q8 kernels in the isolated video environment") from exc

        official_config = model_path / "ltxv-2b-0.9.8-distilled-fp8.yaml"
        config = yaml.safe_load(official_config.read_text(encoding="utf-8"))
        config["checkpoint_path"] = str(model_path / "ltxv-2b-0.9.8-distilled-fp8.safetensors")
        config["spatial_upscaler_model_path"] = str(model_path / "ltxv-spatial-upscaler-0.9.8.safetensors")
        config["text_encoder_model_name_or_path"] = str(encoder_path)
        config["prompt_enhancement_words_threshold"] = 0
        ratio = {"9:16": (576, 1024), "16:9": (1024, 576), "1:1": (768, 768)}
        width, height = ratio[aspect_ratio]
        frames = max(9, round(duration_seconds * 24 / 8) * 8 + 1)
        output_dir = settings.storage_dir / "generated"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_folder = output_dir / f"ltx-{uuid4().hex}"
        output_folder.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", suffix=".yaml", encoding="utf-8", dir=output_dir, delete=False) as config_file:
            yaml.safe_dump(config, config_file)
            config_path = Path(config_file.name)
        try:
            inference_config = InferenceConfig(pipeline_config=str(config_path), prompt=prompt, height=height, width=width, num_frames=frames, output_path=str(output_folder), conditioning_media_paths=[conditioning_image] if conditioning_image else None, conditioning_start_frames=[0] if conditioning_image else None)
            infer(inference_config)
        finally:
            config_path.unlink(missing_ok=True)
        outputs = list(output_folder.glob("*.mp4"))
        if len(outputs) != 1:
            raise RuntimeError(f"LTX inference produced {len(outputs)} MP4 files; expected one")
        output = output_dir / outputs[0].name
        shutil.move(str(outputs[0]), output)
        if not output.is_file() or output.stat().st_size == 0:
            raise RuntimeError("Official LTX inference returned without a valid output file")
        probe = shutil.which("ffprobe")
        metadata: dict[str, Any] = {"duration_seconds_requested": duration_seconds, "width": width, "height": height, "frames": frames, "checkpoint": str(model_path / "ltxv-2b-0.9.8-distilled-fp8.safetensors")}
        if probe:
            import subprocess

            completed = subprocess.run([probe, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(output)], check=True, capture_output=True, text=True, timeout=30)
            metadata["duration_seconds"] = float(json.loads(completed.stdout)["format"]["duration"])
        return {"provider": "local-real", "uri": f"/media/files/{output.name}", "simulated": "false", "status": "completed", "metadata": json.dumps(metadata)}


class SmolVLMProvider:
    def __init__(self) -> None:
        self._model = None
        self._processor = None

    def _ensure_loaded(self) -> Any:
        from app.services.model_registry import check_model, configured_path

        path = configured_path("smolvlm")
        status = check_model("smolvlm", path)
        if not status["available"]:
            raise RuntimeError(f"SmolVLM is unavailable; missing files: {status['missing_files']}")
        try:
            import torch
            from transformers import AutoModelForImageTextToText, AutoProcessor
        except ImportError as exc:
            raise RuntimeError("Install the AI optional dependencies to run SmolVLM") from exc
        if self._model is None:
            dtype = torch.float16 if torch.cuda.is_available() else torch.float32
            self._processor = AutoProcessor.from_pretrained(str(path), local_files_only=True, trust_remote_code=False)
            self._model = AutoModelForImageTextToText.from_pretrained(str(path), local_files_only=True, trust_remote_code=False, torch_dtype=dtype, low_cpu_mem_usage=True)
            if torch.cuda.is_available():
                self._model.to("cuda")
            self._model.eval()
        return torch

    def analyze_image(self, image_path: str, prompt: str = "Describe this advertisement and note visible product or branding details.") -> dict[str, Any]:
        from pathlib import Path

        from PIL import Image
        target = Path(image_path).resolve()
        storage = get_settings().storage_dir.resolve()
        if storage not in target.parents or not target.is_file():
            raise ValueError("Vision input must be an existing image inside configured storage")
        torch = self._ensure_loaded()
        image = Image.open(target).convert("RGB")
        messages = [{"role": "user", "content": [{"type": "image", "image": image}, {"type": "text", "text": prompt}]}]
        inputs = self._processor.apply_chat_template(messages, add_generation_prompt=True, tokenize=True, return_dict=True, return_tensors="pt")
        inputs = inputs.to(device=self._model.device, dtype=self._model.dtype)
        with torch.inference_mode():
            output = self._model.generate(**inputs, do_sample=False, max_new_tokens=180)
        text = self._processor.batch_decode(output, skip_special_tokens=True)[0]
        return {"provider": "local-real", "simulated": False, "judgment_type": "model_assessment_not_confirmed_fact", "assessment": text}

    def analyze_video(self, video_path: str, prompt: str = "Describe the video and note visible product, branding, and potential quality issues.") -> dict[str, Any]:
        from pathlib import Path
        target = Path(video_path).resolve()
        storage = get_settings().storage_dir.resolve()
        if storage not in target.parents or not target.is_file() or target.suffix.lower() not in {".mp4", ".mov", ".mkv", ".avi"}:
            raise ValueError("Video input must be an existing supported video inside configured storage")
        try:
            import decord
        except ImportError as exc:
            raise RuntimeError("Install the optional decord dependency for SmolVLM video analysis") from exc
        torch = self._ensure_loaded()
        messages = [{"role": "user", "content": [{"type": "video", "path": str(target)}, {"type": "text", "text": prompt}]}]
        inputs = self._processor.apply_chat_template(messages, add_generation_prompt=True, tokenize=True, return_dict=True, return_tensors="pt")
        inputs = inputs.to(device=self._model.device, dtype=self._model.dtype)
        with torch.inference_mode():
            output = self._model.generate(**inputs, do_sample=False, max_new_tokens=220)
        text = self._processor.batch_decode(output, skip_special_tokens=True)[0]
        return {"provider": "local-real", "simulated": False, "judgment_type": "model_assessment_not_confirmed_fact", "assessment": text}


class PaddleOCRProvider:
    def __init__(self) -> None:
        self._pipeline = None

    def analyze_image(self, image_path: str, expected_text: list[str] | None = None) -> dict[str, Any]:
        from pathlib import Path
        from app.services.model_registry import MODEL_SPECS

        root = Path(__file__).resolve().parents[2]
        detection = Path(get_settings().ocr_detection_model_path).resolve() if get_settings().ocr_detection_model_path else MODEL_SPECS["ocr_det"].local_path
        recognition = Path(get_settings().ocr_recognition_model_path).resolve() if get_settings().ocr_recognition_model_path else MODEL_SPECS["ocr_rec"].local_path
        for name, folder, required in (("detection", detection, MODEL_SPECS["ocr_det"].required_files), ("recognition", recognition, MODEL_SPECS["ocr_rec"].required_files)):
            missing = [file for file in required if not (folder / file).is_file()]
            if missing:
                raise RuntimeError(f"OCR {name} model unavailable at {folder}; missing {missing}")
        target = Path(image_path).resolve()
        storage = get_settings().storage_dir.resolve()
        if storage not in target.parents or not target.is_file():
            raise ValueError("OCR input must be an existing image inside configured storage")
        try:
            from paddleocr import PaddleOCR
        except ImportError as exc:
            raise RuntimeError("Install the optional PaddleOCR CPU dependencies") from exc
        if self._pipeline is None:
            self._pipeline = PaddleOCR(text_detection_model_dir=str(detection), text_recognition_model_dir=str(recognition), use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False, device="cpu")
        predictions = self._pipeline.predict(str(target))
        extracted = []
        for prediction in predictions:
            result = prediction.json.get("res", prediction.json) if hasattr(prediction, "json") else prediction
            texts = result.get("rec_texts", [])
            scores = result.get("rec_scores", [])
            boxes = result.get("rec_boxes", result.get("dt_polys", []))
            for index, text in enumerate(texts):
                box = boxes[index] if index < len(boxes) else None
                extracted.append({"text": text, "confidence": float(scores[index]) if index < len(scores) else None, "bounding_box": box.tolist() if hasattr(box, "tolist") else box})
        joined = " ".join(item["text"] for item in extracted).casefold()
        expected = expected_text or []
        return {"provider": "local-real", "simulated": False, "text_regions": extracted, "expected_text_checks": [{"text": text, "found": text.casefold() in joined} for text in expected]}


@lru_cache(maxsize=1)
def get_local_sd_turbo_provider() -> LocalSDTurboProvider:
    return LocalSDTurboProvider()


@lru_cache(maxsize=1)
def get_local_ltx_video_provider() -> LocalLTXVideoProvider:
    return LocalLTXVideoProvider()


@lru_cache(maxsize=1)
def get_smolvlm_provider() -> SmolVLMProvider:
    return SmolVLMProvider()


@lru_cache(maxsize=1)
def get_paddle_ocr_provider() -> PaddleOCRProvider:
    return PaddleOCRProvider()
