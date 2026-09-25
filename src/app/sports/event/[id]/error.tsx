"use client";

import { SportsShell } from "@/modules/sports/presentation/components/shell/SportsShell";

// Render errors on the event page (reference event.$id.tsx:83-102). The reference's reset plus
// router.invalidate is what Next's retry() does (dev reference R-14).
export default function EventError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <SportsShell>
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-loss">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => retry()} className="mt-6 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium hover:bg-white/10">
          Retry
        </button>
      </div>
    </SportsShell>
  );
}
