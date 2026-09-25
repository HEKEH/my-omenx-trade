"use client";

import { useCallback, useState } from "react";
import { Check, Share2 } from "lucide-react-sports";
import { cn } from "../../cn";

/**
 * Copies the page URL with `?outcome=<selected>` so the link pre-selects the same outcome
 * (reference event/ShareButton.tsx, compact variant). Shows "Copied" for 1.6s.
 */
export function ShareButton({ outcomeId, className }: { outcomeId?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    const url = new URL(window.location.href);
    if (outcomeId) url.searchParams.set("outcome", outcomeId);
    else url.searchParams.delete("outcome");
    const href = url.toString();
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(href).then(done).catch(done);
      return;
    }
    // Fallback for browsers without the async clipboard API.
    const textarea = document.createElement("textarea");
    textarea.value = href;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch {
      // Nothing more to try.
    }
    document.body.removeChild(textarea);
    done();
  }, [outcomeId]);

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground ring-1 ring-white/10 transition hover:bg-white/[0.1]",
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-win" />
          Copied
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          Share
        </>
      )}
    </button>
  );
}
