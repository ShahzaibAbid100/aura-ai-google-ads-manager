import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.services.model_registry import MODEL_SPECS, matches_allowlist

STATUS_PATH = ROOT / "storage/model_download_status.json"
BUFFER_BYTES = 2 * 1024**3


def selected_files(repo_id: str, patterns: tuple[str, ...]) -> dict[str, int]:
    from huggingface_hub import HfApi

    info = HfApi().model_info(repo_id, files_metadata=True)
    return {
        sibling.rfilename: sibling.size or 0
        for sibling in info.siblings
        if matches_allowlist(sibling.rfilename, patterns)
    }


def download_one(key: str) -> dict[str, Any]:
    import httpx
    from huggingface_hub import snapshot_download

    spec = MODEL_SPECS[key]
    target = spec.local_path
    target.mkdir(parents=True, exist_ok=True)
    existing = sum(file.stat().st_size for file in target.rglob("*") if file.is_file())
    try:
        expected_sizes = selected_files(spec.repository, spec.allow_patterns)
    except Exception as exc:
        return {"key": key, "status": "metadata_failed", "path": str(target), "error": f"{type(exc).__name__}: {exc}"}
    estimate = sum(expected_sizes.values())
    required_bad = [name for name in spec.required_files if not (target / name).is_file() or (target / name).stat().st_size == 0]
    selected_bad = {name: {"expected": size, "actual": (target / name).stat().st_size if (target / name).is_file() else 0} for name, size in expected_sizes.items() if not (target / name).is_file() or (target / name).stat().st_size != size}
    extras_complete = all((target / name).is_file() and (target / name).stat().st_size > 0 for name, _ in spec.extra_downloads)
    if not required_bad and not selected_bad and extras_complete:
        return {"key": key, "status": "already_complete", "path": str(target), "bytes": existing, "revision": spec.revision}
    free = shutil.disk_usage(target).free
    needed = max(estimate - existing, 0) + BUFFER_BYTES
    if free < needed:
        return {"key": key, "status": "insufficient_disk_space", "path": str(target), "estimated_bytes": estimate, "free_bytes": free, "required_with_buffer": needed}

    try:
        print(f"[{key}] estimated transfer up to {estimate / 1024**3:.2f} GiB; free {free / 1024**3:.2f} GiB", flush=True)
        snapshot_path = snapshot_download(
            repo_id=spec.repository,
            revision=spec.revision,
            local_dir=str(target),
            allow_patterns=list(spec.allow_patterns),
            max_workers=4,
        )
        for filename, url in spec.extra_downloads:
            destination = target / filename
            if not destination.is_file():
                temporary = destination.with_suffix(destination.suffix + ".part")
                with httpx.stream("GET", url, timeout=60, follow_redirects=True) as response:
                    response.raise_for_status()
                    with temporary.open("wb") as output:
                        for chunk in response.iter_bytes():
                            output.write(chunk)
                temporary.replace(destination)
        missing = [name for name in spec.required_files if not (target / name).is_file()]
        if missing:
            return {"key": key, "status": "incomplete", "path": str(target), "missing_files": missing, "revision": spec.revision, "snapshot_path": snapshot_path}
        incorrect_sizes = {
            name: {"expected": size, "actual": (target / name).stat().st_size}
            for name, size in expected_sizes.items()
            if not (target / name).is_file() or (target / name).stat().st_size != size
        }
        empty_extra = [name for name, _ in spec.extra_downloads if not (target / name).is_file() or (target / name).stat().st_size == 0]
        if incorrect_sizes or empty_extra:
            return {"key": key, "status": "size_mismatch", "path": str(target), "incorrect_sizes": incorrect_sizes, "invalid_extra_files": empty_extra, "revision": spec.revision}
        bytes_saved = sum(file.stat().st_size for file in target.rglob("*") if file.is_file() and ".cache" not in file.parts)
        return {"key": key, "status": "downloaded", "path": str(target), "bytes": bytes_saved, "revision": spec.revision, "snapshot_path": snapshot_path}
    except Exception as exc:
        return {"key": key, "status": "failed", "path": str(target), "error": f"{type(exc).__name__}: {exc}"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Download allowlisted model components with resumable Hugging Face Hub snapshots.")
    choices = parser.add_mutually_exclusive_group(required=True)
    choices.add_argument("--all", action="store_true", help="Download every manifest model, continuing after individual failures")
    choices.add_argument("--model", choices=sorted(MODEL_SPECS), help="Download one model")
    args = parser.parse_args()
    keys = list(MODEL_SPECS) if args.all else [args.model]
    results = []
    for key in keys:
        print(f"[{key}] download starting", flush=True)
        result = download_one(key)
        results.append(result)
        print(json.dumps(result), flush=True)

    STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        previous = json.loads(STATUS_PATH.read_text(encoding="utf-8")) if STATUS_PATH.exists() else {}
    except (OSError, json.JSONDecodeError):
        previous = {}
    prior_models = previous.get("models", {})
    prior_models.update({item["key"]: item for item in results})
    STATUS_PATH.write_text(json.dumps({"updated_at": datetime.now(timezone.utc).isoformat(), "models": prior_models}, indent=2), encoding="utf-8")
    return 0 if all(item["status"] in {"downloaded", "already_complete"} for item in results) else 1


if __name__ == "__main__":
    sys.exit(main())