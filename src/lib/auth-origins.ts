export function trustedAuthOrigins(baseURL: string, nodeEnv: string | undefined, extra: string | undefined) {
  const origins = [baseURL];
  if (nodeEnv === "production" || !extra?.trim()) return origins;
  for (const part of extra.split(",")) {
    const token = part.trim();
    if (!token || token.includes("*")) continue;
    let url: URL;
    try {
      url = new URL(token);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    if (url.username || url.password) continue;
    const origin = url.origin;
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}
