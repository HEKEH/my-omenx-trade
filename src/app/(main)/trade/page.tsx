"use client";

import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TradeMockProvider } from "@/modules/trading/presentation/components/TradeMockProvider";
import { LoadingState } from "@/modules/trading/presentation/components/TradePageStates";
import { TradeScreen } from "@/modules/trading/presentation/components/TradeScreen";

export default function TradePage() {
  return (
    // TradeScreen reads `?event=` with useSearchParams, which needs a Suspense boundary to prerender.
    <Suspense fallback={<LoadingState />}>
      <TradeMockProvider fallback={<LoadingState />}>
        <TradeScreen />
      </TradeMockProvider>
      <Toaster />
    </Suspense>
  );
}
