import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests cover the trading domain layer only (pure TS, no DOM).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/modules/trading/domain/**/*.test.ts"],
    environment: "node",
  },
});
