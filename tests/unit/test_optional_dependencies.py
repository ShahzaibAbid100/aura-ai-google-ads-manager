import tomllib
from pathlib import Path


def test_model_specific_optional_dependency_groups_exist():
    pyproject = tomllib.loads(Path("pyproject.toml").read_text(encoding="utf-8"))
    extras = pyproject["project"]["optional-dependencies"]
    assert {"qwen", "sd-turbo", "smolvlm", "ocr", "ltx-video", "google-ads"} <= extras.keys()
    assert "torch" not in pyproject["project"]["dependencies"]
    assert any("transformers" in dependency for dependency in extras["qwen"])
    assert any("paddleocr" in dependency for dependency in extras["ocr"])
    assert any("transformers" in dependency for dependency in extras["ltx-video"])