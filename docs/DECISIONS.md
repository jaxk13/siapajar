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

Account/cloud features remain deferred.

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

Status: Accepted (PRD v2.1.0)

### Decision

In MVP, a teacher buys a plan by contacting the admin on WhatsApp. After confirming payment, the admin creates a unique access code with a server CLI command and sends it via WhatsApp.

Automatic payment (Skaler webhook) is deferred (PRD FR-P06).

### Reason

- Faster launch and less integration risk (PRD §4.5 "Launch Fast").
- Market validation does not require automatic provisioning.

### Consequence

- No payment webhook or web admin panel in MVP.
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
