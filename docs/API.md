# SIAPAJAR API Contract

## 1. General Rules

Base path:

`/api`

API responses should use a consistent JSON structure.

Example success:

{
  "success": true,
  "data": {}
}

Example error:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan yang dapat dipahami pengguna."
  }
}

Do not expose stack traces or internal exception messages to users.

## 2. Access

### POST /api/access/activate

Status: implemented (Phase 1).

Purpose:
Validate and activate an access code and establish a temporary session.

Request:

{
  "code": "USER_PROVIDED_CODE"
}

Success:

{
  "success": true,
  "data": {
    "session": {
      "expiresAt": "2026-10-30T00:00:00.000Z",
      "plan": { "slug": "pro", "name": "Pro" },
      "signedOutOtherDevice": false
    }
  }
}

Input is normalized: case-insensitive, spaces/dashes and the `SPJR` prefix are optional.
`signedOutOtherDevice` is `true` when the device limit was reached and the least recently used session was signed out (PRD FR-P04, ADR-014).
The first successful use sets `activated_at` and `expires_at` on the code.

The session token is returned only as an `HttpOnly` cookie, never in the JSON body.

Errors (HTTP status, `error.code`, user-facing message):

| Status | Code | When | Message |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing/empty code | Masukkan kode akses terlebih dahulu. |
| 401 | `ACCESS_CODE_INVALID` | Unknown, expired, or disabled code | Kode akses tidak valid atau sudah kedaluwarsa. |
| 429 | `RATE_LIMITED` | Too many attempts | Terlalu banyak percobaan. Coba lagi beberapa menit lagi. |

Unknown, expired, and disabled codes intentionally share one response so the endpoint does not reveal which codes exist.

Sensitive endpoints must use rate limiting (PRD SEC-04). Current limit: 5 attempts per minute per IP (in-memory, single process), with a `Retry-After` header on `429`.

Note: PRD SEC-04 also names `POST /api/access/validate`. It is not planned: `GET /api/session` covers session checks. Remove it from the PRD if this is confirmed.

## 3. Session

### GET /api/session

Status: implemented (Phase 1). Uses the `requireSession` middleware, which also protects future endpoints.

Purpose:
Return current session status.

Success (active session):

{
  "success": true,
  "data": {
    "session": {
      "active": true,
      "expiresAt": "...",
      "plan": { "slug": "pro", "name": "Pro" }
    }
  }
}

No session, or session/code expired or disabled: `401` with `SESSION_INVALID` (message: "Sesi Anda sudah berakhir. Silakan masuk kembali dengan kode akses."). The frontend then redirects to `/masuk`.

### POST /api/session/logout

Status: implemented (Phase 1).

Purpose:
Invalidate the current temporary session. Always returns `{ "success": true, "data": {} }` and clears the cookie.

Session cookie requirements from the PRD:

- HttpOnly
- Secure in production
- SameSite

Implemented as cookie `siapajar_session`: `HttpOnly`, `Secure` when `NODE_ENV=production`, `SameSite=Lax`, `Path=/`, expiring with the access code.

## 4. Plans and Payment

### GET /api/plans

Status: implemented. Used by the pricing section (`#harga`) on the landing page.

Purpose:
Return active plans and the admin WhatsApp contact for the pricing section (PRD FR-P01, FR-P02). Public.

Success:

{
  "success": true,
  "data": {
    "plans": [
      {
        "slug": "pro",
        "name": "Pro",
        "description": "...",
        "priceIdr": 0,
        "durationDays": 30,
        "maxDevices": 2
      }
    ],
    "contact": {
      "whatsappNumber": "6281234567890",
      "whatsappUrl": "https://wa.me/6281234567890"
    }
  }
}

- Only plans with `is_active = true` are returned. Seeded plans are inactive until real prices are set.
- `contact` is `null` until `admin_whatsapp` is set (via `ADMIN_WHATSAPP` and `npm run db:seed`).
- The frontend adds the prefilled message (plan name) to `whatsappUrl`.

### Admin operations

The admin team uses the web panel (`/super-admin`, API below). The CLI remains for the first account and emergencies:

- `npm run user:create -- --name <name> --email <email> [--role super_admin|admin]` — create an admin account (temporary password shown once).
- `npm run user:reset-password -- --email <email>`
- `npm run access:create | access:list | access:disable` — same operations as the panel.

### POST /api/payment/webhook

Status: deferred (PRD FR-P06). Not part of MVP while payment is confirmed manually via WhatsApp.

Purpose:
Receive payment-provider events.

Requirements:
- verify provider authenticity;
- make processing idempotent;
- do not create duplicate access codes from repeated events;
- do not expose payment secrets in logs.

