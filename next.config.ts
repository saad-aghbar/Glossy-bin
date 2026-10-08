import type { NextConfig } from "next";
import path from "node:path";
import { parseDevOrigins } from "./src/lib/dev-origins";
import { imageRemotePattern } from "./src/lib/image-host";
import { cacheControlFor } from "./src/lib/cache-policy";

const devOrigins = parseDevOrigins(process.env.ALLOWED_DEV_ORIGINS);
const remoteImage = imageRemotePattern(process.env.R2_PUBLIC_URL);

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["three", "@react-three/fiber"],
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  ...(devOrigins.length ? { allowedDevOrigins: devOrigins } : {}),
  env: {
    GLOSSY_IMAGE_HOST: remoteImage?.hostname ?? "",
  },
  images: {
    ...(remoteImage ? { remotePatterns: [remoteImage] } : {}),
  },
  turbopack: {
    root: path.join(process.cwd()),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    const nodeEnv = process.env.NODE_ENV;
    const rules = [
      {
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: cacheControlFor("/uploads/photo.png", nodeEnv) }],
      },
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: cacheControlFor("/models/glossy/product.glb", nodeEnv) }],
      },
      {
        source: "/hero/:path*",
        headers: [{ key: "Cache-Control", value: cacheControlFor("/hero/poster.jpg", nodeEnv) }],
      },
      {
        source: "/fluid/:path*",
        headers: [{ key: "Cache-Control", value: cacheControlFor("/fluid/webgl-fluid.js", nodeEnv) }],
      },
      {
        source: "/account/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
    if (nodeEnv === "production") {
      rules.unshift({
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: cacheControlFor("/_next/static/chunk.js", nodeEnv) }],
      });
    }
    return rules;
  },
};

export default nextConfig;
