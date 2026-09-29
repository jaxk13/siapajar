import { createHash, createHmac, randomBytes, randomInt } from "crypto";
import { requireEnv } from "../config/env";

// 31 characters: no 0/O, 1/I/L, so codes copied from WhatsApp are hard to mistype.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const BODY_LENGTH = 12; // ~59 bits of randomness
const PREFIX = "SPJR";

/** Generates a new code, e.g. "SPJR-7K4M-Q9XD-2HTB". Shown to the admin once, never stored. */
export function generateAccessCode(): string {
  let body = "";
  for (let i = 0; i < BODY_LENGTH; i++) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${PREFIX}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;
}

/**
 * Reduces user input to the 12-character body: case-insensitive, ignores spaces,
 * dashes and the optional "SPJR" prefix. Returns null when it cannot be a valid code.
 */
export function normalizeAccessCode(input: string): string | null {
  let value = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (value.length === BODY_LENGTH + PREFIX.length && value.startsWith(PREFIX)) {
    value = value.slice(PREFIX.length);
  }
  if (value.length !== BODY_LENGTH) return null;
  for (const ch of value) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return value;
}

/** HMAC-SHA256 with a server-side pepper (docs/DECISIONS.md ADR-013). */
export function hashAccessCode(normalized: string): string {
  return createHmac("sha256", requireEnv("accessCodePepper")).update(normalized).digest("hex");
}

export function accessCodeHint(normalized: string): string {
  return normalized.slice(-4);
}

/** Random session token for the HttpOnly cookie. Only its SHA-256 is stored. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
