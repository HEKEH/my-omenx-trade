"use client";

import { Fragment } from "react";

// code-inspector-plugin injects its dev-only overlay into this file (see `injectTo` in
// next.config.ts), and every root layout renders it, so each page loads the overlay. The
// plugin keeps its import alive by rendering an element inside the first JSX element with a
// closing tag; without one (a plain `return null`) the import is unused and dropped. Fragment
// renders no DOM, and in a production build the plugin is off.
export function CodeInspectorEntry() {
  return <Fragment></Fragment>;
}
