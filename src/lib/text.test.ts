import { describe, expect, it } from "vitest";
import { decodeSlug, slugify } from "./text";

describe("slugs", () => {
  it("keeps Arabic and English in one slug and decodes a percent-encoded copy", () => {
    const slug = slugify("لمسة Glow الطويلة للتجربة");
    expect(slug).toBe("لمسة-glow-الطويلة-للتجربة");
    expect(decodeSlug(encodeURIComponent(slug))).toBe(slug);
    expect(decodeSlug(slug)).toBe(slug);
  });
});
