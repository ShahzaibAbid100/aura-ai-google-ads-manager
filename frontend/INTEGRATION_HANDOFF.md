# AURA: Backend integration handoff

## What was inspected

The uploaded frontend is React 19 / Vite 8 / TypeScript / Tailwind 4. There were no actual `fetch()` requests inside the supplied `src` directory. `NewCampaignModal.tsx` fabricated sample headlines after `setTimeout`, `StudioWorkspace.tsx` fabricated agent replies and adjusted ROAS/budget, and its approval button only changed local React state and showed confetti. The frontend's example creatives and performance/ad strength ratings are demonstrations, not server evidence.

## Already wired in this integration starter

- `src/services/api.ts`: typed common HTTP/error handling, real `GET /api/v1/health` and `GET /api/v1/models/status`.
- `src/components/BackendStatus.tsx`: backend connectivity indicator, intentionally **not** a model-inference or Google Ads publication success indicator.
- `vite.config.ts`: development proxy `/api` -> `http://127.0.0.1:8000` (configurable).
- Approval UI no longer falsely reports a campaign was staged or published. `Request Approval` warns the user until its real authenticated backend endpoint is connected.
- `.env.example`: public frontend settings only; old Gemini secret instructions removed.
- `esbuild` aligned with Vite 8 peer dependency range. Preserve layout and assets.

## What must be done on the user's Windows computer

The backend source, database and actual exported OpenAPI contract were NOT included in the frontend ZIP. The existing backend lives on the user's machine in `D:\aura`. You must inspect its actual `openapi.json` before implementing any mutation request schemas or assuming an approval route contract.

Place this frontend at `D:\aura\frontend` and give the local VS Code Copilot Agent access to both `D:\aura\frontend` and the existing FastAPI backend.

With the actual OpenAPI contract:

1. Generate or hand-author TS request/response types for real routes, matching Pydantic schema exactly (no invented keys).
2. Replace `NewCampaignModal.tsx`'s setTimeout fake campaign with website analysis / campaign plan / draft creation API calls, using only available confirmed endpoints. Save returned server campaign ID, status, version and persistence.
3. Replace `StudioWorkspace.tsx` fake chat synthesis with genuine supported LangGraph/ad copy API workflows. If no chat endpoint exists, implement the smallest authenticated FastAPI chat/orchestration route needed and add tests. Don't inject a fake LLM response.
4. Bind campaign settings editor to backend update endpoints; handle data validation and approval invalidation when budget/headlines change.
5. Wire explicit authenticated campaign validation and approval; never call publishing automatically, keep Google Ads writes OFF. Do not display approved until the backend acknowledges the persisted approval.
6. Drive media upload/generation and asynchronous job polling from real media/job endpoints, showing model download status separately from inference-ready status. Show truthfully labeled mock results.
7. Wire Google Ads OAuth connect and read-only performance reporting using backend endpoints, not frontend secrets.
8. Distinguish demo credits, decorative voice input, ads previews and hardcoded data from real operations; replace or label appropriately.
9. Add API contract tests and user-flow checks, handling 401/403/422/500, backend offline, job pending/errors, and no GPU inference.
10. Run npm install, npm run lint, npm run build, Python pytest/compileall, FastAPI OpenAPI drift checks and integration smoke tests. Report actual outputs.

## Local commands

Terminal A:

    cd D:\aura
    .\.venv311\Scripts\Activate.ps1
    python -m alembic upgrade head
    python -m uvicorn app.main:app --reload

Terminal B:

    cd D:\aura\frontend
    npm.cmd install
    npm.cmd run lint
    npm.cmd run dev

Open `http://localhost:3000`, then verify the small **Backend connected** indicator. It proves connectivity only; the campaign flows are *not* fully integrated yet.

To inspect your exact server contract: `http://127.0.0.1:8000/openapi.json` or `D:\aura\openapi.json` if already exported.

## Safety / limitations

No heavy models were copied into the frontend. Keep OAuth developer tokens, client secrets and Fernet keys exclusively on the backend. This starter does NOT implement the full campaign/chat/media integration because the actual backend OpenAPI and Pydantic schemas were not included. It does not imply a successful real generation or Google Ads account connection.

The supplied images were mirrored to `public/assets/images/` and their URLs updated, so they also resolve in a Vite production build. No visual layout redesign was made.
