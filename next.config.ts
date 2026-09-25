import path from "node:path";
import type { NextConfig } from "next";
import { codeInspectorPlugin } from "code-inspector-plugin";

const nextConfig: NextConfig = {
  turbopack: {
    // Dev-only: Alt+Shift (Option+Shift on macOS) + click an element to open its source in the editor
    rules: codeInspectorPlugin({
      bundler: "turbopack",
      editor: "code",
      // App Router pages are server components; inject the overlay into a browser-side entry
      injectTo: path.resolve(__dirname, "src/instrumentation-client.ts"),
    }),
  },
};

export default nextConfig;
