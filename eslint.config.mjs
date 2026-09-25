import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Standalone Node tooling scripts (CommonJS).
  {
    files: ["scripts/**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // The sports page draws its icons with lucide 0.575 (the trade page is pinned to 0.462,
  // whose icons differ), so sports code must import the aliased package.
  {
    files: ["src/modules/sports/**", "src/app/sports/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "lucide-react", message: "Import icons from \"lucide-react-sports\" in sports code." }] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
