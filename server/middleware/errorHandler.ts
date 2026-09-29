import type { NextFunction, Request, Response } from "express";
import { AppError, sendError } from "../lib/apiResponse";

export function apiNotFound(_req: Request, res: Response): void {
  sendError(res, 404, "NOT_FOUND", "Layanan yang diminta tidak ditemukan.");
}

// Express identifies error middleware by its four-argument signature.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.status, err.code, err.message);
    return;
  }

  // Malformed JSON body or body over the size limit (thrown by express.json()).
  const status = (err as { status?: number })?.status;
  if (status === 400 || status === 413) {
    sendError(
      res,
      status,
      status === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST",
      status === 413 ? "Data yang dikirim terlalu besar." : "Permintaan tidak dapat dibaca."
    );
    return;
  }

  console.error("Unhandled server error:", err instanceof Error ? err.message : err);
  sendError(res, 500, "INTERNAL_ERROR", "Terjadi kendala pada server. Silakan coba beberapa saat lagi.");
}
