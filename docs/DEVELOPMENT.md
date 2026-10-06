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
- `npm run db:migrate`, `npm run db:seed`
- `npm run access:create | access:list | access:disable`
- `npm run user:create | user:reset-password`

Runtime: Node `^20.19.0 || >=22.12.0` (declared in `package.json` `engines`). The server entry is `server/index.ts`; `npm start` sets `NODE_ENV=production`. Environment variables are read only through `server/config/env.ts` (see `.env.example`).

Do not claim verification that was not actually run.

## 15a. Local PostgreSQL (Development Only)

`docker-compose.yml` runs PostgreSQL for local development. Production uses PostgreSQL on the VPS, not this file.

1. `cp .env.example .env` and set `POSTGRES_PASSWORD` (and matching `DATABASE_URL`).
2. Start: `docker compose up -d`
3. Connect: `docker exec -it siapajar-postgres psql -U siapajar -d siapajar_dev`
4. Stop (keeps data): `docker compose down`
5. Reset (deletes local data): `docker compose down -v`

Mailpit (email catcher) starts too: SMTP `localhost:1025`, inbox http://localhost:8025. pgAdmin (database GUI) starts together with PostgreSQL at http://localhost:5050 (localhost only). Sign in with `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` from `.env`. The server "SIAPAJAR (local)" is pre-registered from `pgadmin/servers.json` (host `postgres`, port `5432`; inside Docker, not `localhost`). Run only the database with `docker compose up -d postgres`.

The port is bound to `127.0.0.1` only. Schema changes still require tracked migrations (`DATABASE.md` §6).

After the database is running:

6. Apply migrations: `npm run db:migrate` (safe to repeat)
7. Seed plans and settings: `npm run db:seed` (safe to repeat; only adds what is missing, so admin-panel edits are kept; `-- --overwrite` resets them)
8. Create the first super admin: set `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` in `.env` and run `npm run db:seed:admin` (or `npm run user:create -- --name "Nama" --email nama@contoh.id`), then sign in at `/super-admin/masuk`. `SEED_ADMIN_PASSWORD` is for local development only and is refused in production.
9. Create a test access code in the admin panel (Kode Akses → Buat kode uji) or `npm run access:create -- --plan pro --test`

New migrations go in `server/db/migrations/` as `NNN_description.sql`; never edit a migration that has already been applied.

## 15a-2. Payment, Email, and Meta in Development (ADR-017)

Everything runs in test mode locally: no real money, no email to real inboxes, no effect on ad statistics. Switching to production only changes `.env`.

| Service | Development | Production |
|---|---|---|
| Midtrans | Sandbox keys (`MIDTRANS_IS_PRODUCTION=false`), pay with the Midtrans payment simulator | Production keys after account verification |
| Email | Mailpit (`docker compose up -d`): SMTP `localhost:1025`, inbox http://localhost:8025 | SMTP of Resend/Brevo/…, sender domain with SPF/DKIM |
| Meta | `META_TEST_EVENT_CODE` set: server events only under Events Manager → Test Events | Test code empty |
| Webhook | Optional tunnel (`ngrok http 3000`) as Midtrans "Payment Notification URL" | `https://<domain>/api/payment/webhook` |

Without any Midtrans keys the landing page keeps "Beli via WhatsApp". Plans priced 0 cannot be checked out; set a price in the admin panel (Paket & Harga) for sandbox tests.

Without a tunnel, the result page `/pembayaran/selesai` still asks Midtrans for the status of a pending order, so a sandbox payment completes locally too.

Useful commands:

- `npm run payment:simulate -- --new --plan pro --email you@example.com` — checkout + payment without Midtrans: code, email (Mailpit), Meta Purchase (Test Events).
- `npm run payment:simulate` — list pending checkouts; `-- <orderId> [--result paid|expired|failed]` to apply a result.
- `npm run email:preview -- you@example.com` — sample access-code email.

Email artwork lives in `server/emails/assets/` (`logo.svg`, `hero.svg` are the sources; `logo.png`, `hero.jpg` are attached inline). Email HTML must use tables and inline styles; check new layouts in Mailpit on desktop and phone width.

## 15b. Logbook

Every change to the project gets a report in `Logbook/` (see `Logbook/README.md`):

- File name: `logbook-<nama-perubahan>-<nomor>.md`, e.g. `logbook-panel-admin-010.md`.
- Numbers are sequential across the whole folder (001, 002, …) and never reused.
- Use the template in `Logbook/README.md` and add the entry to its index table.

## 16. Git Hygiene

Keep commits/task changes focused.

Avoid mixing:
- feature implementation;
- unrelated formatting;
- unrelated dependency upgrades;
- unrelated refactors.

A reviewer should be able to understand why each changed file belongs to the task.
