"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cancelOrder, closePosition, updateTpSl, type TpSlSetting } from "../../application";
import { useTradeContext } from "../components/TradeMockProvider";

const signedUsd = (value: number) => `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;

const tpSlDisplay = (setting: TpSlSetting | null, profit: boolean) => {
  if (!setting) return "Not set";
  return setting.mode === "%" ? `${profit ? "+" : "-"}${setting.value}%` : `$${setting.value}`;
};

/** Cancel / close / TP/SL actions with the reference's toasts. */
export function usePositionActions() {
  const { container, store } = useTradeContext();
  const [busy, setBusy] = useState(false);
  const refresh = () => store.getState().refreshPortfolio();

  const run = async <T>(action: () => Promise<T>, onError: (error: unknown) => string) => {
    setBusy(true);
    try {
      const result = await action();
      await refresh();
      return result;
    } catch (error) {
      toast.error(onError(error));
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    cancel: (orderId: string, description: string) =>
      run(
        async () => {
          await cancelOrder(container.deps, orderId);
          toast.success("Order Cancelled", { description });
          return true;
        },
        () => "Failed to cancel order",
      ),
    close: (positionId: string, quantity: number) =>
      run(
        async () => {
          const outcome = await closePosition(container.deps, {
            positionId,
            quantity,
            livePrices: store.getState().prices,
          });
          // Remaining size comes from the close itself: realtime may already have refreshed the store.
          const remaining = outcome.remainingSize;
          toast.success(
            outcome.fullyClosed
              ? `Position closed · realized ${signedUsd(outcome.realizedPnl)}`
              : `Closed ${outcome.closedQuantity} contracts · realized ${signedUsd(outcome.realizedPnl)} · ${remaining} remaining`,
          );
          return outcome;
        },
        (error) => `Failed to close position: ${error instanceof Error ? error.message : String(error)}`,
      ),
    updateTpSl: (positionId: string, tp: TpSlSetting | null, sl: TpSlSetting | null) =>
      run(
        async () => {
          await updateTpSl(container.deps, positionId, tp, sl);
          toast.success("TP/SL Updated", {
            description: `Take Profit: ${tpSlDisplay(tp, true)}, Stop Loss: ${tpSlDisplay(sl, false)}`,
          });
          return true;
        },
        (error) => `Failed to update TP/SL: ${error instanceof Error ? error.message : String(error)}`,
      ),
  };
}
