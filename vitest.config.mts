import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests cover the domain layers, plus the sports data port (pure TS, no DOM).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/modules/trading/domain/**/*.test.ts", "src/modules/sports/domain/**/*.test.ts", "src/modules/sports/infrastructure/**/*.test.ts"],
    environment: "node",
  },
});
