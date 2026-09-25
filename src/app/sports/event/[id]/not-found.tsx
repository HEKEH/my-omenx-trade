import Link from "next/link";
import { ArrowLeft } from "lucide-react-sports";
import { SportsShell } from "@/modules/sports/presentation/components/shell/SportsShell";

// Unknown event id (reference event.$id.tsx:64-81).
export default function EventNotFound() {
  return (
    <SportsShell>
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Event not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">We couldn&apos;t find this market. It may have been removed or never existed.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
    </SportsShell>
  );
}
