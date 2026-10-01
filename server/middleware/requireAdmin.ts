import type { RequestHandler, Response } from "express";
import { AppError } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { ADMIN_COOKIE, clearAdminCookie, readCookie } from "../lib/cookies";
import { findSession, type AdminSession } from "../services/adminAuth.service";

/**
 * Requires a signed-in, active admin team member.
 * Until a temporary password is changed, only the account endpoints are allowed.
 */
export function requireAdmin(options: { allowPasswordChangePending?: boolean } = {}): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const token = readCookie(req, ADMIN_COOKIE);
    const session = token ? await findSession(token) : null;
    if (!session) {
      if (token) clearAdminCookie(res);
      throw new AppError(401, "ADMIN_SESSION_INVALID", "Sesi admin sudah berakhir. Silakan masuk kembali.");
    }
    if (session.user.mustChangePassword && !options.allowPasswordChangePending) {
      throw new AppError(403, "PASSWORD_CHANGE_REQUIRED", "Ganti password sementara Anda terlebih dahulu.");
    }
    res.locals.admin = session;
    next();
  });
}

/** Must run after requireAdmin(). */
export const requireSuperAdmin: RequestHandler = (_req, res, next) => {
  if (getAdmin(res).user.role !== "super_admin") {
    throw new AppError(403, "FORBIDDEN", "Hanya super admin yang dapat melakukan tindakan ini.");
  }
  next();
};

export function getAdmin(res: Response): AdminSession {
  return res.locals.admin as AdminSession;
}
