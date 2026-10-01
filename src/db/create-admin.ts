import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { account, user } from "./schema";
import { newId } from "../lib/ids";
import { adminPasswordError } from "../lib/production";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "مديرة المتجر";
  const passwordProblem = adminPasswordError(password);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("ADMIN_EMAIL is required");
  }
  if (passwordProblem) throw new Error(passwordProblem);

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existing) {
    console.info("An account with that email already exists. No changes were made.");
    return;
  }

  const userId = newId();
  await db.insert(user).values({
    id: userId,
    name,
    email,
    emailVerified: true,
    role: "admin",
  });
  await db.insert(account).values({
    id: newId(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(password!),
  });
  console.info("Admin account created.");
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Could not create the admin";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
