# SIAPAJAR Database Design

## 1. Database

PostgreSQL is the server-side database for MVP data that requires persistence beyond the browser.

- Local development: PostgreSQL 17 via `docker-compose.yml` (see `DEVELOPMENT.md` §15a).
- Production: PostgreSQL on the VPS, not exposed to the public internet.

The database is not the source of truth for the active question draft in MVP (ADR-002).

**ERD:** [`docs/ERD.dbml`](ERD.dbml) is the diagram source. Paste it into https://dbdiagram.io/d to view it. Keep that file and this document in sync.

Status: implemented. Migrations `server/db/migrations/001_initial_schema.sql` (core) and `002_admin_panel.sql` (admin team); seeder `server/db/seed.ts` (plans Instan and Pro).

## 2. Overview

```
plans ──< orders ──── access_codes ──< sessions
  │                      │   ▲           │
  └──────────────────────┘   │           │
                         usage_logs ─────┘

users ──< user_sessions        (admin team)
users ──< audit_logs
users ──< orders.created_by, access_codes.created_by / disabled_by

system_settings (standalone key/value)
```

- `plans` 1 → N `orders`
- `plans` 1 → N `access_codes`
- `orders` 1 → 0..1 `access_codes` (one confirmed order provisions one code)
- `access_codes` 1 → N `sessions` (one per device/browser)
- `usage_logs` → optional `access_codes` and `sessions`

Conventions:

- Primary keys: `uuid` with `gen_random_uuid()` (built into PostgreSQL 13+), except `usage_logs` (`bigint` identity, high volume).
- Timestamps: `timestamptz`, stored in UTC. `created_at` / `updated_at` on mutable tables.
- Money: `integer` Rupiah (`price_idr`, `amount_idr`), no decimals.
- Enums: PostgreSQL enum types (`access_code_status`, `order_status`, `payment_method`, `usage_event_type`).
- `updated_at` is maintained by a `set_updated_at()` trigger.
- Applied migrations are recorded in `schema_migrations`.

## 3. Tables

### plans

Purpose: products shown on the pricing section of the landing page (PRD FR-P01). Source of truth for price and access duration, so neither is hard-coded in the frontend (PRD FR-H03).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| slug | varchar(50) unique | Stable identifier: `instan`, `pro` |
| name | varchar(100) | Display name |
| description | text null | Short description for the pricing card |
| price_idr | integer | **BELUM DIPUTUSKAN** |
| duration_days | integer | Access period after activation. **BELUM DIPUTUSKAN** |
| max_devices | integer null | Concurrent sessions per code; `NULL` = unlimited. MVP: `2` for all plans |
| is_active | boolean | Hidden from pricing when `false` |
| sort_order | integer | Display order |
| created_at, updated_at | timestamptz | |

### orders

Purpose: purchase records (PRD FR-P02, FR-P05). In MVP, an admin records the order in the admin panel (`/super-admin/pesanan/baru`, or the CLI as a fallback) after confirming a WhatsApp payment.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| plan_id | uuid FK → plans | |
| status | order_status | `pending` → `paid` → `fulfilled`, or `cancelled` |
| amount_idr | integer | Price snapshot at purchase time |
| payment_method | payment_method null | `bank_transfer` or `qris`. Null only for future automatic payments |
| payment_reference | varchar(100) null | Transfer/QRIS reference number, if any |
| payment_proof_path | varchar(255) null | Proof-of-payment file name inside `PAYMENT_PROOF_DIR` (see §4) |
| buyer_name | varchar(150) | Personal data. Never log it |
| buyer_whatsapp | varchar(20) | Personal data, international format (`62…`). Never log it or send it to Telegram |
| provider | varchar(50) null | Future automatic payment (e.g. `skaler`, PRD FR-P06) |
| provider_ref | varchar(150) null unique | Provider transaction/event id. The unique constraint makes webhook processing idempotent |
| note | text null | Admin note |
| paid_at, fulfilled_at | timestamptz null | `fulfilled_at` = code sent to buyer |
| created_at, updated_at | timestamptz | |

### access_codes

Purpose: access entitlement (PRD §18). Every buyer receives a different code.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code_hash | char(64) unique | See §4. The raw code is never stored (SEC-01) |
| code_hint | varchar(4) | Last 4 characters, so the admin can identify a code |
| plan_id | uuid FK → plans | |
| order_id | uuid FK → orders, null, unique | Null for codes created without an order (e.g. testing, gifts) |
| status | access_code_status | `unused`, `active`, `expired`, `disabled` |
| duration_days | integer | Copied from the plan at creation |
| max_devices | integer null | Copied from the plan at creation |
| activated_at | timestamptz null | Set on first successful use (PRD FR-H02) |
| expires_at | timestamptz null | `activated_at + duration_days` (PRD FR-H03) |
| disabled_at, disabled_reason | null | Set when admin disables the code |
| created_at, updated_at | timestamptz | |

Status flow:

```
unused ──activate──> active ──expires_at passes──> expired
   │                   │
   └────── admin ──────┴──────> disabled
```

`expired` may be written lazily: every check compares `expires_at` with the current time, so correctness does not depend on a background job.

Duration and device limit are **copied** from the plan so that changing a plan later does not change codes that were already sold.

### sessions

Purpose: temporary session after access-code activation (PRD §19).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| access_code_id | uuid FK → access_codes | |
| token_hash | char(64) unique | SHA-256 of the random session token |
| user_agent | varchar(255) null | Helps the admin recognise devices. No IP address is stored |
| created_at, last_seen_at | timestamptz | |
| expires_at | timestamptz | Never later than the code's `expires_at` |
| revoked_at | timestamptz null | Set on logout, or when the code is disabled |

