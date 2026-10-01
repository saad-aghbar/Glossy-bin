const REQUIRED = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

export function productionConfigError(env: Record<string, string | undefined>) {
  if (env.NODE_ENV !== "production") return null;
  const missing = REQUIRED.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    return `Missing production configuration: ${missing.join(", ")}`;
  }
  let url: URL;
  try {
    url = new URL(env.BETTER_AUTH_URL!.trim());
  } catch {
    return "BETTER_AUTH_URL must be an https origin";
  }
  if (url.protocol !== "https:") return "BETTER_AUTH_URL must be an https origin";
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return "BETTER_AUTH_URL must not be localhost";
  }
  return null;
}

export function adminPasswordError(password: string | undefined) {
  if (!password || password.length < 16) return "ADMIN_PASSWORD must be at least 16 characters";
  if (password === "replace-with-a-long-password") return "ADMIN_PASSWORD must not be the example placeholder";
  return null;
}

export function assertDevSeed(nodeEnv: string | undefined) {
  if (nodeEnv === "production") {
    throw new Error("Refusing to seed in production. Use npm run db:admin to create the first admin.");
  }
}
