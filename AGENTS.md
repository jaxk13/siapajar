# SIAPAJAR Development Instructions

## 1. Purpose

SIAPAJAR.id is a web application that helps Indonesian teachers prepare structured assessment documents through a guided workflow.

The product workflow is:

INPUT → AI → STRUCTURED QUESTIONS → EDIT → EXPORT

The product is an orchestration/workflow layer, not merely an AI wrapper.

## 2. Source of Truth

Before changing code, read:

1. `docs/PRD.md` — product requirements and MVP scope
2. `docs/DESIGN.md` — UI/UX rules
3. `docs/ARCHITECTURE.md` — technical architecture
4. `docs/DATABASE.md` — database design
5. `docs/API.md` — API contracts
6. `docs/DEVELOPMENT.md` — coding rules
7. `docs/TASKS.md` — current implementation scope
8. `docs/DECISIONS.md` — accepted technical/product decisions

If these documents conflict, do not silently choose a solution. Report the conflict before making a broad architectural change.

## 3. Critical Product Rules

- MVP uses External AI First.
- Draft editing is Local First.
- Teacher review is required; AI output is a draft.
- Do not make Direct AI generation a core MVP dependency.
- Do not add account/authentication features that are explicitly outside MVP.
- Do not add features merely because they are common in SaaS products.
- Do not make the primary teacher workflow more complex.
- Do not store complete question drafts in PostgreSQL unless the product requirements are explicitly changed.

## 4. Scope Discipline

Work only on the requested task or the currently active task in `docs/TASKS.md`.

Do not:
- refactor unrelated files;
- redesign unrelated screens;
- introduce a new architecture;
- add dependencies without a concrete reason;
- implement roadmap features early;
- change requirements to make implementation easier.

If a task reveals a necessary requirement that is missing, explain it and propose a decision rather than silently expanding scope.

## 5. Architecture Rules

- React must not access PostgreSQL directly.
- Frontend communicates with backend through API boundaries.
- Routes/controllers should remain thin.
- Business logic belongs in services/domain modules.
- Parser, validator, prompt builder, and export logic remain separate concerns.
- Provider-specific AI logic must not leak into the question editor.
- Local draft state must remain usable without a request for every editor interaction.
- Secrets must never be exposed in frontend bundles.

## 6. UI Rules

Follow `docs/DESIGN.md`.

Do not redesign existing UI without being asked.

Prefer:
- clear hierarchy;
- familiar interactions;
- reusable components;
- explicit loading, empty, success, and error states;
- minimal cognitive load.

Avoid:
- unnecessary dashboards;
- excessive modals;
- decorative complexity;
- feature creep;
- UI that requires teachers to understand technical concepts.

## 7. Dependency Rules

Before adding an npm dependency:

1. Check whether existing code/dependencies already solve the problem.
2. Explain why a new dependency is required.
3. Prefer a maintained, focused dependency.
4. Avoid adding a package for a trivial utility.

Do not silently upgrade major framework versions.

## 8. Implementation Workflow

Use:

PLAN → APPROVAL → IMPLEMENT → VERIFY

For non-trivial tasks:

### PLAN
Identify:
- requirement;
- files likely to change;
- implementation steps;
- risks;
- verification steps.

### APPROVAL
Do not expand scope beyond the requested task.

### IMPLEMENT
Make the smallest coherent change.

### VERIFY
Run appropriate checks, preferably:
- typecheck/lint;
- build;
- relevant tests;
- manual verification for UI behavior.

Report:
- changed files;
- behavior implemented;
- verification performed;
- remaining issues.

## 9. Safety and Secrets

Never commit:
- API keys;
- access-code secrets;
- session tokens;
- database passwords;
- production credentials.

Use environment variables or appropriate secret management.

Logs must not contain secrets or sensitive tokens.

## 10. Definition of Done

A task is complete when:
- requested behavior is implemented;
- existing behavior is not unnecessarily broken;
- types/build checks pass where applicable;
- relevant errors are handled;
- no unrelated feature was introduced;
- documentation is updated if architecture/API/decision behavior changed.
