import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema";
import { isAdminRole } from "./access";
import { auth } from "./auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const [row] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
  return row ?? null;
}

export async function requireUser() {
  const current = await getCurrentUser();
  if (!current || current.banned) {
    throw new Error("UNAUTHORIZED");
  }
  return current;
}

export async function requireAdminPage() {
  const current = await getCurrentUser();
  if (!current || current.banned || !isAdminRole(current.role)) {
    redirect("/");
  }
  return current;
}

export async function requireAdmin() {
  const current = await getCurrentUser();
  if (!current || current.banned) {
    throw new Error("UNAUTHORIZED");
  }
  if (!isAdminRole(current.role)) {
    throw new Error("FORBIDDEN");
  }
  return current;
}
