# SIAPAJAR Architecture

## 1. Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- `@tailwindcss/vite`
- `@vitejs/plugin-react`

### Backend

- Node.js
- Express

### Database

- PostgreSQL

### Deployment

- Linux VPS (Ubuntu LTS)
- Caddy (HTTPS, reverse proxy) — ADR-018
- PM2
- PostgreSQL installed on the VPS
- Daily encrypted backup to Google Drive
- Step-by-step guide: `deploy/README.md`

## 2. High-Level Architecture

Internet
    ↓
Caddy
    ↓
React Frontend ↔ Express API
                    ↓
                PostgreSQL
                    ↓
                 Telegram

AI workflow:

React
  ↓
Prompt Builder
  ↓
External AI
  ↓
AI Output
  ↓
Parser
  ↓
Validator
  ↓
Normalized Question Data
  ↓
Question Editor
  ↓
Export

## 3. Architectural Boundaries

### Frontend

Responsible for:
- presentation;
- local draft state;
- form interaction;
- editor interaction;
- API consumption;
- browser-based print/PDF flow.

The frontend must not access PostgreSQL directly.

### Backend

Responsible for:
- access-code validation/activation;
- temporary sessions;
- server-side validation;
- usage logging;
- plans for the pricing section;
- admin panel API (`/api/super-admin`): admin team login, orders, access codes, plans, settings, team, audit log;
- automatic purchase (ADR-017): checkout via Midtrans Snap, payment notification (`/api/payment/webhook`), access code by email (SMTP), Meta Conversions API;
- system status;
- future provider/API orchestration.

### Domain/Services

Business rules should live outside React components and thin route handlers.

Core modules should include concepts such as:
- access;
- session;
- prompt;
- parsing;
- validation;
- questions;
- export;
- usage.

## 4. Suggested Repository Structure

src/
  components/
  features/
    access/
    assessment/
    prompt/
    import/
    editor/
    export/
  hooks/
  lib/
  types/
  styles/

server/
  routes/
  controllers/
  services/
  middleware/
  lib/
  types/

docs/

The exact structure may evolve, but responsibility boundaries must remain clear.

### Current structure (implemented)

src/
  components/ui/        reusable primitives (Button, Input, FormField, Alert, Badge, EmptyState, PageHeader, Container, Logo)
  components/layout/    MarketingHeader/Footer, AuthLayout, AppShell, SkipLink
  components/           existing workflow screens (PromptStep … DownloadStep)
  features/access/      access service (API calls) + AccessProvider
  features/import/      parser
  features/export/      Word export
  lib/router.tsx        minimal History API router
  lib/apiClient.ts      single API boundary (envelope handling, user-facing errors)
  pages/                LandingPage, AccessPage, AppPage, AppHome, NotFoundPage
  pages/admin/          admin panel pages + AdminRoutes (guards)
  features/admin/       admin API client, AdminProvider, shared admin components
  types/

