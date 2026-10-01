import { randomBytes, randomUUID } from "node:crypto";

export function newId() {
  return randomUUID();
}

export function publicToken() {
  return randomBytes(24).toString("hex");
}

export function orderNumber(now = new Date()) {
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `G${year}${month}${day}-${suffix}`;
}
