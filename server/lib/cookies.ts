import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";

export const SESSION_COOKIE = "siapajar_session";
export const ADMIN_COOKIE = "siapajar_admin";

function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
  };
}

// Admin cookie: only sent to the admin API, never on cross-site requests.
function adminCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/api/super-admin",
  };
}

/** Reads one cookie without adding a cookie-parser dependency. */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions(), expires: expiresAt });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}

export function setAdminCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(ADMIN_COOKIE, token, { ...adminCookieOptions(), expires: expiresAt });
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(ADMIN_COOKIE, adminCookieOptions());
}
