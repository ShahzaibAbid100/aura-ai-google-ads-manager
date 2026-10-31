# AURA — AI Google Ads Manager

### AI-Powered Google Ads Campaign Management & Creative Automation Platform

AURA is a full-stack AI-powered Google Ads management application. It combines **React, TypeScript, FastAPI, LangGraph, SQLite, and Hugging Face AI models** to streamline advertising campaign planning, creative asset preparation, campaign management, and performance analysis.

The platform provides an interactive AI workspace where users can create advertising campaigns, analyze business websites, generate advertising copy, manage campaign assets, review advertising strategies, and approve campaigns through a centralized interface.

The frontend and backend have been successfully integrated and verified using automated tests and end-to-end API integration checks.

**Project Type:** Full-Stack AI / Agentic AI Application

**Development Environment:** Python 3.11, VS Code, Windows

## Project Features

### 1. AI Campaign Planning

- Business and product information processing
- Advertising objective selection
- Audience and geographic targeting suggestions
- Campaign budget configuration
- Target ROAS configuration
- Advertising channel selection
- Structured campaign strategy generation
- Campaign creation and database persistence

### 2. Website & Business Analysis

- Website URL processing
- Business content extraction
- Product and service information analysis
- Landing page analysis
- Brand-related information extraction
- Structured data preparation for advertising workflows
- Safe URL validation and request handling

### 3. AI Advertisement Copy Generation

- Advertising headline generation
- Advertisement descriptions
- Calls to action
- Multiple headline variations
- Campaign-specific messaging
- Advertisement copy validation
- Copy revision workflows
- Campaign copy saving and editing

### 4. AI Image Generation

- Text-to-image generation interface
- Image-to-image generation interface
- Advertising creative preparation
- Creative asset metadata
- Generated image storage
- Image preview API
- Asynchronous generation job management

**Configured model:** SD-Turbo

### 5. AI Video Generation

- Text-to-video provider interface
- Image-to-video provider interface
- Video generation jobs
- Video status tracking
- Output file handling
- Promotional video workflow integration
- FFmpeg-based post-processing support

**Configured model:** LTX-Video

### 6. Advertisement Quality Analysis

- Advertising text validation
- Required asset validation
- Brand consistency checks
- Image metadata validation
- OCR integration
- Vision model integration
- Creative quality recommendations

**Configured models:** SmolVLM2 and PP-OCRv5

### 7. LangGraph AI Agent Workflows

- Campaign planning workflows
- Conditional routing
- Advertisement copy evaluation
- Bounded revision loops
- Campaign optimization recommendations
- AI chat workflow integration
- Structured workflow state management
- Error handling and workflow validation

### 8. Campaign Management

- Campaign draft creation
- Campaign editing
- Saved campaign retrieval
- Advertising asset management
- Campaign history
- Database persistence
- Campaign validation
- Approval status management
- Version-bound human approval
- Audit records

### 9. Google Ads Integration

- Google OAuth 2.0 integration
- OAuth state validation
- Secure token exchange
- Encrypted token storage
- Google Ads account connection status
- Read-only reporting integration
- Campaign publishing safety controls

Google Ads publishing is intentionally disabled in the current implementation. Campaign approval inside AURA does not automatically publish advertisements.

### 10. Campaign Analytics & Optimization

- Impressions
- Clicks
- Click-through rate (CTR)
- Average cost per click (CPC)
- Advertising cost
- Conversions
- Cost per acquisition (CPA)
- Conversion value
- Return on ad spend (ROAS)
- Campaign performance analysis
- Optimization recommendations

Real Google Ads account metrics require an authorized Google Ads connection.

---

## Testing & Verification Results

AURA has undergone automated backend testing, TypeScript validation, production build checks, database verification, and frontend–backend integration testing.

### Test Summary

| Test Category | Result |
|---|---|
| Backend Automated Tests | **34 Passed** |
| Additional Inference Tests | 5 Skipped |
| Frontend–Backend Integration Tests | **10/10 Passed** |
| TypeScript Validation | **Passed** |
| Frontend Production Build | **Passed** |
| Python Compilation | **Passed** |
| SQLite Database Migrations | **Passed** |
| OpenAPI Schema Validation | **Passed** |
| FastAPI Startup | **Passed** |
| Backend Health API | **HTTP 200** |
| Frontend Server | **HTTP 200** |
| API Proxy Connection | **HTTP 200** |

### Module-Level Test Results

