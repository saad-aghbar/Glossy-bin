const PUBLIC_ASSET = /^\/(uploads|models|hero|fluid)\//;

export function isPublicAsset(pathname: string) {
  return pathname.startsWith("/_next/static/") || PUBLIC_ASSET.test(pathname);
}

export function cacheControlFor(pathname: string, nodeEnv: string | undefined) {
  if (pathname.startsWith("/_next/static/")) {
    return nodeEnv === "production" ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate";
  }
  if (PUBLIC_ASSET.test(pathname)) return "public, max-age=3600";
  if (pathname.startsWith("/account") || pathname.startsWith("/admin") || pathname.startsWith("/api/")) {
    return "private, no-store";
  }
  if (nodeEnv === "production") return "private, no-store";
  return "no-store, no-cache, must-revalidate, max-age=0";
}
