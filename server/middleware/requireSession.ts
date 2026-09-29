import type { Response } from "express";
import { AppError } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { clearSessionCookie, readCookie, SESSION_COOKIE } from "../lib/cookies";
import { findActiveSession, type SessionInfo } from "../services/access.service";

/**
 * Protects an endpoint: requires a valid session whose access code is active and not expired (PRD §19).
 * The session is available to handlers via getSession(res).
 */
export const requireSession = asyncHandler(async (req, res, next) => {
  const token = readCookie(req, SESSION_COOKIE);
  const session = token ? await findActiveSession(token) : null;

  if (!session) {
    if (token) clearSessionCookie(res);
    throw new AppError(401, "SESSION_INVALID", "Sesi Anda sudah berakhir. Silakan masuk kembali dengan kode akses.");
  }

  res.locals.session = session;
  next();
});

export function getSession(res: Response): SessionInfo {
  return res.locals.session as SessionInfo;
}
