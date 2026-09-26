import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    dir: path.resolve(import.meta.dirname, "tests/integration"),
    environment: "node",
    include: ["**/*.test.ts"],
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 45_000,
  },
});
