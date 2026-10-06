import dotenv from "dotenv";
import path from "path";

dotenv.config({ quiet: true });

function readPort(value: string | undefined, fallback: number, name = "PORT"): number {
  if (!value) return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid ${name} value: "${value}"`);
  }
  return port;
}

const isProduction = process.env.NODE_ENV === "production";
const port = readPort(process.env.PORT, 3000);

function flag(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  host: process.env.HOST || "0.0.0.0",
  port,
  // Set to the number of proxies in front of the app (1 behind Nginx) so req.ip is the client IP.
  trustProxy: Number(process.env.TRUST_PROXY || 0),
  databaseUrl: process.env.DATABASE_URL || "",
  accessCodePepper: process.env.ACCESS_CODE_PEPPER || "",
  paymentProofDir: path.resolve(process.env.PAYMENT_PROOF_DIR || "storage/payment-proofs"),
  // Public base URL, used in emails and payment redirects. No trailing slash.
  appUrl: (process.env.APP_URL || `http://localhost:${port}`).replace(/\/+$/, ""),

  // Automatic payment (ADR-017). Empty server key = checkout disabled, the landing page falls back to WhatsApp.
  midtrans: {
    isProduction: flag(process.env.MIDTRANS_IS_PRODUCTION),
    serverKey: process.env.MIDTRANS_SERVER_KEY || "",
    clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
  },

  // Access code email. Empty SMTP_HOST = no email is sent (the delivery is recorded as "skipped").
  email: {
    from: process.env.EMAIL_FROM || "SIAPAJAR <no-reply@siapajar.id>",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: readPort(process.env.SMTP_PORT, 587, "SMTP_PORT"),
    smtpSecure: flag(process.env.SMTP_SECURE),
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
  },

  // Meta Pixel + Conversions API. Empty pixel id = no tracking at all.
  meta: {
    pixelId: process.env.META_PIXEL_ID || "",
    capiToken: process.env.META_CAPI_TOKEN || "",
    testEventCode: process.env.META_TEST_EVENT_CODE || "",
    graphVersion: process.env.META_GRAPH_VERSION || "v26.0",
  },
};

/** Throws a clear error when a variable required by a feature is missing. */
export function requireEnv(name: "databaseUrl" | "accessCodePepper"): string {
  const value = env[name];
  if (!value) {
    const envName = name === "databaseUrl" ? "DATABASE_URL" : "ACCESS_CODE_PEPPER";
    throw new Error(`${envName} is not set. See .env.example.`);
  }
  return value;
}
