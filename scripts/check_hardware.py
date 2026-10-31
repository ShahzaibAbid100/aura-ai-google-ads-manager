import importlib.util
import ctypes
import json
import os
import platform
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main() -> None:
    disk = shutil.disk_usage(ROOT)
    report = {
        "platform": platform.platform(),
        "python": platform.python_version(),
        "cpu_count": os.cpu_count(),
        "ram_bytes": None,
        "gpu": "not detected; install optional torch to query CUDA",
        "cuda_available": False,
        "cuda_version": None,
        "packages": {name: importlib.util.find_spec(name) is not None for name in ("torch", "transformers", "diffusers", "huggingface_hub", "paddle", "paddleocr")},
        "disk_free_bytes": disk.free,
        "disk_total_bytes": disk.total,
    }
    try:
        import psutil

        report["ram_bytes"] = psutil.virtual_memory().total
        report["ram_available_bytes"] = psutil.virtual_memory().available
    except ImportError:
        if os.name == "nt":
            class MemoryStatus(ctypes.Structure):
                _fields_ = [("length", ctypes.c_ulong), ("memory_load", ctypes.c_ulong), ("total_phys", ctypes.c_ulonglong), ("avail_phys", ctypes.c_ulonglong), ("total_page_file", ctypes.c_ulonglong), ("avail_page_file", ctypes.c_ulonglong), ("total_virtual", ctypes.c_ulonglong), ("avail_virtual", ctypes.c_ulonglong), ("avail_extended_virtual", ctypes.c_ulonglong)]

            status = MemoryStatus()
            status.length = ctypes.sizeof(status)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
                report["ram_bytes"] = int(status.total_phys)
                report["ram_available_bytes"] = int(status.avail_phys)
    try:
        import torch

        report["cuda_available"] = torch.cuda.is_available()
        report["cuda_version"] = torch.version.cuda
        if torch.cuda.is_available():
            report["gpu"] = torch.cuda.get_device_name(0)
            report["gpu_memory_bytes"] = torch.cuda.get_device_properties(0).total_memory
    except ImportError:
        pass
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
