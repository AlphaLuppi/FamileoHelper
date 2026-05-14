# FamiliHelp — Design spec

**Date** : 2026-05-14
**Auteur** : brainstorming Toam + Claude
**Statut** : Draft pour revue
**Repo cible** : `Alphaluppi/FamileoHelper`

---

## 1. Vision & objectif

Application mobile qui scanne la pellicule du téléphone, propose automatiquement des posts Famileo (photos + texte), et les publie directement vers le pad Famileo de l'utilisateur après validation.

**Problème résolu** : la création de post Famileo est une corvée (sélection photos, montage, rédaction), ce qui fait que beaucoup de moments ne sont jamais partagés aux grands-parents.

**Promesse** : "Tu ouvres l'app, tu swipes oui/non sur 3 propositions, tu as posté pour ta famille en 30 secondes."

**Scope MVP** : usage perso (un seul utilisateur : Toam). Architecture compatible commercialisation future, mais pas de fonctionnalités multi-tenant au MVP.

---

## 2. Hypothèses & contraintes

### Hypothèses Famileo (à valider en Phase 0)
- L'API web `www.famileo.com` accepte la création de post (à confirmer via DevTools)
- L'auth reste un form login simple `POST /login` avec session cookie (validé par le konnector Cozy)
- Famileo gère le layout des photos dans la gazette → l'app n'a pas à fabriquer de collage

### Contraintes
- **CGU Famileo** : clause "usage non-commercial". MVP perso OK ; commercialisation = nécessite un partenariat officiel
- **reCAPTCHA Enterprise** sur les endpoints mobiles → on cible les endpoints web (`www.famileo.com`)
- **Privacy** : les photos ne quittent jamais le téléphone sauf pour aller à Famileo (pas envoyées au LLM)

---

## 3. Décisions de design validées

