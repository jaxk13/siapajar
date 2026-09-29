import type { RequestHandler } from "express";
import { sendError } from "../lib/apiResponse";

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, in-memory rate limiter per client IP (PRD SEC-04).
 * Sufficient for a single Node process; a shared store is needed if the app runs as several processes.
 */
export function rateLimit(options: { windowMs: number; max: number }): RequestHandler {
  const hits = new Map<string, Window>();

  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [key, window] of hits) {
        if (window.resetAt <= now) hits.delete(key);
      }
    }

    const key = req.ip || "unknown";
    let window = hits.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + options.windowMs };
      hits.set(key, window);
    }
    window.count++;

    if (window.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((window.resetAt - now) / 1000));
      sendError(res, 429, "RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.");
      return;
    }
    next();
  };
}
