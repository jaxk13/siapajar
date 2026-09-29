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
