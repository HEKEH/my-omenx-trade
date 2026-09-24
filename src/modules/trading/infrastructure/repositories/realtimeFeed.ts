import type { PriceUpdate, RealtimeFeed, Unsubscribe } from "../../application";
import type { EventOptionRow } from "../supabase-shape/rows";
import type { BackendClient } from "./supabaseRepositories";

/** The three Supabase Realtime channels the reference trade page subscribes to. */
export class SupabaseRealtimeFeed implements RealtimeFeed {
  constructor(
    private readonly client: BackendClient,
    private readonly userId: string,
  ) {}

  onPrice(listener: (update: PriceUpdate) => void): Unsubscribe {
    const channel = this.client
      .channel("global-event-options-prices")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "event_options" }, (payload) => {
        const row = payload.new as EventOptionRow;
        if (!row.id) return;
        listener({
          optionId: row.id,
          eventId: row.event_id,
          price: Number(row.price),
          previousPrice: payload.old.price === undefined ? null : Number(payload.old.price),
          funding: { ratePerHour: Number(row.funding_rate), nextFundingAt: row.next_funding_at },
          at: payload.commit_timestamp,
        });
      })
      .subscribe();
    return () => this.client.removeChannel(channel);
  }

  onPositionsChanged(listener: () => void): Unsubscribe {
    const channel = this.client
      .channel(`positions-${this.userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "positions", filter: `user_id=eq.${this.userId}` },
        () => listener(),
      )
      .subscribe();
    return () => this.client.removeChannel(channel);
  }

  onOrdersChanged(listener: () => void): Unsubscribe {
    const channel = this.client
      .channel("pending-orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${this.userId}` },
        () => listener(),
      )
      .subscribe();
    return () => this.client.removeChannel(channel);
  }
}