Provider-specific details should be documented when the actual provider integration is implemented.

## 4A. Admin Panel API (`/api/super-admin`)

Status: implemented (PRD FR-ADM, ADR-016). Same envelope as §1.

Security for every admin endpoint:

- Cookie `siapajar_admin`: `HttpOnly`, `Secure` in production, `SameSite=Strict`, `Path=/api/super-admin`, 8 hours.
- State-changing requests must be JSON and same-origin (`403 FORBIDDEN` otherwise).
- `401 ADMIN_SESSION_INVALID` when not signed in or the account is inactive.
- `403 PASSWORD_CHANGE_REQUIRED` until a temporary password is changed (only `/me` and `/me/password` are allowed).
- `403 FORBIDDEN` for super-admin-only endpoints when the role is `admin`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public, rate limited 5/min/IP | `{ email, password }` → user + cookie. Wrong email or password → `401 INVALID_CREDENTIALS` (same message for both) |
| POST | `/auth/logout` | any | Ends the admin session |
| GET | `/me` | signed in (password change allowed) | Current user |
| POST | `/me/password` | signed in (password change allowed) | `{ currentPassword, newPassword }`; min. 10 characters with letters and digits; signs out other devices |
| GET | `/overview` | admin | Orders today/month, revenue this month, active/unused/expiring codes, 5 recent orders |
| GET | `/orders?search=&page=` | admin | Search by buyer name, WhatsApp number, or last 4 code characters |
| POST | `/orders` | admin | `{ planId, buyerName, buyerWhatsapp, paymentMethod, paymentReference?, note?, proof: { dataBase64 } }` → `201 { issued }` (code shown once, WhatsApp message, buyer `wa.me` link). Proof: JPG/PNG/WEBP/PDF detected by content, max 5 MB (request limit 7 MB) |
| GET | `/orders/:id` | admin | Order, code, active devices |
| GET | `/orders/:id/proof` | admin | Proof file (`Cache-Control: private, no-store`) |
| GET | `/codes?status=&search=&page=` | admin | All codes including test codes |
| GET | `/codes/:id` | admin | Code and active devices |
| POST | `/codes/:id/regenerate` | admin | New secret for the same code; old code stops working, devices signed out, expiry kept → `{ issued }` |
| POST | `/codes/:id/disable` | admin | `{ reason }` (required); devices signed out |
| POST | `/codes/test` | super_admin | `{ planId }` → test code without an order |
| GET | `/plans` | admin | All plans, including inactive |
| PATCH | `/plans/:id` | super_admin | `{ name, description, priceIdr, durationDays, maxDevices, isActive }` |
| GET / PUT | `/settings` | super_admin | `{ adminWhatsapp }` (empty = hide) |
| GET / POST | `/users` | super_admin | List / create `{ name, email, role }` → temporary password shown once |
| PATCH | `/users/:id` | super_admin | `{ name, role, isActive }`; cannot change own role/status; at least one active super admin must remain |
| POST | `/users/:id/reset-password` | super_admin | New temporary password; user signed out everywhere |
| GET | `/activity?page=` | super_admin | Audit log |

Every state-changing action is written to `audit_logs`.

## 5. Usage

### POST /api/usage/event

Purpose:
Record permitted product usage events.

Initial event examples:
- access_activated
- session_created
- prompt_generated
- output_parsed
- export_word
- export_print

Avoid sending full question content as analytics data.

## 6. System

### GET /api/system/status

Purpose:
Operational/system status.

Status: implemented (Phase 0).

Success:

{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}

### GET /api/health

Pre-existing liveness check. Kept for compatibility; its response does not use the standard envelope:

{ "status": "ok", "service": "Siapajar.id Backend" }

### Unknown API routes

Any unknown `/api/*` path returns `404` with the standard error envelope (`NOT_FOUND`) instead of the frontend HTML.
Malformed JSON bodies return `400` (`BAD_REQUEST`); oversized bodies return `413` (`PAYLOAD_TOO_LARGE`).

Do not expose:
- secrets;
- database credentials;
- session tokens;
- internal infrastructure details that are not needed by the client.

## 7. Future AI Endpoint

### POST /api/ai/generate

This endpoint is NOT an MVP dependency.

If implemented later, it must remain separate from core editor logic and use the provider abstraction defined in `ARCHITECTURE.md`.

The earlier prototype endpoints `/api/gemini/status` and `/api/gemini/generate-questions` were removed, following PRD FR-C03.


## 8. API Change Rules

Before changing an existing API:
1. identify frontend consumers;
2. update this contract;
3. update implementation;
4. update affected tests;
5. report the breaking/non-breaking nature of the change.

Do not silently change request/response shapes.
