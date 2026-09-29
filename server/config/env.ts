import dotenv from "dotenv";

dotenv.config();

function readPort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: "${value}"`);
  }
  return port;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  host: process.env.HOST || "0.0.0.0",
  port: readPort(process.env.PORT, 3000),
  // Optional. Only used by the pre-existing Direct Gemini endpoint, which is not an MVP dependency.
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};
