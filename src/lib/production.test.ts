import { describe, expect, it } from "vitest";
import { planUploadCopy } from "@/lib/upload-copy";
import { adminPasswordError, assertDevSeed, productionConfigError } from "@/lib/production";

const complete = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:secret-db@db.internal:5432/glossy",
  BETTER_AUTH_SECRET: "secret-auth",
  BETTER_AUTH_URL: "https://shop.example",
  RESEND_API_KEY: "secret-resend",
  EMAIL_FROM: "Glossy <orders@shop.example>",
  R2_ACCOUNT_ID: "account",
  R2_ACCESS_KEY_ID: "secret-key",
  R2_SECRET_ACCESS_KEY: "secret-secret",
  R2_BUCKET: "glossy",
  R2_PUBLIC_URL: "https://images.example",
};

describe("production configuration", () => {
  it("names missing production settings and does not print their values", () => {
    expect(productionConfigError({ NODE_ENV: "development" })).toBeNull();
    const problem = productionConfigError({
      NODE_ENV: "production",
      DATABASE_URL: complete.DATABASE_URL,
      BETTER_AUTH_SECRET: complete.BETTER_AUTH_SECRET,
    });
    expect(problem).toContain("RESEND_API_KEY");
    expect(problem).toContain("R2_BUCKET");
    expect(problem).not.toContain("secret-db");
    expect(problem).not.toContain("secret-auth");
    expect(productionConfigError({ ...complete, BETTER_AUTH_URL: "http://shop.example" })).toBe(
      "BETTER_AUTH_URL must be an https origin",
    );
    expect(productionConfigError({ ...complete, BETTER_AUTH_URL: "https://localhost" })).toBe(
      "BETTER_AUTH_URL must not be localhost",
    );
    expect(productionConfigError(complete)).toBeNull();
  });

  it("rejects a short or example admin password and blocks the development seed in production", () => {
    expect(adminPasswordError("short-password")).toMatch(/16/);
    expect(adminPasswordError("replace-with-a-long-password")).toMatch(/placeholder/);
    expect(adminPasswordError("a-real-admin-password")).toBeNull();
    expect(() => assertDevSeed("production")).toThrow(/db:admin/);
    expect(() => assertDevSeed("development")).not.toThrow();
  });

  it("plans an upload copy without deleting local files", () => {
    const steps = planUploadCopy(
      ["shade.jpg"],
      [
        { table: "product_image", id: "img", url: "/uploads/shade.jpg" },
        { table: "store_setting", id: "store", url: "/uploads/logo.png" },
        { table: "product_image", id: "remote", url: "https://images.example/a.jpg" },
      ],
      "https://images.example/",
    );
    expect(steps).toEqual([
      {
        table: "product_image",
        id: "img",
        from: "/uploads/shade.jpg",
        filename: "shade.jpg",
        fileFound: true,
        to: "https://images.example/migrated/shade.jpg",
      },
      {
        table: "store_setting",
        id: "store",
        from: "/uploads/logo.png",
        filename: "logo.png",
        fileFound: false,
        to: null,
      },
    ]);
    expect(JSON.stringify(steps)).not.toContain("unlink");
  });
});
