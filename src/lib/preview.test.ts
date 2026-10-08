import { describe, expect, it } from "vitest";
import { trustedAuthOrigins } from "./auth-origins";
import { cacheControlFor, isPublicAsset } from "./cache-policy";
import { parseDevOrigins } from "./dev-origins";
import { isOptimizableImage } from "./image-src";
import { imageRemotePattern } from "./image-host";

describe("preview origins", () => {
  it("keeps an exact tunnel hostname and drops wildcards", () => {
    expect(parseDevOrigins(" doors-richard-alter-committed.trycloudflare.com ")).toEqual([
      "doors-richard-alter-committed.trycloudflare.com",
    ]);
    expect(parseDevOrigins("*.trycloudflare.com, https://shop.example")).toEqual([]);
    expect(parseDevOrigins(undefined)).toEqual([]);
  });

  it("adds a development origin and ignores extras in production", () => {
    const base = "http://localhost:3001";
    expect(trustedAuthOrigins(base, "development", "https://doors-richard-alter-committed.trycloudflare.com")).toEqual([
      base,
      "https://doors-richard-alter-committed.trycloudflare.com",
    ]);
    expect(trustedAuthOrigins(base, "production", "https://doors-richard-alter-committed.trycloudflare.com")).toEqual([base]);
    expect(trustedAuthOrigins(base, "development", "https://*.example.com")).toEqual([base]);
  });
});

describe("cache policy", () => {
  it("caches fingerprinted files for a long time and keeps account pages private", () => {
    expect(cacheControlFor("/_next/static/chunks/app.js", "production")).toBe("public, max-age=31536000, immutable");
    expect(cacheControlFor("/uploads/photo.png", "production")).toBe("public, max-age=3600");
    expect(cacheControlFor("/models/glossy/glossy-lipstick.glb", "development")).toBe("public, max-age=3600");
    expect(cacheControlFor("/account/orders", "production")).toBe("private, no-store");
    expect(cacheControlFor("/admin", "development")).toBe("private, no-store");
    expect(cacheControlFor("/", "development")).toBe("no-store, no-cache, must-revalidate, max-age=0");
    expect(cacheControlFor("/", "production")).toBe("private, no-store");
    expect(isPublicAsset("/uploads/photo.png")).toBe(true);
    expect(isPublicAsset("/account")).toBe(false);
  });
});

describe("image hosts", () => {
  it("allows only the configured public host", () => {
    expect(imageRemotePattern("https://images.example/products")).toEqual({
      protocol: "https",
      hostname: "images.example",
      pathname: "/**",
    });
    expect(imageRemotePattern("not a url")).toBeNull();
    expect(imageRemotePattern(undefined)).toBeNull();
    expect(isOptimizableImage("/uploads/photo.png")).toBe(true);
    expect(isOptimizableImage("https://images.example/products/a.jpg", "images.example")).toBe(true);
    expect(isOptimizableImage("https://evil.example/a.jpg", "images.example")).toBe(false);
  });
});
