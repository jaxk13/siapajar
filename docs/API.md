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

### Admin operations (CLI, not HTTP)

In MVP, the admin creates and manages access codes from the server with CLI commands (PRD FR-P03), not through an HTTP API:

- `npm run access:create -- --plan <slug> --name <buyer> --whatsapp <number> --method transfer|qris --proof <file> [--reference <ref>] [--note <text>]` — records a fulfilled order, stores the proof file, creates the code, and prints it once with a ready-to-send WhatsApp message.
- `npm run access:create -- --plan <slug> --test` — code without an order, for testing.
- `npm run access:list -- [--status unused|active|expired|disabled] [--limit 50]` — codes with status, plan, last 4 characters, buyer name, active devices, dates.
- `npm run access:disable -- <code | last 4 characters | id> [--reason <text>]` — disables the code and signs out all its sessions.

A web admin panel is not part of MVP.

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
