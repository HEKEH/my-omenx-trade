import path from "node:path";
import type { NextConfig } from "next";
import { codeInspectorPlugin } from "code-inspector-plugin";

const nextConfig: NextConfig = {
  turbopack: {
    // Dev-only: Alt+Shift (Option+Shift on macOS) + click an element to open its source in the editor
    rules: codeInspectorPlugin({
      bundler: "turbopack",
      editor: "code",
      // Inject the overlay into a client component every root layout renders. Without it the
      // plugin injects only into the first file it compiles, so one root layout had no overlay.
      injectTo: path.resolve(__dirname, "src/components/CodeInspectorEntry.tsx"),
    }),
  },
};

export default nextConfig;
