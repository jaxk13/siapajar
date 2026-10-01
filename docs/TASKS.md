# SIAPAJAR Development Tasks

This document is the active implementation checklist.

## Phase 0 — Foundation

- [x] React/Vite project exists
- [x] Tailwind CSS configured
- [x] TypeScript configured
- [x] Confirm Node/runtime compatibility
- [x] Establish frontend directory structure
- [x] Establish Express server structure
- [x] Establish environment configuration
- [x] Add basic health/status endpoint
- [x] Confirm production build works

## Implementation Order Note

Phase 1 needs the database. Build **Phase 9A (database foundation)** before the Phase 1 API work.
Order: Phase 9A → Phase 1 → Phase 10 (pricing & manual purchase) → Phases 2–8 → rest of Phase 9 → Phase 11.

## Phase 9A — Database Foundation (before Phase 1)

- [x] ERD designed (`docs/ERD.dbml`, `docs/DATABASE.md`)
- [x] PostgreSQL driver (`pg`) and connection module
- [x] Migration runner and first migration (plans, orders, access_codes, sessions, usage_logs, system_settings)
- [x] Seeder for plans Instan and Pro (placeholder prices; inactive until real prices are set)
- [x] `ACCESS_CODE_PEPPER` environment variable

## Phase 1 — Access and Session

- [x] Access Code screen (`/masuk`)
- [x] Access Code API
- [x] Access Code validation
- [x] Access Code activation state
- [x] Temporary session creation
- [x] Session validation
- [x] Session logout
- [x] Protected endpoint middleware
- [x] Rate limiting for sensitive access endpoints
- [x] Device limit per code (max 2, least recently used session signed out; ADR-014)
- [x] Replace temporary client-side check in `src/features/access/accessService.ts`
- [x] Admin CLI: `access:create`, `access:list`, `access:disable` (PRD FR-P03)

## Phase 2 — Assessment Parameters

- [ ] Parameter page
- [ ] Education level
- [ ] Grade
- [ ] Subject
- [ ] Topic/material
- [ ] Assessment type
- [ ] Question types
- [ ] Question counts
- [ ] Difficulty
- [ ] Additional instructions
- [ ] Client-side validation
- [ ] Local draft state

## Phase 3 — Prompt Builder

- [ ] Assessment parameter model
- [ ] Prompt schema
- [ ] Prompt generator
- [ ] Structured prompt sections
- [ ] Prompt preview
- [ ] Copy prompt action
- [ ] User-friendly generation feedback

## Phase 4 — External AI Workflow

- [ ] External AI instructions screen
- [ ] Copy prompt flow
- [ ] Paste output flow
- [ ] Import screen
- [ ] Clear workflow transition between external AI and SIAPAJAR

Do NOT implement Direct AI as part of this phase.

## Phase 5 — Parser and Validation

- [ ] Parser module
- [ ] Normalized Question model
- [ ] Structural validator
- [ ] Question count validation
- [ ] Type validation
- [ ] Required-field validation
- [ ] Option validation
- [ ] Answer validation
- [ ] Duplicate ID detection
- [ ] Partial success handling
- [ ] Invalid-question correction flow

## Phase 6 — Question Editor

- [ ] Question Card
- [ ] Edit question
- [ ] Edit stimulus
- [ ] Edit options
- [ ] Edit answer
- [ ] Edit explanation
- [ ] Edit score
- [ ] Edit rubric
- [ ] Delete question
- [ ] Duplicate question
- [ ] Reorder questions
- [ ] Automatic numbering
- [ ] Type badges
- [ ] Cognitive-level badges
- [ ] Autosave
- [ ] Draft recovery

## Phase 7 — Assessment Supporting Documents

- [ ] Automatic kisi-kisi generation
- [ ] Editable kisi-kisi
- [ ] Answer key generation
- [ ] Editable answer key
- [ ] Rubric support
- [ ] School header builder
- [ ] Local school-header persistence

## Phase 8 — Export

- [ ] Word export
- [ ] Print/PDF layout
- [ ] A4
- [ ] F4
- [ ] One-column layout
- [ ] Two-column/economy layout
- [ ] Selectable document sections
- [ ] Export verification

## Phase 9 — PostgreSQL / Operations (remaining)

- [ ] Usage logs (`POST /api/usage/event`)
- [ ] System settings management
- [ ] Operational status endpoint includes database health

## Phase 10 — Pricing and Manual Purchase (PRD §21, ADR-011)

- [ ] Decide plan prices and durations (BELUM DIPUTUSKAN), then update `server/db/seeds/plans.ts` and set `isActive: true`
- [x] Device limit decided (2 per code)
- [x] Payment method decided (bank transfer and QRIS)
- [x] Admin WhatsApp number (set via `ADMIN_WHATSAPP` + `npm run db:seed`)
- [x] `GET /api/plans`
- [x] Pricing section on the landing page (`#harga`, data from `GET /api/plans`; shows a WhatsApp fallback while no plan is active)
- [x] "Beli via WhatsApp" button with prefilled message
- [x] Order recording via admin CLI (buyer name, WhatsApp, payment method, reference, proof file)

### Deferred: Automatic Payment (PRD FR-P06)

- [ ] Skaler integration
- [ ] Webhook verification
- [ ] Idempotent event handling (`orders.provider_ref` unique)
- [ ] Automatic access code provisioning

The exact implementation must follow the provider's actual API/webhook capabilities.

## Phase 10A — Admin Panel (`/super-admin`, PRD FR-ADM, ADR-016)

- [x] Migration `002_admin_panel` (users, user_sessions, audit_logs, created_by/disabled_by)
- [x] Admin login (email + password, no registration), 8-hour session, rate limiting, same-origin check
- [x] First super admin via CLI (`npm run user:create`), temporary password must be changed
- [x] Roles: super_admin and admin
- [x] Overview
- [x] Create order with proof-of-payment upload, issue code, send via WhatsApp
- [x] Order list, search, detail, proof viewer, active devices
- [x] Access code list, filter, regenerate, disable, test codes
- [x] Plans & prices, admin WhatsApp setting
- [x] Team management (create, role, deactivate, reset password)
- [x] Activity log
- [x] Responsive: phone, tablet, laptop

## Phase 11 — Telegram Monitoring

- [ ] Notification service
- [ ] New order event
- [ ] Access code created event
- [ ] Server error event
- [ ] Rate-limit event
- [ ] AI provider error event if applicable

Never send:
- API keys;
- session tokens;
- complete access codes;
- unnecessary sensitive data.

## MVP Exit Criteria

The MVP workflow must be executable end-to-end:

Access Code
→ Parameter
→ Generate Prompt
→ External AI
→ Import Output
→ Parse
→ Edit
→ Kisi-kisi
→ Answer Key
→ School Header
→ Word/PDF

No account system is required for MVP.

## Explicitly Deferred

Do not implement unless the scope is explicitly changed:

- complete user accounts;
- Google OAuth;
- forgot password;
- cloud document library;
- teacher collaboration;
- MGMP/KKG sharing;
- AI image generation;
- student exam-result analytics;
- LMS/Moodle integration;
- importing old Word documents;
- advanced AI audit;
- collaborative question bank;
- native mobile app;
- Google Form Builder.

## Task Rule

Only move one coherent task/feature group at a time.

Update this checklist when a task is completed.