server/
  index.ts              bootstrap (Vite middleware in dev, dist/ in production)
  app.ts                Express app + /api router + error handler
  config/env.ts         typed environment configuration
  routes/               URL + method → controller
  controllers/          request/response only
  services/             business logic (access, plans, admin operations)
  repositories/         SQL queries (data layer)
  middleware/           error handler, rate limit, requireSession
  lib/                  access-code hashing, cookies, WhatsApp helpers, API envelope
  db/                   pool, migrate.ts, seed.ts, migrations/*.sql, seeds/
  scripts/access-cli.ts admin CLI (create / list / disable access codes)

### Admin panel

The admin team works in `/super-admin` with its own login (table `users`, no registration), its own session cookie (`siapajar_admin`, `SameSite=Strict`, path `/api/super-admin`) and roles `super_admin` / `admin`. The admin API is `/api/super-admin/*` (`server/routes/superAdmin.ts`). Teacher access and admin access never share sessions.

### Frontend routes

| Path | Page | Access |
|---|---|---|
| `/` | Landing page | public |
| `/masuk` | Access code entry | public (redirects to `/app` when access is active) |
| `/pembayaran/selesai` | Payment result (polls `GET /api/checkout/:orderId`) | public |
| `/kebijakan-privasi` | Privacy notice | public |
| `/app` | Application home | requires access |
| `/app/parameter`, `/app/jalankan-ai`, `/app/impor`, `/app/editor`, `/app/kop`, `/app/export` | Existing workflow screens inside the app shell | requires access |
| `/super-admin/*` | Admin panel (orders, codes, plans, team, settings, activity) | admin team login (ADR-016) |
| anything else | Not found | public |

### Automatic purchase (ADR-017)

```
Landing (#harga) ─ CheckoutDialog ─ POST /api/checkout ─ pending order + Midtrans Snap token
        │                                                      │
        └─ Midtrans popup (snap.js) ── buyer pays ──> Midtrans ─┴─ POST /api/payment/webhook
                                                                    │ verify signature
                                                                    │ GET status from Midtrans API
                                                                    │ lock order → paid → new access code
                                                                    ├─ email (nodemailer → SMTP) → fulfilled
                                                                    └─ Meta Conversions API "Purchase"
/pembayaran/selesai polls GET /api/checkout/:orderId (which also asks Midtrans while pending)
```

Layers: `routes/payment.ts` → `controllers/payment.controller.ts` → `services/payment.service.ts` (flow) and `services/codeDelivery.service.ts` (email + resend) → `lib/midtrans.ts`, `lib/mailer.ts`, `lib/metaConversions.ts`, `emails/accessCodeEmail.ts`. The Meta Pixel (`src/features/tracking/`) loads on public pages only, never in `/app` or `/super-admin`.

Routing uses the History API without a router dependency. Express serves `index.html` for every non-`/api` path, so deep links and refresh work.

Access: `features/access/accessService.ts` calls `/api/access/activate`, `/api/session`, and `/api/session/logout` through `lib/apiClient.ts`. The session token lives only in an HttpOnly cookie; `AccessProvider` checks `GET /api/session` on load and the router shows a short loading state while checking.

## 5. Core Domain Concepts

At MVP level:

- AccessCode
- Session
- AssessmentParameters
- Question
- QuestionSet
- SchoolHeader
- Blueprint/KisiKisi
- AnswerKey
- UsageEvent
- Order

## 6. AI Architecture

MVP mode is External AI First.

The core editor must not depend on a particular AI provider.

Future provider abstraction may conceptually follow:

AIProvider
├── External
├── Gemini
├── OpenAI
└── Anthropic

Provider-specific implementation must remain isolated from:
- question editor;
- question model;
- export;
- school header;
- local draft storage.

Direct AI is a future capability, not an MVP dependency.

## 7. Parser Architecture

Parsing should be independent from UI.

Pipeline:

Raw AI Output
→ Parser
→ Structural Validation
→ Normalization
→ QuestionSet
→ Editor

Partial failure must be supported.

Example:
38 questions valid
2 questions invalid

The valid questions should remain available while invalid items are identified for correction.

## 8. Local-First Draft Architecture

The active assessment draft is primarily stored in browser storage for MVP.

Conceptual keys from the PRD:

- `siapajar_current_draft`
- `siapajar_school_header`
- `siapajar_preferences`

Autosave must not require a server request on every keystroke.

## 9. Database Boundary

PostgreSQL stores server-side data that is actually needed.

MVP core tables:

- plans
- access_codes
- sessions
- orders
- usage_logs
- system_settings

Admin panel tables (ADR-016):

- users (admin team only)
- user_sessions
- audit_logs

Draft question content is not required to be stored in PostgreSQL for MVP.

## 10. Security Boundary

Production:
- HTTPS;
- secure random session identifiers;
- appropriate hashing;
- rate limiting on sensitive endpoints;
- request-size limits;
- backend input validation;
- database not publicly exposed;
- secrets only in environment/secret management;
- no secrets in frontend bundles.

## 11. Deployment

Target:

Internet
→ HTTPS (Caddy, automatic Let's Encrypt certificates)
→ Node/Express + frontend (127.0.0.1:3000)
→ PostgreSQL 17 on the same VPS (localhost only)

PM2 manages the Node application process (one process: rate limits are in memory). `TRUST_PROXY=1` behind Caddy.

Deployment files live in `deploy/`: `Caddyfile`, `ecosystem.config.cjs` (PM2), `deploy.sh` (pull → install → migrate → build → reload → health check), `backup.sh` (daily `pg_dump` + payment proofs + `.env`, encrypted with `age`, uploaded to Google Drive with `rclone`; 14 daily and ~13 monthly copies). See `deploy/README.md` and ADR-018.

## 12. Performance

Editor interactions should remain local and responsive.

External AI latency is outside SIAPAJAR's direct control in the MVP external-AI workflow.

Avoid unnecessary network requests for local editor operations.
