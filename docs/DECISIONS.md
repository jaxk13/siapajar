# SIAPAJAR Decision Log

This document records decisions that should not be casually reversed.

## ADR-001 — External AI First

Status: Accepted

### Decision

MVP uses an external-AI workflow:

Copy Prompt
→ External AI
→ Generate
→ Copy Output
→ SIAPAJAR Import

### Reason

The PRD explicitly prioritizes:
- lower inference cost;
- lower provider dependency;
- lower rate-limit risk;
- lower backend complexity;
- faster market validation.

### Consequence

Direct AI generation is not an MVP dependency.

---

## ADR-002 — Local First Drafts

Status: Accepted

### Decision

Active question drafts are stored locally in the browser for MVP.

Conceptual keys:
- `siapajar_current_draft`
- `siapajar_school_header`
- `siapajar_preferences`

### Reason

The editor should remain responsive and should not require a server request for every edit.

### Consequence

PostgreSQL is not the source of truth for the active draft in MVP.

---

## ADR-003 — Temporary Access Instead of Full Accounts

Status: Accepted

### Decision

MVP uses Access Code + Temporary Session.

No:
- email/password registration;
- Google OAuth;
- password reset;
- user profile system.

### Reason

This keeps MVP focused on the core assessment workflow.

### Consequence

Account/cloud features remain deferred for teachers.

Admin team accounts for `/super-admin` (ADR-016) are separate and do not change this decision: teachers still never register or sign in with a password.

---

## ADR-004 — Teacher Review Is Mandatory

Status: Accepted

### Decision

AI-generated questions are drafts.

The teacher reviews and edits the result before final export.

### Reason

The product must not imply that generated academic content is automatically correct.

### Consequence

The editor and validation workflow are core product functionality, not optional polish.

---

## ADR-005 — Provider Independence

Status: Accepted

### Decision

The question editor and core assessment model must not depend on a specific AI provider.

Future provider implementations may include:
- External;
- Gemini;
- OpenAI;
- Anthropic.

### Consequence

Provider-specific code must remain isolated.

---

## ADR-006 — PostgreSQL for Server Data, Not Every Draft Edit

Status: Accepted

### Decision

PostgreSQL stores required server-side data:
- access codes;
- sessions where needed;
- orders;
- usage logs;
- system settings.

### Consequence

Do not introduce cloud draft persistence in MVP unless the product scope changes.

---

## ADR-007 — Desktop/Laptop First Editor

Status: Accepted

### Decision

Responsive design supports desktop, laptop, tablet, and mobile, with desktop/laptop as the primary editor experience.

### Reason

Long assessment documents are more comfortable to create and edit on larger screens.

---

## ADR-008 — Workflow Stability Over Feature Count

Status: Accepted

### Decision

When choosing between a new feature and a simpler/stabler workflow, preserve the main workflow:

INPUT
→ AI
→ STRUCTURED QUESTIONS
→ EDIT
→ EXPORT

### Consequence

A feature can be deferred if it makes the core teacher workflow more complex without clear MVP value.

---

## ADR-009 — Do Not Build Deferred Features Early

Status: Accepted

### Decision

Features listed outside MVP remain deferred.

### Consequence

Agents must not implement them proactively.

---

## ADR-010 — Documentation Is Part of the Architecture

Status: Accepted

### Decision

The project uses:
- PRD for product requirements;
- DESIGN for UI/UX;
- ARCHITECTURE for technical boundaries;
- DATABASE for persistence;
- API for contracts;
- DEVELOPMENT for coding rules;
- TASKS for implementation scope;
- DECISIONS for accepted choices;
- AGENTS/CLAUDE for coding-agent instructions.

### Consequence

Changes to architecture or contracts should update the relevant documentation.

---

## ADR-011 — Manual Purchase and Code Delivery via WhatsApp

Status: Accepted (PRD v2.1.0). The "no payment webhook" part is superseded by ADR-017; WhatsApp purchase remains the fallback.

### Decision

In MVP, a teacher buys a plan by contacting the admin on WhatsApp. After confirming payment, the admin creates a unique access code with a server CLI command and sends it via WhatsApp.

Automatic payment (Skaler webhook) is deferred (PRD FR-P06).

### Reason

- Faster launch and less integration risk (PRD §4.5 "Launch Fast").
- Market validation does not require automatic provisioning.

### Consequence

