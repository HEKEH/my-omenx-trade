"use client";

import { useState, type ReactNode } from "react";
import { cn } from "../../cn";

export interface StageTab {
  id: string;
  label: string;
  /** Shown right of the label. */
  badge?: ReactNode;
  content: ReactNode;
}

/** Segmented Stream / Markets tabs for live events (reference event/StageTabs.tsx). */
export function StageTabs({ tabs, defaultTabId, className }: { tabs: StageTab[]; defaultTabId?: string; className?: string }) {
  const initial = defaultTabId && tabs.some((t) => t.id === defaultTabId) ? defaultTabId : tabs[0]?.id;
  const [active, setActive] = useState<string | undefined>(initial);
  const activeTab = tabs.find((t) => t.id === active);
  return (
    <div className={cn("space-y-3", className)}>
      <div role="tablist" aria-label="Event view" className="inline-flex rounded-full border border-border bg-surface/60 p-1 shadow-card">
        {tabs.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActive(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition",
                selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              {t.label}
              {t.badge}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{activeTab?.content}</div>
    </div>
  );
}
