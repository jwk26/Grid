import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.db.test.ts"],
    globalSetup: ["supabase/tests/helpers/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@edge-shared": path.resolve(__dirname, "./supabase/functions/_shared"),
    },
  },
});
