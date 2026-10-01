import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { address } from "@/db/schema";

export async function updateOwnAddress(
  userId: string,
  addressId: string,
  values: {
    recipientName: string;
    phone: string;
    city: string;
    area: string;
    street: string;
    notes: string | null;
    isDefault: boolean;
  },
) {
  const updated = await db
    .update(address)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(address.id, addressId), eq(address.userId, userId)))
    .returning({ id: address.id });
  return updated.length === 1;
}

export async function deleteOwnAddress(userId: string, addressId: string) {
  const deleted = await db
    .delete(address)
    .where(and(eq(address.id, addressId), eq(address.userId, userId)))
    .returning({ id: address.id });
  return deleted.length === 1;
}
