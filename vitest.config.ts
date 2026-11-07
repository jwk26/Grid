import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: [
      "src/**/*.test.{ts,tsx}",
      "supabase/functions/_shared/**/*.test.ts",
      "scripts/backup-restore-check/**/*.test.ts",
    ],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@edge-shared": path.resolve(__dirname, "./supabase/functions/_shared"),
    },
  },
});
