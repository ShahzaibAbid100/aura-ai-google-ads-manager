from app.services.model_registry import MODEL_SPECS, matches_allowlist
from scripts.download_models import selected_files


def test_model_download_allowlists_avoid_unneeded_repository_files():
    assert matches_allowlist("model.safetensors", MODEL_SPECS["qwen"].allow_patterns)
    assert not matches_allowlist("README.md", MODEL_SPECS["qwen"].allow_patterns)
    assert not matches_allowlist("unet/diffusion_pytorch_model.safetensors", MODEL_SPECS["sd_turbo"].allow_patterns)
    assert matches_allowlist("unet/diffusion_pytorch_model.fp16.safetensors", MODEL_SPECS["sd_turbo"].allow_patterns)


def test_manifest_download_revisions_are_full_commit_ids():
    assert all(len(spec.revision) == 40 for spec in MODEL_SPECS.values())
    assert MODEL_SPECS["ltx_video"].extra_downloads[0][1].startswith("https://raw.githubusercontent.com/Lightricks/LTX-Video/")


def test_selected_files_reads_exact_expected_file_sizes(monkeypatch):
    from huggingface_hub import HfApi

    class Sibling:
        def __init__(self, path, size):
            self.rfilename = path
            self.size = size

    class Info:
        siblings = [Sibling("weights.safetensors", 123), Sibling("README.md", 10)]

    class Api:
        def model_info(self, repo_id, files_metadata):
            assert repo_id == "test/model"
            assert files_metadata
            return Info()

    monkeypatch.setattr(HfApi, "__new__", lambda cls: Api())
    assert selected_files("test/model", ("*.safetensors",)) == {"weights.safetensors": 123}