- No payment webhook in MVP. (The "no web admin panel" part was superseded by ADR-016.)
- `orders.provider_ref` stays in the schema so automatic payment can be added later without redesign.
- Open: WhatsApp number, payment method, whether buyer data is stored.

---

## ADR-012 — Plans Stored in the Database

Status: Accepted

### Decision

Plans (name, price, duration, device limit) live in the `plans` table and are served to the landing page via `GET /api/plans`. When a code is created, the plan's duration and device limit are copied onto the code.

### Reason

PRD FR-H03 forbids hard-coding durations in the frontend. One source of truth keeps the pricing section and the activation logic consistent. Copying values protects codes already sold from later plan changes.

### Consequence

Changing a price or duration is a data change, not a code deployment.

---

## ADR-013 — Access Code Hashing

Status: Accepted

### Decision

Access codes are stored as `HMAC-SHA256(code, ACCESS_CODE_PEPPER)`. Session tokens are stored as SHA-256. Raw values are never stored or logged.

### Reason

Codes must be looked up by hash on every activation, so a deterministic hash is required (bcrypt/argon2 cannot be looked up). Codes have about 60 bits of randomness and activation is rate limited, so brute force is impractical. The pepper lives outside the database, so a database leak alone does not reveal codes.

### Consequence

`ACCESS_CODE_PEPPER` must be set in every environment and must not change after codes are issued (changing it invalidates all existing codes).

---

## ADR-014 — Device Limit: Sign Out the Least Recently Used Session

Status: Accepted

### Decision

Each access code allows at most `max_devices` concurrent sessions (MVP: 2 for every plan). When the code signs in on another device, the least recently used session is revoked instead of rejecting the new login.

### Reason

- A teacher who changes or loses a device can always sign in again without contacting the admin.
- A code shared between several people keeps signing the others out, which discourages sharing without blocking the legitimate owner.

### Consequence

The login response reports `signedOutOtherDevice`. The limit is stored per plan and copied onto each code (ADR-012).

---

## ADR-015 — Direct Gemini Option Removed

Status: Accepted

### Decision

The prototype's "Generate Otomatis via API" (Gemini with SIAPAJAR's key) is removed from the UI and backend, together with `@google/genai`.

### Reason

PRD FR-C03 and ADR-001: Direct AI is not an MVP dependency. With paid access codes it would also make AI cost per teacher uncontrolled.

### Consequence

The MVP AI workflow is external AI only. Direct AI or BYOK can return later through `/api/ai/generate` and the provider abstraction.

---

## ADR-016 — Web Admin Panel for the Admin Team

Status: Accepted (PRD v2.2.0). Supersedes the "no web admin panel" part of ADR-011.

### Decision

A web admin panel at `/super-admin` replaces the CLI as the main tool for orders and access codes.

- Sign-in with email and password; **no registration**. Accounts live in the `users` table (admin team only).
- Roles: `super_admin` (everything, including team, plans, settings, activity) and `admin` (orders and codes).
- First super admin: `npm run user:create`. Afterwards, super admins add members in the panel.
- New or reset accounts get a temporary password that must be changed on first sign-in.
- Every admin action is written to `audit_logs`.

### Reason

The admin team serves buyers from phones, tablets, and laptops. The CLI requires SSH access to the server, which would also expose the database and secrets to every admin, and proof-of-payment files arrive on the phone.

### Consequence

- New tables: `users`, `user_sessions`, `audit_logs`; `created_by`/`disabled_by` columns on `orders` and `access_codes`.
- Admin sessions are separate from teacher sessions: cookie `siapajar_admin`, `SameSite=Strict`, path `/api/super-admin`, 8 hours.
- Passwords use Node's built-in `scrypt` (no new dependency).
- Plans and the admin WhatsApp number are edited in the panel; `npm run db:seed` no longer overwrites them unless `--overwrite` is passed.
- The CLI remains for the first account and emergencies.

---

## ADR-017 — Automatic Payment via Midtrans, Code Delivery by Email, Meta Ad Measurement

Status: Accepted (PRD v2.3.0, FR-P06, FR-P07). Supersedes the "no payment webhook" part of ADR-011 and the Skaler plan.

### Decision

