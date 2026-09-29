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
      "expiresAt": "..."
    }
  }
}

Invalid/expired/disabled code should return a clear user-facing error.

Sensitive endpoints must use rate limiting.

## 3. Session

### GET /api/session

Purpose:
Return current session status.

### POST /api/session/logout

Purpose:
Invalidate the current temporary session.

Session cookie requirements from the PRD:

- HttpOnly
- Secure in production
- SameSite

## 4. Payment

### POST /api/payment/webhook

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

### Existing Direct Gemini endpoints (pre-MVP, pending decision)

`GET /api/gemini/status` and `POST /api/gemini/generate-questions` exist from the initial prototype and are used by the "Jalankan AI" screen.
They do not follow the standard envelope, and they are not part of the MVP contract.
They are isolated in `server/{routes,controllers,services}/gemini.*` and should be removed or replaced by `/api/ai/generate` once a decision is made.

## 8. API Change Rules

Before changing an existing API:
1. identify frontend consumers;
2. update this contract;
3. update implementation;
4. update affected tests;
5. report the breaking/non-breaking nature of the change.

Do not silently change request/response shapes.
