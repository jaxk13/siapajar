// Proof-of-payment files (PRD FR-P05). Stored privately in PAYMENT_PROOF_DIR, never served statically.
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { env } from "../config/env";

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

/** Detects the file type from its first bytes, so a renamed file cannot pretend to be an image. */
export function detectProofExtension(data: Buffer): string | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return ".jpg";
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
  if (data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP") return ".webp";
  if (data.length >= 5 && data.subarray(0, 5).toString("ascii") === "%PDF-") return ".pdf";
  return null;
}

/** Returns a problem message, or null when the file is acceptable. */
export function proofProblem(data: Buffer): string | null {
  if (data.length === 0) return "File bukti transaksi kosong.";
  if (data.length > PROOF_MAX_BYTES) return "Ukuran bukti transaksi maksimal 5 MB.";
  if (!detectProofExtension(data)) return "Bukti transaksi harus berupa foto (JPG, PNG, WEBP) atau PDF.";
  return null;
}

/** Saves the file as <orderId><ext> and returns the stored file name. */
export function saveProof(orderId: string, data: Buffer): string {
  const ext = detectProofExtension(data)!;
  mkdirSync(env.paymentProofDir, { recursive: true });
  const fileName = `${orderId}${ext}`;
  writeFileSync(path.join(env.paymentProofDir, fileName), data, { mode: 0o600 });
  return fileName;
}

export function removeProof(fileName: string): void {
  const filePath = resolveProofPath(fileName);
  if (filePath && existsSync(filePath)) unlinkSync(filePath);
}

/** Resolves a stored file name inside PAYMENT_PROOF_DIR, refusing anything that escapes the folder. */
export function resolveProofPath(fileName: string): string | null {
  const resolved = path.resolve(env.paymentProofDir, fileName);
  if (path.dirname(resolved) !== env.paymentProofDir) return null;
  return resolved;
}

export function proofContentType(fileName: string): string {
  return CONTENT_TYPES[path.extname(fileName).toLowerCase()] ?? "application/octet-stream";
}
