// Small request-body validators (no schema library needed for this API size).
// Every failure becomes a 400 with a user-facing Indonesian message.
import { AppError } from "./apiResponse";

type Body = Record<string, unknown>;

function fail(message: string): never {
  throw new AppError(400, "VALIDATION_ERROR", message);
}

export function asBody(value: unknown): Body {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Body) : {};
}

export function str(body: Body, key: string, label: string, options: { max: number; optional?: false }): string;
export function str(body: Body, key: string, label: string, options: { max: number; optional: true }): string | null;
export function str(body: Body, key: string, label: string, options: { max: number; optional?: boolean }): string | null {
  const raw = body[key];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    if (options.optional) return null;
    fail(`${label} wajib diisi.`);
  }
  if (value.length > options.max) fail(`${label} maksimal ${options.max} karakter.`);
  return value;
}

export function int(body: Body, key: string, label: string, options: { min: number; max: number; nullable?: boolean }): number | null {
  const raw = body[key];
  if ((raw === null || raw === "" || raw === undefined) && options.nullable) return null;
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(value)) fail(`${label} harus berupa bilangan bulat.`);
  if (value < options.min || value > options.max) fail(`${label} harus antara ${options.min} dan ${options.max}.`);
  return value;
}

export function bool(body: Body, key: string, label: string): boolean {
  const raw = body[key];
  if (typeof raw !== "boolean") fail(`${label} tidak valid.`);
  return raw;
}

export function oneOf<T extends string>(body: Body, key: string, label: string, allowed: readonly T[]): T {
  const raw = body[key];
  if (typeof raw !== "string" || !allowed.includes(raw as T)) fail(`${label} tidak valid.`);
  return raw as T;
}

export function email(body: Body, key: string): string {
  const value = str(body, key, "Email", { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail("Format email tidak valid.");
  return value;
}

export function uuidParam(value: string | undefined): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new AppError(404, "NOT_FOUND", "Data tidak ditemukan.");
  }
  return value;
}

export function page(query: unknown): { limit: number; offset: number } {
  const q = asBody(query);
  const pageNumber = Math.max(1, Math.min(10_000, Number(q.page) || 1));
  const limit = Math.max(1, Math.min(100, Number(q.limit) || 20));
  return { limit, offset: (pageNumber - 1) * limit };
}
