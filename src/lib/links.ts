function httpsUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function whatsappUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const url = httpsUrl(trimmed);
  const host = url?.hostname.toLowerCase();
  if (!url || (host !== "wa.me" && host !== "api.whatsapp.com" && host !== "whatsapp.com")) {
    throw new Error("رابط واتساب غير صالح");
  }
  return url.toString();
}

export function instagramUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const url = httpsUrl(trimmed);
  const host = url?.hostname.toLowerCase();
  if (!url || (host !== "instagram.com" && host !== "www.instagram.com")) {
    throw new Error("رابط إنستغرام غير صالح");
  }
  return url.toString();
}

export function offerLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\") && !trimmed.includes("://")) {
    return trimmed;
  }
  const url = httpsUrl(trimmed);
  if (!url) throw new Error("رابط العرض غير صالح");
  return url.toString();
}

export function visibleBankInstructions(method: string, instructions: string | null | undefined) {
  const value = instructions?.trim();
  if (method !== "bank_transfer" || !value) return null;
  return value;
}
