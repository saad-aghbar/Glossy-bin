import "dotenv/config";
import path from "node:path";
import { defineConfig } from "vitest/config";

if (process.env.DATABASE_URL) {
  const testUrl = new URL(process.env.DATABASE_URL);
  testUrl.pathname = "/glossy_test";
  process.env.TEST_DATABASE_URL = testUrl.toString();
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
