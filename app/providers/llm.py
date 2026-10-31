from abc import ABC, abstractmethod
from functools import lru_cache
import json
import gc
import ctypes
import os
from pathlib import Path
from typing import Any

from app.core.config import get_settings


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str) -> str:
        raise NotImplementedError

    def generate_json(self, prompt: str) -> dict[str, Any]:
        text = self.generate(prompt)
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end < start:
            raise ValueError("Local model did not return a JSON object")
        result = json.loads(text[start : end + 1])
        if not isinstance(result, dict):
            raise ValueError("Local model output must be a JSON object")
        return result


class MockLLMProvider(LLMProvider):
    def generate(self, prompt: str) -> str:
        return "Mock provider: deterministic recommendations based only on the supplied business information."


class LocalQwenProvider(LLMProvider):
    def __init__(self, model_path: str | Path | None = None) -> None:
        self.model_path = Path(model_path) if model_path else Path(__file__).resolve().parents[2] / "models/llm/qwen2.5-1.5b-instruct"
        self._model: Any = None
        self._tokenizer: Any = None

    def _load(self) -> None:
        if self._model is not None:
            return
        from app.services.model_registry import check_model

        model_status = check_model("qwen", self.model_path)
        if not model_status["available"]:
            raise RuntimeError(f"Local Qwen model is unavailable at {self.model_path}; missing: {model_status['missing_files']}")
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
        except ImportError as exc:
            raise RuntimeError("Install the optional 'ai' dependencies to use the local Qwen model") from exc
        model_bytes = (self.model_path / "model.safetensors").stat().st_size
        available = self._available_memory_bytes()
        required = model_bytes * 2.2
        maximum = get_settings().local_llm_max_memory_gib * 1024**3
        if available < required or required > maximum:
            raise RuntimeError(f"Qwen CPU load needs approximately {required / 1024**3:.1f} GiB available; current available memory is {available / 1024**3:.1f} GiB and configured model limit is {maximum / 1024**3:.1f} GiB")
        self._torch = torch
        self._tokenizer = AutoTokenizer.from_pretrained(str(self.model_path), local_files_only=True, trust_remote_code=False)
        self._model = AutoModelForCausalLM.from_pretrained(
            str(self.model_path), local_files_only=True, trust_remote_code=False,
            torch_dtype=torch.float32, low_cpu_mem_usage=True, device_map="cpu",
        )
        self._model.eval()

    @staticmethod
    def _available_memory_bytes() -> int:
        if os.name == "nt":
            class MemoryStatus(ctypes.Structure):
                _fields_ = [("length", ctypes.c_ulong), ("memory_load", ctypes.c_ulong), ("total_phys", ctypes.c_ulonglong), ("avail_phys", ctypes.c_ulonglong), ("total_page_file", ctypes.c_ulonglong), ("avail_page_file", ctypes.c_ulonglong), ("total_virtual", ctypes.c_ulonglong), ("avail_virtual", ctypes.c_ulonglong), ("avail_extended_virtual", ctypes.c_ulonglong)]

            status = MemoryStatus()
            status.length = ctypes.sizeof(status)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
                return int(status.avail_phys)
        try:
            import psutil

            return int(psutil.virtual_memory().available)
        except ImportError as exc:
            raise RuntimeError("Cannot verify available memory; install psutil before loading local Qwen") from exc

    def generate(self, prompt: str) -> str:
        from app.core.config import get_settings

        self._load()
        settings = get_settings()
        messages = [
            {"role": "system", "content": "You are a careful marketing assistant. Use only provided facts. Do not invent prices, guarantees, or product claims."},
            {"role": "user", "content": prompt},
        ]
        formatted = self._tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self._tokenizer(formatted, return_tensors="pt")
        with self._torch.inference_mode():
            output = self._model.generate(
                **inputs,
                max_new_tokens=settings.local_llm_max_new_tokens,
                do_sample=settings.local_llm_temperature > 0,
                temperature=max(settings.local_llm_temperature, 1e-5),
                pad_token_id=self._tokenizer.eos_token_id,
            )
        completion = output[0, inputs["input_ids"].shape[1] :]
        return self._tokenizer.decode(completion, skip_special_tokens=True).strip()

    def unload(self) -> None:
        self._model = None
        self._tokenizer = None
        gc.collect()


@lru_cache
def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if settings.ai_provider == "local":
        return LocalQwenProvider(settings.local_llm_path or None)
    return MockLLMProvider()