| Module | Verified Testing Result |
|---|---|
| FastAPI Application | **Tested — Passed** |
| React Frontend | **Build Tested — Passed** |
| Frontend–Backend Connectivity | **Integration Tested — Passed** |
| SQLite Database | **Migration Tested — Passed** |
| Campaign Creation | **Integration Tested — Passed** |
| Campaign Database Persistence | **Integration Tested — Passed** |
| Campaign Retrieval | **Integration Tested — Passed** |
| Campaign Copy Generation API | **Integration Tested — Passed** |
| Campaign Approval | **Integration Tested — Passed** |
| LangGraph Workflow Logic | **Automated Tests Passed** |
| AI Chat Reporting Action | **Integration Tested — Passed** |
| Advertisement Image API | **Integration Tested — Passed** |
| Video Generation Job API | **Integration Tested — Passed** |
| Persistent Job Tracking | **Integration Tested — Passed** |
| Campaign Reporting API | **Integration Tested — Passed** |
| Google Ads Connection Status API | **Integration Tested — Passed** |
| Model File Inventory | **Verified — 7 Model Entries** |
| Model Download Verification | **Passed** |
| OpenAPI Contracts | **Validated — 26 Paths** |

### Frontend–Backend Integration Verification

The application passed **10 out of 10 integration checks**, covering:

1. FastAPI backend health endpoint.
2. React frontend server availability.
3. Frontend-to-backend API proxy communication.
4. AI model inventory API.
5. Saved campaign retrieval from SQLite.
6. Campaign reporting response and source labeling.
7. AI chat request execution.
8. Google Ads OAuth connection status.
9. Image generation API and asset metadata.
10. Video generation jobs and persistence.

**Final Integration Result: 10 Passed, 0 Failed, 0 Skipped.**

### Testing Scope

These successful results verify application logic, backend APIs, LangGraph workflows, database operations, campaign management, frontend integration, and simulated AI generation/reporting services.

Local Hugging Face model files have been downloaded and verified, but real model inference has not yet been executed on compatible hardware. Live Google Ads account access has not been verified with production credentials.

This distinction is maintained to keep testing results accurate and reproducible.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Python 3.11, FastAPI |
| AI Orchestration | LangGraph |
| Database | SQLite |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| LLM | Hugging Face Transformers |
| Image Generation | Diffusers |
| Video Generation | LTX-Video |
| Vision Analysis | SmolVLM2 |
| OCR | PaddleOCR |
| AI Framework | PyTorch |
| Video Processing | FFmpeg |
| Website Analysis | HTTPX, BeautifulSoup |
| API Security | OAuth 2.0, Fernet |
| Testing | Pytest, TypeScript, Vite |

---

## AI Models — Hugging Face

AURA supports locally configured Hugging Face models.

**AI model weights are not included in this GitHub repository.** The application provides model download, local path configuration, and model availability verification utilities.

