import express, { type Express } from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  // Behind Nginx set TRUST_PROXY=1 so rate limiting sees the real client IP.
  app.set("trust proxy", env.trustProxy);

  // API payloads are small; question drafts never reach the server (SEC-05).
  // Exception: admin order creation carries a proof-of-payment file (max 5 MB, base64 ≈ 6.7 MB).
  app.use("/api/super-admin/orders", express.json({ limit: "7mb" }));
  app.use("/api", express.json({ limit: "100kb" }));

  app.use("/api", apiRouter);
  app.use("/api", errorHandler);

  return app;
}
