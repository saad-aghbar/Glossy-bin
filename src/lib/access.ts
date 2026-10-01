export function isAdminRole(role: string | null | undefined) {
  if (!role) return false;
  return role
    .split(",")
    .map((part) => part.trim())
    .includes("admin");
}

export function assertCanAdmin(role: string | null | undefined) {
  if (!isAdminRole(role)) {
    throw new Error("FORBIDDEN");
  }
}

export function canReadOrder(ownerId: string | null | undefined, requesterId: string) {
  return Boolean(ownerId) && ownerId === requesterId;
}

export function safeNextPath(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
