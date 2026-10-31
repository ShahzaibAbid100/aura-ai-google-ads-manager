# Aura AI Google Ads Manager Backend

A mock-first, backend-only FastAPI service for website analysis, campaign planning, ad copy drafting, quality checks, human approval, media jobs, and Google Ads workflow preparation. Local Hugging Face model adapters are optional and use project-local files only. Recommendations and simulated results are explicitly labeled. Google Ads mutations are never sent by this version.

## Architecture

- `app/api/v1`: REST API and authorization boundary.
- `app/services`: deterministic planning, URL analysis, validation, OAuth security, analytics, and job operations.
- `app/graph`: bounded LangGraph planning and copy workflows.
- `app/providers`: mock and local Qwen, SD-Turbo, SmolVLM2, LTX, and PaddleOCR adapters.
- `app/services/model_registry.py`: pinned model repositories, selected files, licenses, hardware notes, and model availability checks.
- `scripts`: resumable model downloader, model verifier, hardware report, and isolated LTX worker setup.
- `app/models`: SQLAlchemy records for businesses, analyses, campaigns, assets, approvals, OAuth tokens, jobs, snapshots, recommendations, and audit events.
- `alembic`: database schema migration setup.

SQLite is the default database. The application creates tables on startup for convenient local use; use Alembic for versioned database setup and upgrades.

## Windows PowerShell Setup

Python 3.11 is recommended. From the project root:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
```

For the already configured project interpreter, the commands are `& 'D:/aura/.venv311/Scripts/python.exe' -m pip install -e ".[dev]"`; optional inference extras are installed one-at-a-time with `python -m pip install -e ".[qwen]"`, `.[sd-turbo]`, `.[smolvlm]`, or `.[ocr]`. The backend remains mock-default unless the corresponding provider environment setting explicitly selects `local`.

Set a persistent Fernet key for deployments and any environment where OAuth tokens must remain decryptable after restart:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Put that value in `FERNET_KEY` in `.env`, and set a unique `SECRET_KEY`. Do not commit `.env` or credentials.

## Run

```powershell
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

The API is at `http://127.0.0.1:8000`; interactive Swagger documentation is at `http://127.0.0.1:8000/docs`. All application endpoints are under `/api/v1`.

## Test and Compile

```powershell
python -m pytest -q
python -m compileall -q app scripts tests alembic
python scripts/check_hardware.py
python scripts/verify_models.py
```

Real inference tests are separate and explicitly opt-in: install the appropriate local runtime and weights, then run `$env:RUN_REAL_MODEL_TESTS="1"; python -m pytest -q tests/test_real_inference.py`. The registry reports `inference_verified` only after a smoke test produces its expected output and writes revision/path/file-size-bound evidence to `storage/model_inference_status.json`. Replacing a model file or changing its revision makes evidence stale. Tests skip when hardware, memory, packages, or model weights are unavailable.

Tests use an isolated in-memory SQLite database and mocked network/provider behavior. They do not download models or contact Google Ads.

## Configuration

Copy `.env.example` to `.env`. Important settings:

- `DATABASE_URL`: SQLite URL; defaults to `sqlite:///./storage/aura.db`.
- `AI_PROVIDER=mock`: deterministic development provider. Set `AI_PROVIDER=local` and `LOCAL_LLM_PATH` to an existing local Qwen directory for local Transformer inference using its chat template and structured JSON checks. Missing weights or dependencies are hard errors, not mock fallbacks.
- `IMAGE_PROVIDER=mock|local`: local selects SD-Turbo from `IMAGE_MODEL_PATH` or `models/image/sd-turbo`.
- `VIDEO_PROVIDER=mock|local`: local selects LTX, gated by `LTX_VIDEO_INFERENCE_ENABLED=true`, official video-worker dependencies, Q8 kernels, FFmpeg and supported CUDA GPU.
- `VISION_PROVIDER=mock|local`: local selects SmolVLM2 from `VISION_MODEL_PATH` or `models/vision/smolvlm2-500m`.
- `OCR_PROVIDER=mock|local`: local selects PP-OCRv5; configure `OCR_DETECTION_MODEL_PATH` and `OCR_RECOGNITION_MODEL_PATH` to override defaults.
- `PIXART_ENCODER_MODEL_PATH`: optional local path for the LTX-required PixArt text encoder.
- `STORAGE_DIR`: output directory for simulated image and video metadata assets.
- `CORS_ORIGINS`: comma-separated allowed browser origins. Do not use wildcard origins with credentials in production.
- `API_AUTH_TOKEN`: bearer token for protected campaign changes, approvals, optimization, and disconnect actions. In production, the protected routes fail closed unless this is configured. Replace this simple shared-token boundary with user identity/roles before exposing the service to multiple users.
- `FERNET_KEY`: persistent Fernet key for encrypted OAuth tokens. A development key derived from `SECRET_KEY` is used when omitted; it is not suitable for durable production storage.
- `GOOGLE_ADS_ENABLE_WRITES=false`: must stay disabled until a separately reviewed live mutation provider and authorization controls exist.

