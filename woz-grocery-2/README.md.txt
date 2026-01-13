# Grocery Assistant WoZ Prototype (Participant + Wizard Console)

This is a production-quality, hostable Wizard-of-Oz prototype with:
- Participant UI: scenario selection + editable starter prompt + chat
- Wizard console: live incoming messages + tone selector + response composer + message log + export CSV + reset session
- Real-time chat using Socket.io (WebSockets)
- In-memory session store keyed by sessionId
- Site-wide password gate (signed httpOnly cookie, 12 hours)

## Stack
- Frontend: Next.js (App Router) + React + TypeScript + CSS Modules
- Backend: Node.js + Express + Socket.io
- Storage: In-memory (no DB)

---

## Environment variables

### Backend
Create `backend/.env` (or set in your shell):
- `PORT=4000`
- `FRONTEND_ORIGIN=http://localhost:3000`

### Frontend
Create `frontend/.env.local`:
- `SITE_PASSWORD=your_shared_password`
- `COOKIE_SECRET=replace_with_random_string`
- `NEXT_PUBLIC_BACKEND_URL=http://localhost:4000`

Notes:
- `SITE_PASSWORD` is a single shared site-wide password (no accounts).
- `COOKIE_SECRET` signs the auth cookie; change this in production.

---

## Run locally

### 1) Backend
```bash
cd backend
npm install
npm run dev