| # | Sujet | Décision |
|---|---|---|
| 1 | Forme | App mobile (pas extension) |
| 2 | Plateforme | iOS d'abord, Android plus tard (codebase unifiée) |
| 3 | Stack | **Expo SDK 52 + React Native + TypeScript + NativeWind** |
| 4 | Intégration Famileo | API reverse-engineered, posting auto direct (option A du brainstorming) |
| 5 | Groupage photos | (A) Clustering temps + GPS automatique **ET** (D) Mode manuel utilisateur |
| 6 | Génération texte | (B) IA via métadonnées (date/lieu/nb photos) **+** (D) Dictée vocale, **éditables** |
| 7 | Multi-pads | Sélecteur à l'envoi, dernier utilisé en défaut |
| 8 | Montage photo | Aucun côté app (Famileo s'en charge) |
| 9 | Cadence rappels | Notification unique mensuelle calée sur deadline gazette + ouverture manuelle |
| 10 | Architecture | App mobile **+ mini backend Node sur VPS Dokploy** (pas client-only à cause de Claude Max OAuth) |
| 11 | LLM | **Claude (via `claude -p` / Claude Agent SDK avec OAuth Max)** côté backend |
| 12 | Transcription | **Speech framework iOS natif** (on-device, gratuit) |
| 13 | Découverte API Famileo | DevTools Chrome sur `www.famileo.com` en Phase 0 ; développement avec mock en attendant |
| 14 | Famileo client | Côté backend (cookie session jamais sur le téléphone) |

---

## 4. Architecture

### 4.1 Vue d'ensemble

```
┌──────────────────────┐         ┌──────────────────────────┐         ┌────────────────────┐
│  iOS / Android       │         │  Backend Node (VPS       │         │  Services externes │
│  (Expo)              │         │  Dokploy)                │         │                    │
│                      │  HTTPS  │                          │         │ - Anthropic        │
│  - UI (NativeWind)   │ ──────▶ │  - Hono                  │ ──────▶ │   (via OAuth Max)  │
│  - Domain (cluster,  │  Bearer │  - FamileoClient         │         │ - www.famileo.com  │
│    selection)        │         │  - Caption service       │         │   (cookie session) │
│  - Services (photos, │         │  - Persisted sessions    │         │                    │
│    geo, speech)      │         │                          │         │                    │
│  - Local storage     │         │                          │         │                    │
│    (SQLite, Secure)  │         │                          │         │                    │
└──────────────────────┘         └──────────────────────────┘         └────────────────────┘
```

### 4.2 Modules app mobile

#### `domain/` (logique pure, aucun I/O)
| Module | Rôle | Entrée → Sortie |
|---|---|---|
| `clustering.ts` | Grouper photos en moments par fenêtre temporelle (~4h) + distance GPS (~500m) | `Photo[]` → `Moment[]` |
| `selection.ts` | Choisir 1-4 photos d'un moment (dédup quasi-identiques, qualité) | `Moment` → `Photo[]` |
| `proposal.ts` | Orchestre cluster + selection | `Photo[]` → `PostProposal[]` |
| `types.ts` | Types partagés `Photo`, `Moment`, `PostProposal`, `Pad` | — |

#### `services/`
| Module | Rôle |
|---|---|
| `photos/MediaLibraryService.ts` | Wrapper `expo-media-library` : `listSince(date)`, EXIF |
| `geo/GeocodingService.ts` | Reverse geocoding via `expo-location` (Apple, on-device) |
| `speech/SpeechService.ts` | Wrapper `expo-speech-recognition` (Speech iOS) |
| `backend/BackendClient.ts` | Client HTTP vers le backend : `generateCaption()`, `createPost()`, `gazetteDeadline()` |
| `notifications/NotificationService.ts` | Programmer rappel mensuel |

#### `state/`
| Store | Quoi | Tech |
|---|---|---|
| SecureStore | Bearer backend token | `expo-secure-store` |
| SQLite | `app_state`, `moment_decisions`, `pads_cache` | `expo-sqlite` |

#### `ui/`
| Écran | Rôle |
|---|---|
| `OnboardingScreen` | Saisie du bearer backend token (1ère fois) |
| `HomeScreen` | Tabs : Propositions / Manuel / Settings |
| `ProposalCard` | Carte d'un moment, actions reject / edit / dicter / send |
| `ManualPickerScreen` | Grille du mois, multi-select 1-4 photos |
| `EditTextSheet` | Bottom sheet texte avec bouton 🎤 |
| `SendSheet` | Sélecteur de pad + bouton "Envoyer" |
| `SettingsScreen` | Logout, change scan window, deadline reminder ON/OFF |

### 4.3 Modules backend

#### `app/`
| Module | Rôle |
|---|---|
| `server.ts` | Hono app, routes, middlewares (auth, logs) |
| `routes/caption.ts` | `POST /caption` : reçoit métadonnées, renvoie texte généré |
| `routes/post.ts` | `POST /post` : reçoit photos multipart + texte + padId, poste à Famileo |
| `routes/pads.ts` | `GET /pads` : liste les pads de l'utilisateur |
| `routes/gazette.ts` | `GET /gazette-deadline` : extrait la prochaine deadline |
| `auth/bearerAuth.ts` | Middleware Hono qui vérifie `Authorization: Bearer ...` |

#### `famileo/`
| Module | Rôle |
|---|---|
| `FamileoClient.ts` | Interface : `login`, `listPads`, `listGazettes`, `createPost` |
| `WebApiFamileoClient.ts` | Implémentation cookie-based (production) |
| `MockFamileoClient.ts` | Implémentation mémoire (tests + MVP avant Phase 0) |
| `session.ts` | Stockage chiffré du cookie (SQLite local au backend, AES-GCM) |

#### `llm/`
| Module | Rôle |
|---|---|
| `CaptionService.ts` | Construit le prompt à partir des métadonnées, appelle Claude |
| `claude.ts` | Wrapper Claude Agent SDK avec OAuth Max |

#### `infra/`
| Fichier | Rôle |
|---|---|
| `Dockerfile` | Image Node 22 alpine, copie le binaire `claude` si on shell-out |
| `dokploy.yml` | Config Dokploy (port, env vars, volumes pour SQLite) |
| `.env.example` | Variables documentées : `BACKEND_BEARER_TOKEN`, `FAMILEO_USERNAME`, `FAMILEO_PASSWORD`, `CLAUDE_OAUTH_TOKEN`, `SESSION_ENCRYPTION_KEY` |

---

## 5. Flux de données

### 5.1 Flow "propositions automatiques"
1. App scanne la pellicule depuis `last_post_at` (local SQLite)
2. App cluster localement par temps + GPS → `Moment[]`
3. Pour chaque moment : reverse-geocode GPS on-device
4. App envoie au backend `POST /caption` avec `{ date, city, photoCount, weekday }`
5. Backend appelle Claude (Haiku 4.5 via OAuth Max) → texte FR
6. App affiche la carte swipe avec le draft texte
7. User valide → app envoie `POST /post` (multipart : photos + texte + padId)
8. Backend appelle `FamileoClient.createPost()` → poste à Famileo
9. App met à jour `last_post_at` et `moment_decisions`

### 5.2 Flow "manuel"
Identique à partir de l'étape 3, mais la sélection des photos est manuelle (pas de clustering).

### 5.3 Flow "dictée vocale"
1. User tap 🎤 dans `EditTextSheet`
2. `expo-speech-recognition` transcrit on-device
3. (Optionnel) App envoie le texte transcrit à `POST /caption?mode=reformulate` pour polissage par Claude
4. Texte affiché dans la sheet, éditable, validable

### 5.4 Persistance locale (SQLite app)
```sql
CREATE TABLE app_state (
  key   TEXT PRIMARY KEY,
  value TEXT
);
-- 'last_post_at' : ISO timestamp de la photo la plus récente envoyée

CREATE TABLE moment_decisions (
  moment_hash TEXT PRIMARY KEY,  -- hash stable des photo IDs
  decision    TEXT,               -- 'posted' | 'rejected'
  decided_at  TEXT
);

CREATE TABLE pads_cache (
  pad_id      TEXT PRIMARY KEY,
  name        TEXT,
  last_used_at TEXT
);
```

### 5.5 Auth flows
- **App → Backend** : `Authorization: Bearer <BACKEND_TOKEN>` (1 token unique MVP, JWT plus tard)
- **Backend → Famileo** : cookie session stocké chiffré SQLite, refresh par re-login auto si 401
- **Backend → Anthropic** : OAuth Max tokens en var d'env Dokploy

---

## 6. Erreurs & edge cases

| Erreur | Détection | Comportement |
|---|---|---|
| Pas de réseau | `fetch` fail | Mode offline, retry à la prochaine ouverture |
| Backend down | Timeout 10s | Toast "service indisponible", on garde la sélection user |
| Claude OAuth expiré | 401 backend | Notif au dev pour régénérer ; fallback texte template |
| Famileo session expirée | Cookie rejected | Re-login auto, replay |
| Famileo a changé son API | HTTP inattendu | Fail safe : ne poste pas, message clair "Famileo a changé, MAJ requise", log |
| Photo absente entre scan et envoi | Asset null | Skip cette photo |
| Pellicule vide | Scan `[]` | UI "Rien de neuf depuis ton dernier post 👌" |
| Pas de GPS sur photos | EXIF null | Clustering par temps seul, caption sans ville |
| User sélectionne >4 photos en manuel | Compteur UI | Bouton Envoyer désactivé |
| Texte vide | `text.trim() === ""` | Bouton Envoyer désactivé |
| Photo déjà envoyée re-sélectionnée en manuel | `moment_decisions` lookup | Warning "déjà envoyée le X, confirmer ?" |

---

## 7. Sécurité

- **Token Dokploy** partagé en clair en chat → considéré compromis, à **régénérer immédiatement**
- **Mot de passe Famileo** : jamais loggué, jamais en clair côté backend. Cookie de session chiffré AES-GCM avec clé en var d'env (`SESSION_ENCRYPTION_KEY`)
- **OAuth Claude Max** : tokens en Dokploy secrets, jamais commit
- **Bearer backend** : généré au déploiement, stocké en `SecureStore` côté app
- **HTTPS only** : sous-domaine Cloudflare + certif Traefik via Dokploy
- **Logs backend** : redaction automatique des champs sensibles (password, token, cookie)

---

## 8. Testing strategy

- **Domain** : unit tests Vitest, 100% sur logique pure (`clustering`, `selection`, `proposal`). Fixtures EXIF mockées.
- **Services app** : intégration avec mocks (`MockBackendClient`, etc.)
- **Backend** : E2E Hono test client + `MockFamileoClient`. `WebApiFamileoClient` aura ses propres tests après Phase 0.
- **App UI** : pas de tests UI au MVP. Detox/Maestro le jour de la commercialisation.

---

## 9. Phasing & livrables

### Phase 0 — API discovery (à faire par Toam, ~30 min)
- Login `www.famileo.com` dans Chrome
- DevTools Network → faire un post test avec 2 photos
- Sauver HAR + documenter dans `docs/famileo-api-notes.md` : endpoints, body shape, headers
- **Bloque** : implémentation `WebApiFamileoClient`. **Ne bloque pas** : tout le reste (on développe avec `MockFamileoClient`)

### Phase 1 — Backend MVP
- Hono + auth bearer + route `/caption` (Claude OAuth)
- `MockFamileoClient` + routes `/pads`, `/post`, `/gazette-deadline`
- Dockerfile + déploiement Dokploy
- DNS sous-domaine

### Phase 2 — App mobile MVP
- Expo init + NativeWind setup
- Domain layer (clustering, selection, proposal) + tests
- Services (MediaLibrary, Geocoding, Speech, BackendClient)
- Écrans : Onboarding, Home (Propositions + Manuel), EditTextSheet, SendSheet, Settings
- Notifications mensuelles

### Phase 3 — Intégration Famileo réelle
- `WebApiFamileoClient` basé sur les notes de Phase 0
- Tests d'intégration
- Bascule depuis le mock

### Phase 4 — Polish perso
- Robustesse : retry, re-login session, monitoring d'erreurs
- Tests end-to-end manuels sur 2-3 posts réels
- Iteration UX sur la base de l'usage réel

---

## 10. YAGNI — explicitement hors scope MVP

- Multi-utilisateurs / multi-tenant
- Backend scale-out / serverless
- Apple Live Activities, widgets
- Mode offline complet avec sync
- Détection faciale / IA vision sur photos
- Tests de charge
- Internationalisation (FR uniquement)
- Android (vient gratuitement avec Expo, plus tard)

---

## 11. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Famileo change son API | Posts bloqués | Code isolé dans 1 module ; monitoring erreurs ; alerte si X% d'échecs |
| Famileo CGU / cease & desist | Projet bloqué | Strictement perso MVP ; contact `contact@famileo.com` avant toute distribution |
| Claude OAuth tokens rotation | Caption indisponible | Doc régénération + fallback texte template |
| reCAPTCHA web Famileo activé | Login impossible | Plan B : Phase 0 vérifie ; si activé → mitmproxy sur app mobile (Phase 0bis) |
| Token Dokploy fuité | Accès VPS compromis | Régénération immédiate par Toam |

---

## 12. Décisions ouvertes / à valider plus tard

- Format exact du body `POST /api/.../post` côté Famileo : **à découvrir Phase 0**
- Quel modèle Claude exact pour le caption (Haiku 4.5 par défaut ; tester aussi Sonnet 4.6 pour qualité) : **A/B testing en Phase 4**
- Domaine final (sous-domaine de quel apex) : **à choisir avant Phase 1**
