// Admin team login and sessions for /super-admin (ADR-016). No registration: accounts are created
// by a super admin in the panel, or the first one with `npm run user:create`.
import { getPool, withTransaction } from "../db/pool";
import { AppError } from "../lib/apiResponse";
import { generateSessionToken, hashSessionToken } from "../lib/accessCode";
import { getDummyHash, hashPassword, passwordProblem, verifyPassword } from "../lib/password";
import { logAction } from "../repositories/audit.repository";
import * as users from "../repositories/users.repository";

export const ADMIN_SESSION_HOURS = 8;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface AdminSession {
  sessionId: string;
  expiresAt: Date;
  user: { id: string; name: string; email: string; role: users.UserRole; mustChangePassword: boolean };
}

export async function login(
  email: string,
  password: string,
  userAgent: string | null
): Promise<{ token: string; session: AdminSession } | null> {
  const pool = getPool();
  const user = await users.findByEmail(pool, email.trim().toLowerCase());

  // Always run one password check so response time does not reveal whether the email exists.
  const valid = await verifyPassword(password, user?.password_hash ?? (await getDummyHash()));
  if (!user || !valid || !user.is_active) return null;

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000);
  const sessionId = await withTransaction(async (client) => {
    const id = await users.insertSession(client, {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      userAgent: userAgent ? userAgent.slice(0, 255) : null,
      expiresAt,
    });
    await users.markLogin(client, user.id);
    await logAction(client, { userId: user.id, action: "login", targetType: "user", targetId: user.id });
    return id;
  });

  return {
    token,
    session: {
      sessionId,
      expiresAt,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.must_change_password },
    },
  };
}

export async function findSession(token: string): Promise<AdminSession | null> {
  const pool = getPool();
  const row = await users.findValidSession(pool, hashSessionToken(token));
  if (!row) return null;
  if (Date.now() - row.last_seen_at.getTime() > TOUCH_INTERVAL_MS) {
    await users.touchSession(pool, row.session_id);
  }
  return {
    sessionId: row.session_id,
    expiresAt: row.expires_at,
    user: { id: row.user_id, name: row.name, email: row.email, role: row.role, mustChangePassword: row.must_change_password },
  };
}

export async function logout(token: string): Promise<void> {
  await users.revokeSessionByTokenHash(getPool(), hashSessionToken(token));
}

/** Changes the signed-in user's password and signs out their other devices. */
export async function changeOwnPassword(session: AdminSession, currentPassword: string, newPassword: string): Promise<void> {
  const pool = getPool();
  const user = await users.findById(pool, session.user.id);
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
    throw new AppError(400, "VALIDATION_ERROR", "Password saat ini salah.");
  }
  const problem = passwordProblem(newPassword);
  if (problem) throw new AppError(400, "VALIDATION_ERROR", problem);
  if (newPassword === currentPassword) {
    throw new AppError(400, "VALIDATION_ERROR", "Password baru harus berbeda dari password saat ini.");
  }

  const hash = await hashPassword(newPassword);
  await withTransaction(async (client) => {
    await users.setPassword(client, user.id, hash, false);
    await users.revokeAllSessions(client, user.id, session.sessionId);
    await logAction(client, { userId: user.id, action: "user.change_password", targetType: "user", targetId: user.id });
  });
}
