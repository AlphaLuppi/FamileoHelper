# FamileoHelper

Personal mobile companion that scans your camera roll and proposes Famileo posts to send to your grandparents.

## Components

- `backend/` — Node.js HTTP service: caption generation (Claude), Famileo client (mock + future web impl), pad/gazette/post endpoints. Deployed on a personal VPS via Dokploy.
- `app/` — Expo (React Native) mobile app. **Not yet implemented** (Plan 2).

## Status

- [x] Backend MVP (caption + mock Famileo + auth)
- [ ] Mobile app MVP
- [ ] Real Famileo Web API client (manual API discovery already done — see `docs/famileo-api-notes.md`)

See `docs/superpowers/specs/2026-05-14-familihelp-design.md` for the full design and `docs/superpowers/plans/` for implementation plans.

## Local dev (backend)

```bash
cd backend
npm install
cp .env.example .env   # fill in BACKEND_BEARER_TOKEN, SESSION_ENCRYPTION_KEY, CLAUDE_OAUTH_TOKEN
npm test               # 31 tests
npm run dev            # starts on PORT (default 8787)
```
