import dotenv from "dotenv";

dotenv.config();

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return stripQuotes(value);
}

function optionalEnv(key: string, fallback = ""): string {
  const value = process.env[key];
  return value ? stripQuotes(value) : fallback;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DEV_AUTH: process.env.DEV_AUTH === "true",
  LLM_PROVIDER: optionalEnv("LLM_PROVIDER", "openrouter"),
  OPENAI_API_KEY: optionalEnv("OPENAI_API_KEY"),
  OPENAI_MODEL: optionalEnv("OPENAI_MODEL", "openai/gpt-4o-mini"),
  OPENAI_MODEL_GABARITO: optionalEnv("OPENAI_MODEL_GABARITO", "openai/gpt-4o"),
  TRAILHEAD_FETCH_TIMEOUT_MS: parseInt(process.env.TRAILHEAD_FETCH_TIMEOUT_MS ?? "15000", 10),
  TRAILHEAD_MAX_IMPORTS_PER_HOUR: parseInt(process.env.TRAILHEAD_MAX_IMPORTS_PER_HOUR ?? "10", 10),
  STRIPE_SECRET_KEY: optionalEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: optionalEnv("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_PRO_MONTHLY: optionalEnv("STRIPE_PRICE_PRO_MONTHLY"),
  STRIPE_PRICE_PRO_YEARLY: optionalEnv("STRIPE_PRICE_PRO_YEARLY"),
  isProduction: process.env.NODE_ENV === "production",
};

if (env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}
