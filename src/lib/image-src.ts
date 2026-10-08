export function isOptimizableImage(src: string, remoteHost = process.env.GLOSSY_IMAGE_HOST) {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  if (!remoteHost) return false;
  try {
    return new URL(src).hostname === remoteHost;
  } catch {
    return false;
  }
}
