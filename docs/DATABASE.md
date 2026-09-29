# SIAPAJAR Database Design

## 1. Database

PostgreSQL is the server-side database for MVP data that requires persistence beyond the browser.

The database is not the source of truth for the active question draft in MVP.

## 2. Core Tables

### access_codes

Purpose: access entitlement.

Suggested fields:

- id
- code_hash
- plan
- status
- activated_at
- expires_at
- created_at

Status values:

- unused
- active
- expired
- disabled

The raw access code should not be stored in plaintext when it is not required for provisioning.

### sessions

Purpose: temporary authenticated session after access-code activation.

Suggested fields:

- id
- access_code_id
- session/token hash or equivalent secure representation
- expires_at
- created_at

Session identifiers must be generated with a secure random generator.

### orders

Purpose: payment/order records.

The exact payment fields depend on the actual payment-provider integration.

Payment webhook processing must be idempotent so one payment event cannot create duplicate access codes.

### usage_logs

Purpose: product usage/operational analytics.

Initial events may include:

- access_activated
- session_created
- prompt_generated
- output_parsed
- export_word
- export_print

Do not store full question content unless a later product/privacy decision explicitly requires it.

### system_settings

Purpose: server-side configurable settings.

Examples may include:
- product configuration;
- duration configuration;
- operational flags.

Do not hard-code product duration logic into the frontend.

## 3. Relationships

Conceptually:

access_codes
    │
    └── sessions

orders
    │
    └── provisioning → access_codes

usage_logs
    └── references relevant access/session context as needed

## 4. What Is NOT in the MVP Database

The following are not required as persistent database entities for MVP:

- complete question drafts;
- question-bank history;
- teacher profiles;
- Google accounts;
- collaborative workspaces;
- cloud document library.

These belong to later phases unless requirements change.

## 5. Migration Rules

- Every schema change must have a migration.
- Do not manually modify production tables without a tracked migration.
- Avoid destructive migrations unless explicitly planned.
- Update this document when a schema decision changes.

## 6. Security

- Database must not be publicly exposed.
- Credentials come from environment/secret management.
- Never commit database passwords.
- Logs must not expose sensitive database credentials.
