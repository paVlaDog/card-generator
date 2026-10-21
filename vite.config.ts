import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  server: {
    watch: {
      ignored: ["**/*.pdf"],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
