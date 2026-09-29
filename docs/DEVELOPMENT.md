# SIAPAJAR Development Rules

## 1. General

- Use TypeScript for application code.
- Keep modules focused.
- Prefer explicit, readable code over clever abstractions.
- Avoid premature abstraction.
- Avoid unnecessary duplication.
- Do not use `any` unless there is a documented reason.

## 2. React

Components should focus on presentation and interaction.

Move reusable logic into:
- hooks;
- services;
- utility/domain modules.

Avoid large components that contain:
- API implementation;
- parsing;
- validation;
- export generation;
- unrelated UI state.

## 3. State

Distinguish:
- UI state;
- form state;
- assessment draft state;
- server/session state.

The active assessment draft is local-first in MVP.

Do not send every editor change to the server.

## 4. API Calls

Do not scatter raw fetch/API calls throughout arbitrary components.

Prefer a small API client/service boundary.

Handle:
- loading;
- success;
- recoverable errors;
- session expiry.

## 5. Backend

Routes/controllers should be thin.

Preferred flow:

Route
→ Controller
→ Service
→ Domain/data layer

Validate request input at the backend boundary.

Do not trust frontend validation alone.

## 6. Parser

Parser responsibilities:
- interpret AI output;
- produce structured intermediate data;
- identify malformed sections.

Parser must not:
- render UI;
- write directly to React state;
- contain export formatting.

## 7. Validator

Validator responsibilities:
- required fields;
- question count;
- question type;
- options;
- answer;
- duplicate IDs;
- structural correctness.

Validation should support partial success.

## 8. Prompt Builder

Prompt Builder converts `AssessmentParameters` into the structured prompt described by the PRD.

Minimum conceptual sections:

- ROLE
- TASK
- EDUCATION LEVEL
- GRADE
- SUBJECT
- TOPIC
- ASSESSMENT TYPE
- QUESTION COMPOSITION
- DIFFICULTY
- HOTS REQUIREMENTS
- OUTPUT FORMAT
- VALIDATION RULES
- ADDITIONAL USER INSTRUCTIONS

Keep prompt generation separate from the UI.

## 9. Question Model

Minimum internal fields:

- id
- type
- question
- stimulus
- options
- answer
- explanation
- cognitive_level
- score

For essay questions, optionally:
- rubric

Do not use display numbering as the primary identity.

## 10. Export

Export should consume normalized question data.

Do not make the editor depend on Word/PDF-specific formatting.

Word export and browser print/PDF should be separate output adapters.

## 11. Error Handling

User-facing errors should be understandable.

Avoid exposing:

- `500 Internal Server Error`
- `ParserException`
- `JSON_SCHEMA_INVALID`

Prefer messages such as:

"Hasil AI belum dapat dibaca.

Periksa apakah seluruh hasil dari AI sudah disalin,
lalu coba proses kembali."

Technical details may be logged server-side when appropriate.

## 12. Local Storage

Use stable keys defined by the architecture/PRD.

Handle:
- malformed stored data;
- schema/version changes;
- storage unavailable;
- storage quota failures.

Do not crash the editor because an old local draft is malformed.

## 13. Security

Never:
- put API secrets in client code;
- log API keys;
- log session tokens;
- trust client-provided access status;
- expose database credentials.

Sensitive endpoints require rate limiting.

## 14. Testing

At minimum, test important pure logic:

- prompt generation;
- parsing;
- validation;
- question normalization;
- numbering/order behavior;
- access-code state transitions;
- export transformations where practical.

For UI, verify the affected workflow manually or with appropriate tests.

## 15. Build Verification

Before declaring a substantial task complete, run appropriate project checks.

Current package scripts include:
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run preview`
- `npm run clean`
- `npm run lint`

Runtime: Node `^20.19.0 || >=22.12.0` (declared in `package.json` `engines`). The server entry is `server/index.ts`; `npm start` sets `NODE_ENV=production`. Environment variables are read only through `server/config/env.ts` (see `.env.example`).

Do not claim verification that was not actually run.

## 15a. Local PostgreSQL (Development Only)

`docker-compose.dev.yml` runs PostgreSQL for local development. Production uses PostgreSQL on the VPS, not this file.

1. `cp .env.example .env` and set `POSTGRES_PASSWORD` (and matching `DATABASE_URL`).
2. Start: `docker compose -f docker-compose.dev.yml up -d`
3. Connect: `docker exec -it siapajar-postgres psql -U siapajar -d siapajar_dev`
4. Stop (keeps data): `docker compose -f docker-compose.dev.yml down`
5. Reset (deletes local data): `docker compose -f docker-compose.dev.yml down -v`

The port is bound to `127.0.0.1` only. Schema changes still require tracked migrations (`DATABASE.md` §6).

After the database is running:

6. Apply migrations: `npm run db:migrate` (safe to repeat)
7. Seed plans and settings: `npm run db:seed` (safe to repeat; updates plans by slug)
8. Create a test access code: `npm run access:create -- --plan pro --test`

New migrations go in `server/db/migrations/` as `NNN_description.sql`; never edit a migration that has already been applied.

## 16. Git Hygiene

Keep commits/task changes focused.

Avoid mixing:
- feature implementation;
- unrelated formatting;
- unrelated dependency upgrades;
- unrelated refactors.

A reviewer should be able to understand why each changed file belongs to the task.
