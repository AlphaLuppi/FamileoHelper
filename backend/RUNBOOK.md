# FamileoHelper Backend Runbook

## Live URL
- Production: `https://famileohelper.toam.tech` (Let's Encrypt, auto-renewed by Traefik)
- VPS: `187.124.217.58` (Dokploy at `http://187.124.217.58:3000`)
- Dokploy project: `familieohelper` / app: `familieohelper-backend`

## Deploy
Dokploy auto-deploys on push to `main` of `AlphaLuppi/FamileoHelper` (build context: `backend/`).

## Env vars (all secrets)
- `BACKEND_BEARER_TOKEN` — the mobile app authenticates with `Authorization: Bearer <this>`. Generate: `openssl rand -hex 32`.
- `SESSION_ENCRYPTION_KEY` — 32 bytes base64. Encrypts the Famileo cookie session at rest. Generate: `openssl rand -base64 32`.
- `CLAUDE_OAUTH_TOKEN` — Claude Max OAuth token. Regenerate with `claude setup-token`.
- `FAMILEO_USERNAME`, `FAMILEO_PASSWORD` — Famileo credentials (only used when `USE_MOCK_FAMILEO=false`).
- `USE_MOCK_FAMILEO` — `true` while WebApiFamileoClient is not yet implemented.

Optional:
- `LOG_LEVEL` — `trace|debug|info|warn|error` (default `info`).
- `PORT` — default `8787`.
- `DATA_DIR` — default `/app/data` in the container.

## Endpoints

| Method | Path                       | Auth   | Body / Query                                                                 |
|--------|----------------------------|--------|------------------------------------------------------------------------------|
| GET    | `/health`                  | public | —                                                                            |
| GET    | `/pads`                    | bearer | —                                                                            |
| GET    | `/gazette-deadline`        | bearer | `?padId=…`                                                                   |
| POST   | `/caption`                 | bearer | JSON `{date, city?, photoCount, weekday}` ; query `?mode=reformulate` with `{transcribed}` |
| POST   | `/post`                    | bearer | multipart `padId`, `text`, `photos[]` (1-4 files, ≤15 MB each)               |

## Volumes
- `/app/data/backend.db` — SQLite, holds the Famileo session cookie (encrypted).

## Rotating tokens
- **Bearer**: generate a new value, update `BACKEND_BEARER_TOKEN` in Dokploy, restart the container, update SecureStore on the iOS app.
- **Claude OAuth**: run `claude setup-token` locally, paste the resulting token into Dokploy `CLAUDE_OAUTH_TOKEN`, restart.

## Famileo session expired
The backend re-logs in automatically on 401. If it loops, check `FAMILEO_USERNAME` / `FAMILEO_PASSWORD`. (Note: real login is wired in Plan 3 once `WebApiFamileoClient` lands — until then `USE_MOCK_FAMILEO=true`.)

## Deployment checklist (first time)
1. Push to GitHub `Alphaluppi/FamileoHelper` (create the repo if absent, then `git remote add origin git@github.com:Alphaluppi/FamileoHelper.git && git push -u origin main`).
2. In Dokploy UI, create a new Application:
   - Source: Git, repo `Alphaluppi/FamileoHelper`, branch `main`, build context `backend/`
   - Build type: Dockerfile
   - Port: `8787`
   - Health check: `GET /health`
   - Volume: `/app/data`
   - Domain: configure subdomain + SSL (Traefik / Cloudflare)
3. Set env vars (Step 1 list above). Generate `CLAUDE_OAUTH_TOKEN` via `claude setup-token` on a machine where `claude` is logged in.
4. Trigger deploy. Verify with:
   ```bash
   DOMAIN=familieohelper.<your-domain>
   TOKEN=<BACKEND_BEARER_TOKEN>
   curl -sf https://$DOMAIN/health
   curl -sf -H "Authorization: Bearer $TOKEN" https://$DOMAIN/pads
   curl -sf -H "Authorization: Bearer $TOKEN" -X POST https://$DOMAIN/caption \
     -H "Content-Type: application/json" \
     -d '{"date":"2026-05-10","city":"Lyon","photoCount":2,"weekday":"dimanche"}'
   ```