| Purpose | AI Model | Hugging Face Repository |
|---|---|---|
| Language Model | Qwen2.5-1.5B-Instruct | [Hugging Face](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct) |
| Image Generation | SD-Turbo | [Hugging Face](https://huggingface.co/stabilityai/sd-turbo) |
| Video Generation | LTX-Video | [Hugging Face](https://huggingface.co/Lightricks/LTX-Video) |
| Video Text Encoder | PixArt-XL-2-1024-MS | [Hugging Face](https://huggingface.co/PixArt-alpha/PixArt-XL-2-1024-MS) |
| Vision Understanding | SmolVLM2-500M-Video-Instruct | [Hugging Face](https://huggingface.co/HuggingFaceTB/SmolVLM2-500M-Video-Instruct) |
| OCR Detection | PP-OCRv5 Mobile Detection | [Hugging Face](https://huggingface.co/PaddlePaddle/PP-OCRv5_mobile_det) |
| OCR Recognition | PP-OCRv5 Mobile Recognition | [Hugging Face](https://huggingface.co/PaddlePaddle/PP-OCRv5_mobile_rec) |

### Model Management

Model registry:

`app/services/model_registry.py`

Model download script:

`scripts/download_models.py`

Model verification script:

`scripts/verify_models.py`

Hardware compatibility utility:

`scripts/check_hardware.py`

Model files are excluded from version control to keep the GitHub repository lightweight.

Check model licenses and hardware requirements before enabling real inference.

---

## System Architecture

AURA uses a modular frontend–backend architecture.

**React Frontend → FastAPI REST API → LangGraph Workflows → AI Providers / Application Services → SQLite Database**

### Frontend

The React application provides:

- Landing page
- Campaign creation wizard
- AI chat workspace
- Campaign management interface
- Advertisement preview
- Advertisement copy editor
- Asset management interface
- Google Ads account settings
- Reporting views
- Model/backend connection status

### Backend

FastAPI manages:

- Request validation
- REST API endpoints
- Campaign services
- LangGraph execution
- Website analysis
- AI provider integrations
- Campaign approval
- OAuth security
- Analytics
- Job management
- Database operations

### Database

SQLite stores:

- Business information
- Campaigns
- Campaign plans
- Advertisement assets
- Campaign approval records
- Execution jobs
- Performance snapshots
- Optimization recommendations
- OAuth connection data
- Audit records

---

## Project Structure

```text
aura/
|
|-- app/
|   |-- api/
|   |   `-- v1/
|   |-- core/
|   |-- db/
|   |-- graph/
|   |-- models/
|   |-- providers/
|   |-- schemas/
|   |-- services/
|   `-- main.py
|
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- data/
|   |   |-- services/
|   |   `-- App.tsx
|   |-- package.json
|   `-- vite.config.ts
|
|-- alembic/
|-- scripts/
|-- tests/
|-- models/          # Local AI weights (not committed)
|-- storage/         # Local application data (not committed)
|
|-- .env.example
|-- .gitignore
|-- alembic.ini
|-- openapi.json
|-- pyproject.toml
|-- requirements.txt
`-- README.md
```

---

## Installation & Setup

### Prerequisites

- Windows 10/11
- Python 3.11
- Node.js and npm
- Git
- VS Code (recommended)

Compatible GPU hardware is required for testing certain local AI inference workflows.

### 1. Clone Repository

```powershell
git clone https://github.com/ShahzaibAbid100/aura-ai-google-ads-manager.git
```

```powershell
cd aura-ai-google-ads-manager
```

### 2. Create Python Environment

```powershell
py -3.11 -m venv .venv311
```

```powershell
.\.venv311\Scripts\Activate.ps1
```

### 3. Install Backend Dependencies

```powershell
python -m pip install -r requirements.txt
```

Optional AI inference dependencies must be installed separately according to the selected local provider and hardware compatibility.

### 4. Configure Environment Variables

```powershell
Copy-Item .env.example .env
```

Edit `.env` with the required local configuration. OAuth credentials and API developer tokens are required only when enabling authenticated Google Ads integration.

Keep Google Ads writes disabled:

```text
GOOGLE_ADS_ENABLE_WRITES=false
```

### 5. Initialize Database

```powershell
python -m alembic upgrade head
```

### 6. Start FastAPI Backend

```powershell
python -m uvicorn app.main:app --reload
```

Backend API documentation:

http://127.0.0.1:8000/docs

Backend health:

http://127.0.0.1:8000/api/v1/health

Model readiness:

http://127.0.0.1:8000/api/v1/models/status

### 7. Install Frontend Dependencies

Open a second PowerShell terminal:

```powershell
cd frontend
```

```powershell
npm.cmd install
```

### 8. Run React Frontend

```powershell
npm.cmd run dev
```

Open:

http://localhost:3000

The frontend and backend must both be running for local development.

---

## Model Download & Verification

Model weights are downloaded separately from Hugging Face.

From the project root:

```powershell
python scripts/check_hardware.py
```

```powershell
python scripts/download_models.py --all
```

```powershell
python scripts/verify_models.py
```

Downloads can be large. Some model repositories have licensing or hardware requirements.

The LTX-Video inference setup also requires a separately configured compatible CUDA environment, supporting model components, and an appropriate GPU.

---

## Running Tests

### Backend Tests

```powershell
python -m pytest -q
```

Latest verified result:

**34 passed, 5 skipped**

### Python Compilation

```powershell
python -m compileall -q app scripts tests alembic
```

### OpenAPI Contract Verification

```powershell
python scripts/export_openapi.py --check
```

### Frontend TypeScript Validation

```powershell
cd frontend
```

```powershell
npm.cmd run lint
```

### Frontend Production Build

```powershell
npm.cmd run build
```

### Integration Verification

The latest completed local frontend–backend integration check reported:

**10 passed, 0 failed, 0 skipped**

The integration script was run separately during development and is not necessarily included in this repository.

---

## Security & Safety

AURA follows a safety-focused development approach.

- Google Ads live publishing is disabled.
- Human approval is required for campaign approval workflows.
- OAuth credentials remain on the backend.
- OAuth tokens are encrypted at rest.
- Sensitive environment configuration is excluded from Git.
- Local AI model weights are excluded from Git.
- Local databases and generated media are excluded from Git.
- Campaign approval does not imply a live Google Ads launch.
- Reporting results identify whether they come from simulated or authenticated sources.

Users must configure their own authorized Google Ads account and developer credentials for live read-only reporting.

---

## Current Release Status

**Verified application capabilities:**

- React frontend and FastAPI backend connectivity
- Campaign creation and retrieval
- Database persistence
- Campaign copy generation API integration
- Campaign validation and approval
- LangGraph workflow execution
- Media generation API and job handling
- Model inventory verification
- Reporting and AI chat integration
- Automated backend and frontend build testing

**Additional requirements before production use:**

- Real AI inference validation on suitable hardware
- Authenticated Google Ads reporting verification
- Production-grade access controls and deployment hardening
- Separate implementation and authorization for live Google Ads publishing

---

## Disclaimer

AURA is an independent AI application inspired by AI-assisted advertising management workflows.

It is **not affiliated with, endorsed by, or an official product of Google or Picsart**.

AI-generated recommendations require human review. Advertising outcomes, sales, return on ad spend, and Google Ads approval are not guaranteed.

---
