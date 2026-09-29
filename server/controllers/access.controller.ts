import type { Request, Response } from "express";
import { AppError, sendSuccess } from "../lib/apiResponse";
import { clearSessionCookie, readCookie, SESSION_COOKIE, setSessionCookie } from "../lib/cookies";
import { getSession } from "../middleware/requireSession";
import { activateAccessCode, endSession } from "../services/access.service";

export async function postActivate(req: Request, res: Response): Promise<void> {
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!code) {
    throw new AppError(400, "VALIDATION_ERROR", "Masukkan kode akses terlebih dahulu.");
  }
  if (code.length > 64) {
    throw new AppError(401, "ACCESS_CODE_INVALID", "Kode akses tidak valid atau sudah kedaluwarsa.");
  }

  const result = await activateAccessCode(code, req.get("user-agent") ?? null);
  if (!result.ok) {
    throw new AppError(401, "ACCESS_CODE_INVALID", "Kode akses tidak valid atau sudah kedaluwarsa.");
  }

  setSessionCookie(res, result.token, result.session.expiresAt);
  sendSuccess(res, {
    session: {
      expiresAt: result.session.expiresAt.toISOString(),
      plan: result.session.plan,
      signedOutOtherDevice: result.signedOutSessions > 0,
    },
  });
}

export async function getCurrentSession(_req: Request, res: Response): Promise<void> {
  const session = getSession(res);
  sendSuccess(res, {
    session: {
      active: true,
      expiresAt: session.expiresAt.toISOString(),
      plan: session.plan,
    },
  });
}

export async function postLogout(req: Request, res: Response): Promise<void> {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await endSession(token);
  clearSessionCookie(res);
  sendSuccess(res, {});
}