- **Payment:** Midtrans Snap popup on the landing page. `POST /api/checkout` records a `pending` order (price from the server) and creates the Snap transaction. Midtrans calls `POST /api/payment/webhook`.
- **Trust:** a notification is accepted only when its `signature_key` (SHA-512 of order id, status code, amount, server key) is valid, and the outcome is always read again from the Midtrans status API. The browser never marks an order paid. The result page may also ask Midtrans for the status of a pending order (throttled), so development works without a public webhook URL.
- **Idempotency:** the order row is locked (`FOR UPDATE`) while it becomes `paid`; `access_codes.order_id` is unique and `orders.provider_ref` (Midtrans transaction id) is unique. Repeated or concurrent notifications produce one code.
- **Delivery:** the plain code is emailed right after the transaction commits (HTML email with inline images, SMTP via `nodemailer`). Each attempt is stored in `order_deliveries` without the code. A failed email leaves the order `paid`; the admin resends from the panel, which issues a new code (codes are stored hashed and cannot be re-sent).
- **Ad measurement:** Meta Pixel on public pages only, plus the Conversions API from the server for `InitiateCheckout` and `Purchase` with the same `event_id` as the browser event. Email and phone are SHA-256 hashed. IP and user agent are kept in `orders.attribution` only until the Purchase event is sent or the checkout closes. utm parameters and `fbclid` are stored per order for the admin panel.
- **Fallback:** with empty Midtrans keys the landing page keeps the WhatsApp purchase flow (FR-P02).

### Reason

- Buyers receive their code within seconds, without waiting for the admin.
- The admin panel already exists; one system keeps orders, codes, delivery status, and ad source together. Landing-page builders (Scalev, Konvert) were considered but either duplicate the panel or lack webhooks.
- Server-side events keep Purchase counts accurate when the Pixel is blocked.

### Consequence

- Migration `003_automatic_payment`: order statuses `expired` and `failed`; payment methods `virtual_account`, `e_wallet`, `card`, `other`; `orders.buyer_email`, `orders.attribution`; table `order_deliveries`.
- New dependency `nodemailer` (SMTP works with Mailpit locally and with any provider in production). Midtrans and Meta are called with `fetch` (no SDK).
- Local development uses Midtrans sandbox, Mailpit (docker-compose), Meta Test Events, and `npm run payment:simulate`.
- A privacy notice (`/kebijakan-privasi`) and a consent checkbox are required at checkout. The text needs a legal review before launch.
- Automatic WhatsApp delivery is not included; the admin can still send codes via WhatsApp manually.
- Refunds and chargebacks are handled manually (disable the code).

---

## ADR-018 — Deployment: Caddy, PM2, PostgreSQL on the VPS, Encrypted Daily Backup to Google Drive

Status: Accepted (PRD v2.3.1). Replaces Nginx in the earlier deployment target.

### Decision

- **Reverse proxy:** Caddy terminates HTTPS (automatic Let's Encrypt certificates) and proxies to Node on `127.0.0.1:3000`. `TRUST_PROXY=1`.
- **Process:** PM2, one process (`deploy/ecosystem.config.cjs`); in-memory rate limits require a single process.
- **Database:** PostgreSQL 17 installed on the VPS from the official PostgreSQL apt repository, listening on localhost only. Docker stays for local development.
- **Updates:** `deploy/deploy.sh` (pull → `npm ci` → migrate → build → reload → health check) on the branch checked out on the server.
- **Backup:** `deploy/backup.sh` daily at 02:30 WIB: `pg_dump` (custom format), payment-proof files and `.env`, archived and encrypted with `age` for a public key whose private key is kept offline, uploaded to Google Drive with `rclone` (scope `drive.file`). Retention: 3 days local, 14 days `daily/`, ~13 months `monthly/`. Optional healthchecks.io ping on success/failure.

### Reason

- Caddy needs no certbot or renewal cron and has a short configuration.
- One app and one database on one VPS: a native PostgreSQL has fewer moving parts, receives security updates through apt, and avoids Docker's published ports bypassing UFW.
- Backups hold personal data (UU PDP), so they are encrypted before leaving the server; an off-site copy (Google Drive) survives loss of the VPS. `.env` is included because losing `ACCESS_CODE_PEPPER` would invalidate every sold access code.

### Consequence

- New folder `deploy/` (`README.md`, `Caddyfile`, `ecosystem.config.cjs`, `deploy.sh`, `backup.sh`).
- Recovery point: up to 24 hours. Restore must be tested monthly (`deploy/README.md` §10.3).
- The `age` private key and `ACCESS_CODE_PEPPER` must be stored in a password manager; without them backups or codes cannot be recovered.
- Production `.env` sets `NODE_ENV=production`, so development CLIs (`payment:simulate`, `email:preview`) refuse to run there.

