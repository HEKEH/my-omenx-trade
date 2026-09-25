import type { ReactNode } from "react";
import { cn } from "../../cn";

/** Page frame: the purple-black canvas with its ambient neon glow (reference AppShell.tsx). */
export function SportsShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative min-h-screen bg-background bg-ambient", className)}>
      <div className="relative">{children}</div>
    </div>
  );
}
