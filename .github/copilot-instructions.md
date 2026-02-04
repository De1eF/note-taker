<!-- Auto-generated guidance for AI coding agents. Keep concise and actionable. -->
# Copilot instructions — note-taker

These instructions give an AI agent the essential context to work productively in this repo.

- **Big picture**: This is a two-service app: a React + Vite frontend (in `frontend/`) and a FastAPI backend (in `backend/`). The backend persists data in MongoDB (motor) and enforces ownership and soft-deletes. The frontend centralizes API, auth and app state in `frontend/src/services/use-service.jsx` and renders the interactive canvas in `frontend/src/App.jsx`.

- **Where to look first**:
  - `frontend/src/services/use-service.jsx` — single source of truth for auth, API calls, and actions exported to the UI (`handleCreate`, `handleUpdate`, `handleViewChange`, etc.). Many components call these handlers.
  - `frontend/src/App.jsx` — the canvas, pointer/panning/zoom logic and where `handleViewChange` is called (view_state saved to server, debounced).
  - `backend/app/main.py` — FastAPI routes and ownership/security patterns. Key endpoints: `/auth/login`, `/spaces`, `/spaces/{id}`, `/spaces/{space_id}/sheets`, `/sheets`.
  - `backend/app/auth.py` — Google token verification and session token creation (used by `main.py` via dependency `get_current_user`).
  - `backend/requirements.txt` — runtime dependencies for backend.
  - `docker-compose.yml` — local dev using containers (backend + frontend + DB likely configured here).

- **Data flows & conventions**:
  - Auth: frontend sends Google ID token to `/auth/login` and receives internal `access_token`; frontend stores it in `localStorage` under `session_token`. `use-service.jsx` attaches `Authorization: Bearer <token>` to axios requests.
  - Ownership: backend stamps `owner_id` on resources and checks it on reads/updates. Soft delete uses `is_deleted` flags rather than hard deletes by default.
  - Space/view state: `view_state` (x,y,scale) is stored on `Space` and updated from the frontend via `handleViewChange`. Frontend debounces writes (`debounce(..., 1000)`) — follow that pattern when modifying view persistence.
  - Sheet lifecycle: create sheet (`POST /sheets`), then update space `sheet_ids` via `PUT /spaces/{id}`.

- **Dev / run commands (common)**:
  - Frontend: `cd frontend && npm install` then `npm run dev` (Vite). Frontend expects `VITE_API_URL` to point at the backend.
  - Backend (local): create a venv, `pip install -r backend/requirements.txt`, set `MONGO_URL` and `ALLOWED_ORIGINS` env vars, then run: `uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000`.
  - Or simply: `docker-compose up --build` (see `docker-compose.yml`) for containerized dev.

- **Project-specific patterns to preserve**:
  - Keep backend ownership checks (owner_id) when adding endpoints or modifying data access — many endpoints require `user_id = Depends(get_current_user)`.
  - Follow the `use-service` surface: return named handlers (e.g. `handleCreate`, `handleUpdate`, `handleDrag`, `handleViewChange`) instead of scattering API calls across components.
  - Soft-delete semantics: prefer `is_deleted` updates and maintain `sheet_ids` on `Space` when adding/removing sheets.
  - Frontend stores small session state in `localStorage`: `session_token` and `user_info`. Respect these keys if testing auth flows.

- **Common pitfalls / quick checks for PRs**:
  - If adding new API endpoints, ensure CORS origins include the frontend or set `ALLOWED_ORIGINS` appropriately in env.
  - If a change touches view/panning/zoom, verify `view_state` saving behavior (debounced save) and `scale` clamping (0.1–5) used in `App.jsx`.
  - When modifying sheet creation/duplication, update the space's `sheet_ids` array consistently (frontend currently posts sheet then patches space).

- **Files to reference when implementing features or debugging**:
  - `frontend/src/services/use-service.jsx` (API surface)
  - `frontend/src/App.jsx` (canvas behaviors)
  - `frontend/src/components/*` (UI pieces; `Sheet`, `ConnectionLayer`, `SpaceManager`)
  - `backend/app/main.py`, `backend/app/auth.py`, `backend/app/models.py` (API + auth + schemas)
  - `backend/requirements.txt`, `docker-compose.yml` (runtime)

If any area above is unclear or you want the instructions tuned to a different agent persona (test runner, refactor-only, or security auditor), say which role and I'll iterate.
