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

## Phase 1 — Access and Session

- [x] Access Code screen (UI at `/masuk`; uses a temporary client-side check until the Access Code API exists)
- [ ] Access Code API
- [ ] Access Code validation
- [ ] Access Code activation state
- [ ] Temporary session creation
- [ ] Session validation
- [ ] Session logout
- [ ] Protected endpoint middleware
- [ ] Rate limiting for sensitive access endpoints

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

## Phase 9 — PostgreSQL / Operations

- [ ] Database schema
- [ ] Migrations
- [ ] Access code persistence
- [ ] Session persistence if required by implementation
- [ ] Orders
- [ ] Usage logs
- [ ] System settings
- [ ] Operational status endpoint

## Phase 10 — Payment

- [ ] Payment provider integration
- [ ] Webhook verification
- [ ] Idempotent event handling
- [ ] Access code provisioning
- [ ] Payment error handling

The exact implementation must follow the provider's actual API/webhook capabilities.

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
