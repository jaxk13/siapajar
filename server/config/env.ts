import dotenv from "dotenv";
import path from "path";

dotenv.config({ quiet: true });

function readPort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: "${value}"`);
  }
  return port;
}

const isProduction = process.env.NODE_ENV === "production";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  host: process.env.HOST || "0.0.0.0",
  port: readPort(process.env.PORT, 3000),
  // Set to the number of proxies in front of the app (1 behind Nginx) so req.ip is the client IP.
  trustProxy: Number(process.env.TRUST_PROXY || 0),
  databaseUrl: process.env.DATABASE_URL || "",
  accessCodePepper: process.env.ACCESS_CODE_PEPPER || "",
  paymentProofDir: path.resolve(process.env.PAYMENT_PROOF_DIR || "storage/payment-proofs"),
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
