export function decodeSlug(slug: string) {
  const normalized = slug.normalize("NFC");
  if (!normalized.includes("%")) return normalized;
  try {
    return decodeURIComponent(normalized).normalize("NFC");
  } catch {
    return normalized;
  }
}

export function slugify(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base.slice(0, 80) || "item";
}

export function isUniqueViolation(error: unknown) {
  return pgCode(error) === "23505";
}

export function isForeignKeyViolation(error: unknown) {
  return pgCode(error) === "23503";
}

function pgCode(error: unknown) {
  const candidates = [error, error instanceof Error ? error.cause : null];
  for (const candidate of candidates) {
    if (typeof candidate === "object" && candidate !== null && "code" in candidate) {
      return String(candidate.code);
    }
  }
  return "";
}
