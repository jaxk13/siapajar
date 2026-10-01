// Admin team management (super admin only). There is no self-registration.
import { getPool, withTransaction } from "../db/pool";
import { AppError } from "../lib/apiResponse";
import { generateTemporaryPassword, hashPassword } from "../lib/password";
import { logAction } from "../repositories/audit.repository";
import * as users from "../repositories/users.repository";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: users.UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

function toPublic(row: users.UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    lastLoginAt: row.last_login_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listUsers(): Promise<PublicUser[]> {
  return (await users.list(getPool())).map(toPublic);
}

/** Creates an account with a temporary password that must be changed on first login. */
export async function createUser(
  data: { name: string; email: string; role: users.UserRole },
  createdBy: string | null
): Promise<{ user: PublicUser; temporaryPassword: string }> {
  const pool = getPool();
  if (await users.findByEmail(pool, data.email)) {
    throw new AppError(409, "EMAIL_TAKEN", "Email ini sudah dipakai oleh anggota tim lain.");
  }
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const row = await withTransaction(async (client) => {
    const created = await users.insert(client, { ...data, passwordHash, createdBy });
    await logAction(client, {
      userId: createdBy,
      action: "user.create",
      targetType: "user",
      targetId: created.id,
      metadata: { email: created.email, role: created.role },
    });
    return created;
  });
  return { user: toPublic(row), temporaryPassword };
}

export async function updateUser(
  id: string,
  data: { name: string; role: users.UserRole; isActive: boolean },
  actorId: string
): Promise<PublicUser> {
  return withTransaction(async (client) => {
    const existing = await users.findById(client, id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Anggota tim tidak ditemukan.");

    if (id === actorId && (!data.isActive || data.role !== existing.role)) {
      throw new AppError(400, "VALIDATION_ERROR", "Anda tidak dapat menonaktifkan atau mengubah peran akun Anda sendiri.");
    }
    const losesSuperAdmin = existing.role === "super_admin" && (data.role !== "super_admin" || !data.isActive);
    if (losesSuperAdmin && (await users.countActiveSuperAdmins(client, id)) === 0) {
      throw new AppError(400, "VALIDATION_ERROR", "Harus ada minimal satu super admin yang aktif.");
    }

    await users.update(client, id, data);
    if (!data.isActive) await users.revokeAllSessions(client, id);
    await logAction(client, {
      userId: actorId,
      action: "user.update",
      targetType: "user",
      targetId: id,
      metadata: { role: data.role, isActive: data.isActive },
    });
    return toPublic((await users.findById(client, id))!);
  });
}

/** Issues a new temporary password and signs the user out everywhere. */
export async function resetPassword(id: string, actorId: string | null): Promise<{ user: PublicUser; temporaryPassword: string }> {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  return withTransaction(async (client) => {
    const existing = await users.findById(client, id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Anggota tim tidak ditemukan.");
    await users.setPassword(client, id, passwordHash, true);
    await users.revokeAllSessions(client, id);
    await logAction(client, { userId: actorId, action: "user.reset_password", targetType: "user", targetId: id });
    return { user: toPublic((await users.findById(client, id))!), temporaryPassword };
  });
}

export async function findUserByEmail(email: string) {
  return users.findByEmail(getPool(), email.toLowerCase());
}
