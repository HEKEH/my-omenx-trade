"use client";

import { useState } from "react";
import { toast } from "sonner";
import { placeOrder, type OrderTicket } from "../../application";
import { useTradeContext } from "../components/TradeMockProvider";

/** Submits an order ticket; toasts the outcome and resets the form on success. */
export function usePlaceOrder() {
  const { container, store, form } = useTradeContext();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (ticket: OrderTicket) => {
    setSubmitting(true);
    try {
      const { outcome } = await placeOrder(container.deps, ticket);
      toast.success(outcome.status === "Pending" ? "Limit order placed successfully!" : "Order executed successfully!");
      form.getState().resetAfterSubmit();
      // Realtime pushes refresh positions and orders; the balance is read back here.
      await store.getState().refreshPortfolio();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to execute order");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting };
}
