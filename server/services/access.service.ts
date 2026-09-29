// Access code activation and sessions (PRD §18–19, docs/API.md §2–3).
import { getPool, withTransaction } from "../db/pool";
import { generateSessionToken, hashAccessCode, hashSessionToken, normalizeAccessCode } from "../lib/accessCode";
import * as accessCodes from "../repositories/accessCodes.repository";
import { findPlanById } from "../repositories/plans.repository";
import * as sessions from "../repositories/sessions.repository";
import { logUsage } from "../repositories/support.repository";

export interface SessionInfo {
  sessionId: string;
  accessCodeId: string;
  expiresAt: Date;
  plan: { slug: string; name: string };
}

export type ActivationResult =
  | { ok: true; token: string; session: SessionInfo; signedOutSessions: number }
  | { ok: false; reason: "invalid" };

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export async function activateAccessCode(rawCode: string, userAgent: string | null): Promise<ActivationResult> {
  const normalized = normalizeAccessCode(rawCode);
  if (!normalized) return { ok: false, reason: "invalid" };
  const codeHash = hashAccessCode(normalized);

  return withTransaction(async (client) => {
    let code = await accessCodes.findByHashForUpdate(client, codeHash);
    if (!code || code.status === "disabled" || code.status === "expired") {
      return { ok: false, reason: "invalid" } as const;
    }

    const firstActivation = code.status === "unused";
    if (firstActivation) {
      code = await accessCodes.activate(client, code.id);
    } else if (!code.expires_at || code.expires_at <= new Date()) {
      await accessCodes.markExpired(client, code.id);
      return { ok: false, reason: "invalid" } as const;
    }
    const expiresAt = code.expires_at!;

    // Device limit (PRD FR-P04): keep at most max_devices sessions, signing out the least recently used.
    let signedOutSessions = 0;
    if (code.max_devices !== null) {
      const existing = await sessions.listValidIdsForCode(client, code.id);
      const excess = existing.length - code.max_devices + 1;
      if (excess > 0) {
        await sessions.revokeByIds(client, existing.slice(0, excess));
        signedOutSessions = excess;
      }
    }

    const token = generateSessionToken();
    const session = await sessions.insert(client, {
      accessCodeId: code.id,
      tokenHash: hashSessionToken(token),
      userAgent: userAgent ? userAgent.slice(0, 255) : null,
      expiresAt,
    });

    if (firstActivation) {
      await logUsage(client, { event: "access_activated", accessCodeId: code.id });
    }
    await logUsage(client, { event: "session_created", accessCodeId: code.id, sessionId: session.id });

    const plan = await findPlanById(client, code.plan_id);
    return {
      ok: true,
      token,
      signedOutSessions,
      session: {
        sessionId: session.id,
        accessCodeId: code.id,
        expiresAt,
        plan: { slug: plan!.slug, name: plan!.name },
      },
    } as const;
  });
}

/** Returns the session for a cookie token, or null if the session or its access code is no longer valid. */
export async function findActiveSession(token: string): Promise<SessionInfo | null> {
  const pool = getPool();
  const row = await sessions.findValidByTokenHash(pool, hashSessionToken(token));
  if (!row) return null;

  if (Date.now() - row.last_seen_at.getTime() > TOUCH_INTERVAL_MS) {
    await sessions.touch(pool, row.id);
  }

  return {
    sessionId: row.id,
    accessCodeId: row.access_code_id,
    expiresAt: row.expires_at,
    plan: { slug: row.plan_slug, name: row.plan_name },
  };
}

export async function endSession(token: string): Promise<void> {
  await sessions.revokeByTokenHash(getPool(), hashSessionToken(token));
}
