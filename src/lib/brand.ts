export function storeTagline(tagline: string | null | undefined) {
  const value = tagline?.trim();
  return value || null;
}