Install the resumable Hub downloader separately and request a selected model:

```powershell
python -m pip install -e ".[download]"
python scripts/download_models.py --model qwen
python scripts/download_models.py --model sd_turbo
python scripts/download_models.py --model smolvlm
python scripts/download_models.py --model ocr_det
python scripts/download_models.py --model ocr_rec
python scripts/download_models.py --model ltx_video
python scripts/download_models.py --model pixart_encoder
python scripts/download_models.py --all
python scripts/verify_models.py
```

Downloads use pinned Hub commit SHAs, selected file allowlists, per-model disk checks with a 2 GiB safety buffer, and resumable Hub snapshots. Independent model errors do not delete partial files. `--all` may download around 30 GiB. Review licenses before use: Qwen, SmolVLM2 and PP-OCRv5 identify Apache-2.0; PixArt identifies OpenRAIL++; SD-Turbo is subject to Stability AI terms; LTX weights have a separate license from the Apache-2.0 repository code.

Install only the selected inference group; the default API environment remains lightweight:

```powershell
python -m pip install -e ".[qwen]"
python -m pip install -e ".[sd-turbo]"
python -m pip install -e ".[smolvlm]"
python -m pip install -e ".[ocr]"
python -m pip install -e ".[google-ads]"
python -m pip install -e ".[browser]"
```

These optional groups target Python 3.11 and are not installed in the current API environment. Install only after checking available RAM/VRAM. Qwen's opt-in CPU smoke test has an available-memory preflight. SD-Turbo and SmolVLM smoke tests require CUDA with the minimum VRAM checked in `tests/test_real_inference.py`; PaddleOCR CPU inference can be tested independently.

No model weights are downloaded at startup. SD-Turbo uses its 512x512 checkpoint path, 1-4 denoising steps and guidance scale 0. Other aspect ratios are formatted by Pillow resize/crop after generation. Text-to-image and image-to-image are supported; advanced inpainting is not.

LTX-Video 0.9.8 FP8 needs the 2B checkpoint, spatial upscaler, PixArt text encoder/tokenizer, official inference code and Lightricks Q8 CUDA kernels. On a separate compatible NVIDIA host, run `scripts/setup_video_environment.ps1`; it checks `nvidia-smi`, creates `.venv-video`, installs a pinned CUDA 12.8 PyTorch/vision/audio set there, then installs the LTX runtime and pinned official source/Q8 kernel. Windows C++ Build Tools and CUDA Toolkit 12.8 are prerequisites for building Q8 kernels. The LTX provider keeps a conservative 12 GiB VRAM gate and `LTX_VIDEO_INFERENCE_ENABLED=false` until explicitly enabled after GPU validation. Do not run this script on the current CPU-only machine.

SmolVLM2 performs model-based image analysis, not generation, and its results are advisory. PaddleOCR emits text regions, confidence and bounding boxes. Neither downloads additional model files at startup.

## Main Workflows

- `POST /api/v1/websites/analyze`: bounded HTML extraction with public-address checks, redirects revalidated, timeout, and response size limit.
- `POST /api/v1/campaigns/plan`: produces recommendations, not confirmed platform settings.
- `POST /api/v1/campaigns` and `/{id}/generate`, `/validate`, `/approve`, `/reject`: draft lifecycle with version-bound approval and audit events.
- `POST /api/v1/campaigns/{id}/publish`: requires current-version approval. Returns `dry_run` with writes disabled, and remains `blocked` even if the flag is enabled because no Google Ads mutation adapter exists.
- `POST /api/v1/campaigns/{id}/workflow`: LangGraph workflow for optional website analysis, planning, copy/evaluation, optional media, validation, and pending human approval.
- `GET /api/v1/campaigns/{id}/report` and `/optimize`: deterministic simulated report/recommendations. No changes are automatically applied.
- `GET /api/v1/google-ads/report?source=live`: official Google Ads Python SDK read-only `GoogleAdsService.search`; requires the optional SDK, configured developer token, OAuth connection, and customer ID.
- `/api/v1/models/status` and `/api/v1/models/capabilities`: separate weight availability, installed runtime, Python compatibility, capability-specific missing packages, and revision-bound inference-test result, plus provider/license/hardware information. `available=true` means weights only, not verified inference.
- `/api/v1/campaigns/{id}/history`: audit and approval history.
- `/api/v1/media/images/generate` creates a visibly marked mock PNG. Video generation records a completed job and metadata-only simulated result; it does not create an MP4.
- Google OAuth start uses state and PKCE. The callback exchanges the code only when credentials are configured and stores encrypted tokens. Refresh support is implemented as a service helper, but no reporting client currently consumes it. OAuth credentials and Google Ads developer-token setup/verification are required before connecting production accounts.

## Future Frontend Integration

