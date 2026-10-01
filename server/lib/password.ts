import { randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "crypto";

// scrypt is built into Node, so no password-hashing dependency is needed.
// Stored format: scrypt$N$r$p$saltBase64$hashBase64
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

export const MIN_PASSWORD_LENGTH = 10;

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Used to keep login timing similar whether or not the email exists. */
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

/** Temporary password for new or reset accounts, e.g. "kH7m-Qx2p-Rt9w". The user must change it on first login. */
export function generateTemporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const group = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  if (password.length > 200) return "Password terlalu panjang.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password harus berisi huruf dan angka.";
  return null;
}