A session is valid when: `revoked_at IS NULL`, `expires_at > now()`, and its access code is `active` with `expires_at > now()`.

Device limit (PRD FR-P04, ADR-014): on activation, valid sessions for the code are counted; if the count reaches `max_devices`, the least recently used sessions are revoked so the new device can sign in.

### usage_logs

Purpose: product usage/operational analytics (PRD §29).

| Column | Type | Notes |
|---|---|---|
| id | bigint identity PK | |
| event | usage_event_type | `access_activated`, `session_created`, `prompt_generated`, `output_parsed`, `export_word`, `export_print` |
| access_code_id | uuid FK null | |
| session_id | uuid FK null | |
| metadata | jsonb null | Small, non-sensitive context (e.g. question count). **Never** full question content |
| created_at | timestamptz | |

### system_settings

Purpose: server-side configuration that should not be hard-coded.

| Column | Type | Notes |
|---|---|---|
| key | varchar(100) PK | e.g. `admin_whatsapp`, `session_ttl_hours`, `maintenance_mode` |
| value | jsonb | |
| description | text null | |
| updated_at | timestamptz | |

Never store secrets (API keys, peppers, passwords) in this table; secrets belong in environment variables.

### users (admin team)

Purpose: accounts for the admin panel `/super-admin` (PRD FR-ADM, ADR-016). **Teachers never have accounts.** There is no registration.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | varchar(100) | |
| email | varchar(254) unique | Lowercase; used to sign in |
| password_hash | text | `scrypt$N$r$p$salt$hash` (Node built-in scrypt) |
| role | user_role | `super_admin` or `admin` |
| is_active | boolean | Inactive accounts cannot sign in; their sessions are revoked |
| must_change_password | boolean | `true` for new/reset accounts (temporary password) |
| last_login_at | timestamptz null | |
| created_by | uuid FK → users null | `NULL` = first super admin from the CLI |
| created_at, updated_at | timestamptz | |

At least one active `super_admin` must always exist (enforced in `adminUsers.service`).

### user_sessions

Purpose: admin sessions, separate from teacher `sessions`. Cookie `siapajar_admin` (`HttpOnly`, `SameSite=Strict`, `Path=/api/super-admin`), valid 8 hours. Columns mirror `sessions`: `token_hash`, `user_agent`, `last_seen_at`, `expires_at`, `revoked_at`.

### audit_logs

Purpose: who did what in the admin panel.

| Column | Type | Notes |
|---|---|---|
| id | bigint identity PK | |
| user_id | uuid FK → users null | `NULL` = action from the CLI |
| action | varchar(50) | `login`, `order.create`, `code.create_test`, `code.disable`, `code.regenerate`, `plan.update`, `settings.update`, `user.create`, `user.update`, `user.reset_password`, `user.change_password` |
| target_type, target_id | null | e.g. `order` + order id |
| metadata | jsonb null | Small context (code hint, reason, before/after). Never full codes or passwords |
| created_at | timestamptz | |

Also added by migration 002: `orders.created_by`, `access_codes.created_by`, `access_codes.disabled_by` (FK → users, `NULL` = CLI).

### Seed data

`npm run db:seed` only **adds missing** plans and the `admin_whatsapp` setting, so changes made in the admin panel are kept. `npm run db:seed -- --overwrite` resets them to the values in `server/db/seeds/plans.ts` and `ADMIN_WHATSAPP`.

Users: `npm run db:seed` (or `npm run db:seed:admin` for this step only) creates one `super_admin` from `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` in `.env` (`server/db/seeds/users.ts`). No email or password is stored in the repository. Without `SEED_ADMIN_PASSWORD`, a temporary password is printed once and `must_change_password = true`; with it (development only, refused when `NODE_ENV=production`), the given password is used. Existing emails are never modified. The creation is written to `audit_logs` with `metadata.source = "seeder"`.

## 4. Access Code and Session Security

Access code:

- Generated by the server with a cryptographically secure random generator (`crypto.randomBytes`).
- Format: `SPJR-XXXX-XXXX-XXXX` using an unambiguous alphabet (no `0/O`, `1/I/L`), about 60 bits of randomness. Easy to copy from WhatsApp.
- Stored as `HMAC-SHA256(normalized_code, ACCESS_CODE_PEPPER)` in hex. `ACCESS_CODE_PEPPER` is an environment variable, not in the database. A deterministic hash is used (instead of bcrypt) because the code must be looked up by its hash; the code's randomness plus rate limiting (SEC-04) makes guessing impractical.
- Shown only once, when the admin creates it.

Session:

- Token: 32 random bytes, sent only in an `HttpOnly`, `Secure` (production), `SameSite=Lax` cookie.
- Stored as SHA-256 of the token (`token_hash`).

Payment proof files:

- Copied by the admin CLI into `PAYMENT_PROOF_DIR` (default `storage/payment-proofs/`), named by order id.
- Allowed types: JPG, PNG, WEBP, PDF; max 5 MB.
- The folder is gitignored and never served over HTTP. Back it up together with the database.

## 5. What Is NOT in the MVP Database

The following are not required as persistent database entities for MVP:

- complete question drafts;
- question-bank history;
- teacher profiles or user accounts;
- Google accounts;
- collaborative workspaces;
- cloud document library.

These belong to later phases unless requirements change.

## 6. Migration Rules

- Every schema change must have a migration.
- Do not manually modify production tables without a tracked migration.
- Avoid destructive migrations unless explicitly planned.
- Update this document **and `ERD.dbml`** when a schema decision changes.

## 7. Security

- Database must not be publicly exposed (local Docker binds to `127.0.0.1` only).
- Credentials come from environment/secret management.
- Never commit database passwords.
- Logs must not expose database credentials, access codes, session tokens, or buyer personal data.