Use the versioned REST API and its OpenAPI schema at `/openapi.json`. The frontend must send `Authorization: Bearer <API_AUTH_TOKEN>` for protected operations and must treat all plans, mock assets, and mock analytics as recommendations/simulations. Browser clients are not trusted to approve or publish without server-side identity and policy controls.

## OpenAPI Contract

`openapi.json` is the exported OpenAPI 3.1 API contract. Regenerate and validate it after route or schema edits with `python scripts/export_openapi.py`; CI can detect drift with `python scripts/export_openapi.py --check`. JSON endpoints publish explicit Pydantic response models; media files use a binary response contract. The document contains no model weights or credentials.

## Remaining Live Integration Steps

The model files are present, but none have successful real-inference evidence yet. Install model-specific dependencies on a machine that meets the reported RAM/VRAM requirements, run `RUN_REAL_MODEL_TESTS=1` smoke tests there, and inspect `/api/v1/models/status` for `readiness=inference_verified`. A test record is tied to the selected revision, path, and required file sizes.

For read-only Google Ads reports, the project owner must provide a Google Cloud OAuth client ID/secret, authorized redirect URI, consent screen and `adwords` scope; complete any required Google verification; supply a Google Ads developer token and customer ID; and complete the OAuth connection. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, persistent `FERNET_KEY`, `OAUTH_REDIRECT_URI`, and `API_AUTH_TOKEN` only in the backend environment. Use `GET /api/v1/google-ads/report?source=live` after connection. Google Ads mutations remain blocked regardless of the writes flag.

## Known Limitations

- Google Ads read-only reporting is implemented but requires the optional SDK and owner-provided credentials. Campaign mutation remains blocked/dry-run.
- Before live reporting, the owner must create a Google Cloud OAuth client, set the exact redirect URI and `adwords` scope, complete any required consent-screen verification, provision a Google Ads developer token, authorize the account/customer, and configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, persistent `FERNET_KEY`, `OAUTH_REDIRECT_URI`, and an API auth token. Manager-account access may also require the login customer ID. Keep secrets server-side; verify only the read-only `source=live` report endpoint. Campaign mutations remain blocked.
- OAuth token exchange and refresh helper exist; scheduled refresh, account discovery, multi-user credential separation, and production OAuth hardening remain future work.
- Local adapters are implemented, but real inference depends on optional packages and local weights. LTX additionally requires CUDA 12.8-compatible runtime and Q8 kernels; it is disabled by default.
- This machine was measured at 8 GiB RAM, 96+ GiB free disk, Intel i7-5600U, Intel HD 5500, no CUDA device. CPU Qwen/SD-Turbo real inference smoke tests were not run because Torch/Transformers/Diffusers were not installed and Qwen's ~3 GiB checkpoint may exceed safe available RAM during inference.
- Download status is recorded at `storage/model_download_status.json`; verify with `python scripts/verify_models.py`. The selected model set uses about 30 GiB including the LTX PixArt encoder. Unauthenticated Hugging Face rate limits may apply.
- Downloaded weights in this workspace: Qwen2.5-1.5B Instruct at `models/llm/qwen2.5-1.5b-instruct` (~3.09 GB); SD-Turbo FP16 components at `models/image/sd-turbo` (~1.90 GB); LTX-Video 2B FP8, 0.9.8 upscaler and YAML at `models/video/ltx-video` (~4.97 GB); LTX PixArt text encoder/tokenizer at `models/video/pixart-text-encoder` (~19.05 GB); SmolVLM2-500M at `models/vision/smolvlm2-500m` (~2.03 GB); PP-OCRv5 detector at `models/ocr/detection` (~4.9 MB); and recognizer at `models/ocr/recognition` (~16.7 MB). Downloaded files are gitignored.
- Model weights are complete, but real inference smoke tests remain pending: model runtime dependencies are not installed in the main environment, only ~1.4 GiB RAM was free during checks, and no CUDA GPU is present. `tests/test_real_inference.py` contains explicit opt-in tests; LTX requires a separate compatible NVIDIA environment and was not executed.
- Playwright is optional and not used by default; the crawler uses HTTPX and BeautifulSoup.
- Website crawling is a single-page extraction, not a full crawler. It does not currently fetch or interpret robots.txt or execute JavaScript. Playwright is an optional dependency only.
- The lightweight job service persists job records but executes media mock work in the request process, not in a production worker queue.
- Campaign endpoints use schemas and stable JSON, but multi-user authorization, durable idempotency-key handling, Google Ads policy review, and production-grade rate limiting remain future work.
- This project directory is the VS Code workspace root (`D:\aura`). The requested `D:\auro_ad_manager` path was not mounted in this session.

## Safe Publishing Procedure

There is no live publishing implementation yet. Before one is added: configure OAuth credentials and developer token securely; verify user identity and account/customer access; run validation and policy checks; record human approval against the exact campaign version and budget; require separate server-side runtime authorization; add idempotency and audit protections; then test only against an approved non-production account. Never enable writes as a substitute for implementing these controls.
