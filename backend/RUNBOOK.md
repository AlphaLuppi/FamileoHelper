# FamileoHelper Backend Runbook

## Live URL
- Production: `https://famileohelper.toam.tech` (Let's Encrypt, auto-renewed by Traefik)
- VPS: `187.124.217.58` (Dokploy at `http://187.124.217.58:3000`)
- Dokploy project: `familieohelper` / app: `familieohelper-backend`

## Deploy
Dokploy auto-deploys on push to `main` of `AlphaLuppi/FamileoHelper`.

**Build context** : la **racine du repo** (PAS `backend/`). Dockerfile : `./Dockerfile` (à la racine).
Le Dockerfile racine builde en multi-stage le bundle web Expo (`app/`) puis le backend, et copie le bundle dans `/app/public` (servi via `WEB_PUBLIC_DIR`).

Pour mettre à jour Dokploy après le passage à la web app :
- Settings de l'application → Build → "Build Path" : `./` (racine)
- Dockerfile path : `Dockerfile`
- Ajouter env var : `WEB_PUBLIC_DIR=/app/public` (déjà set par défaut dans le Dockerfile)
- Redéployer.

## Web app
Servie depuis le même backend. Routes :
- `/`, `/onboarding`, n'importe quelle route non-API → `index.html` (SPA fallback)
- `/_expo/...`, `/assets/...`, `/favicon.ico` → assets statiques
- API : voir tableau ci-dessous (toujours protégé par bearer)

Onboarding : le user entre l'URL backend (`https://famileohelper.toam.tech`) et le `BACKEND_BEARER_TOKEN` (le même que celui du mobile) ; stocké dans `localStorage`. Sur iPhone/Mac, le bouton "Choisir des photos" ouvre le picker système qui inclut iCloud Photos.

## Env vars (all secrets)
- `BACKEND_BEARER_TOKEN` — the mobile app authenticates with `Authorization: Bearer <this>`. Generate: `openssl rand -hex 32`.
- `SESSION_ENCRYPTION_KEY` — 32 bytes base64. Encrypts the Famileo cookie session at rest. Generate: `openssl rand -base64 32`.
- `CLAUDE_OAUTH_TOKEN` — Claude Max OAuth token. Regenerate with `claude setup-token`.
- `FAMILEO_USERNAME`, `FAMILEO_PASSWORD` — unused (web login blocked by reCAPTCHA Enterprise — see "Famileo session" below).
- `USE_MOCK_FAMILEO` — `false` in prod ; `true` only for local tests.

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
| GET    | `/admin/famileo-session`   | bearer | — (returns `{present}`)                                                      |
| POST   | `/admin/famileo-session`   | bearer | JSON `{cookies: "PHPSESSID=…; REMEMBERME=…"}`                                |

## Famileo session

Web login (`/login_check`) is gated by **Google reCAPTCHA Enterprise**, so the backend can't auto-login. The session cookie must be injected manually:

1. Open `https://www.famileo.com/connexion` in Chrome, log in.
2. DevTools → Application → Cookies → `www.famileo.com`. Copy the values of `PHPSESSID` and `REMEMBERME` (and anything else marked HttpOnly).
3. POST them to the backend:
   ```bash
   curl -X POST -H "Authorization: Bearer $BACKEND_BEARER_TOKEN" \
     -H "Content-Type: application/json" \
     https://famileohelper.toam.tech/admin/famileo-session \
     -d '{"cookies":"PHPSESSID=…; REMEMBERME=…"}'
   ```
4. The backend encrypts the cookie blob with `SESSION_ENCRYPTION_KEY` and writes it to `/app/data/backend.db`.

When Famileo invalidates the session (typically after weeks of inactivity, or password change), `/pads` and `/post` return 5xx with `FamileoSessionError` — repeat the steps above.

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
