import type { RequestHandler } from "express";
import { sendError } from "../lib/apiResponse";

/**
 * Defence in depth against cross-site requests on the admin API (the admin cookie is also SameSite=Strict).
 * State-changing requests must be JSON and, when the browser sends an Origin, come from this host.
 */
export const sameOrigin: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();

  const origin = req.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      // invalid Origin header
    }
    if (originHost !== req.get("host")) {
      sendError(res, 403, "FORBIDDEN", "Permintaan ditolak.");
      return;
    }
  }

  if (!req.is("application/json") && req.headers["content-length"] !== "0" && req.headers["content-length"] !== undefined) {
    sendError(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Format permintaan tidak didukung.");
    return;
  }
  next();
};
