import { DomainError, EPSILON, averageEntry, mirrorPrice, round2, toSide } from "../../domain";
import type { PlaceOrderCommand, PlaceOrderOutcome } from "../../application";
import type { PositionRow, TradeRow } from "../supabase-shape/rows";
import { unwrap, type BackendClient } from "./supabaseRepositories";

/*
 * Orders on multi-outcome (non-binary) markets. In the reference these are
 * client-side table writes (`tradingService.ts`) after the binary RPC returns
 * null, so they stay client-side here and go through the same supabase-shaped
 * calls. Fixes applied as agreed: an opposite order closes at `1 − price` in
 * the position's own side space with its funding share deducted (FIX-7), and
 * cancelling refunds the funds the order reserved (E-30).
 */

const now = () => new Date().toISOString();

interface Execution {
  intent: PlaceOrderOutcome["intent"];
  /** Balance change still to apply for this execution. */
  balanceDelta: number;
}

export class NonBinaryOrders {
  constructor(
    private readonly client: BackendClient,
    private readonly userId: string,
  ) {}

  async place(command: PlaceOrderCommand): Promise<PlaceOrderOutcome> {
    const createdAt = now();
    const trade = unwrap(
      await this.client
        .from("trades")
        .insert({
          amount: command.amount,
          closed_at: null,
          created_at: createdAt,
          event_name: command.eventName,
          fee: command.fee,
          funding_paid: 0,
          id: crypto.randomUUID(),
          leverage: command.leverage,
          margin: command.margin,
          option_label: command.optionLabel,
          order_type: command.orderType,
          pnl: null,
          price: command.price,
          quantity: command.quantity,
          side: command.side,
          sl_mode: command.sl?.mode ?? null,
          sl_value: command.sl?.value ?? null,
          status: command.orderType === "Market" ? "Filled" : "Pending",
          tp_mode: command.tp?.mode ?? null,
          tp_value: command.tp?.value ?? null,
          updated_at: createdAt,
          user_id: this.userId,
        })
        .select()
        .single(),
    );

    if (command.orderType === "Limit") {
      // Margin and fee are held until the order fills or is cancelled.
      return {
        intent: command.margin === 0 ? "reduce" : "open",
        status: "Pending",
        balanceDelta: -round2(command.margin + command.fee),
      };
    }

    try {
      const execution = await this.execute(trade, command.optionId, { feePaid: false });
      return { ...execution, status: "Filled" };
    } catch (error) {
      await this.client.from("trades").update({ status: "Cancelled", updated_at: now() }).eq("id", trade.id);
      throw error;
    }
  }

  /** Cancels a pending order; returns the reserved funds to refund. */
  async cancel(orderId: string): Promise<number> {
    const trade = unwrap(
      await this.client.from("trades").select("*").eq("id", orderId).eq("user_id", this.userId).maybeSingle(),
    );
    if (!trade) throw new DomainError("order-not-found", "Order not found.");
    if (trade.status !== "Pending") throw new DomainError("order-not-pending", "Order is no longer pending.");
    unwrap(await this.client.from("trades").update({ status: "Cancelled", updated_at: now() }).eq("id", trade.id));
    return round2(trade.margin + trade.fee);
  }

  /** Fills a pending limit order at its limit price. Its margin and fee were reserved at placement. */
  async fill(trade: TradeRow): Promise<Execution> {
    const optionId = await this.optionIdFor(trade);
    const execution = await this.execute(trade, optionId, { feePaid: true });
    unwrap(
      await this.client
        .from("trades")
        .update({ status: "Filled", closed_at: now(), updated_at: now() })
        .eq("id", trade.id),
    );
    return execution;
  }

  private async optionIdFor(trade: TradeRow) {
    const event = unwrap(await this.client.from("events").select("*").eq("name", trade.event_name).maybeSingle());
    if (!event) return null;
    const options = unwrap(await this.client.from("event_options").select("*").eq("event_id", event.id));
    return options.find((option) => option.label === trade.option_label)?.id ?? null;
  }

  private async openPosition(trade: TradeRow, side: "long" | "short") {
    return unwrap(
      await this.client
        .from("positions")
        .select("*")
        .eq("user_id", this.userId)
        .eq("event_name", trade.event_name)
        .eq("option_label", trade.option_label)
        .eq("side", side)
        .eq("status", "Open")
        .maybeSingle(),
    );
  }

  /** Nets the trade against an opposite position, or opens/extends a same-side one. */
  private async execute(trade: TradeRow, optionId: string | null, { feePaid }: { feePaid: boolean }): Promise<Execution> {
    const side = toSide(trade.side === "sell" ? "sell" : "buy");
    const fee = feePaid ? 0 : trade.fee;
    const opposite = await this.openPosition(trade, side === "long" ? "short" : "long");

    if (opposite) {
      if (trade.quantity > opposite.size + EPSILON) {
        throw new DomainError("blocked-cross-zero", "Close existing position first before opening the opposite side.");
      }
      if (trade.margin !== 0) {
        throw new DomainError("invalid-margin", "Reduce and close orders must not require opening margin.");
      }
      return this.reduce(trade, opposite, fee);
    }

    const same = await this.openPosition(trade, side);
    if (same) {
      unwrap(
        await this.client
          .from("positions")
          .update({
            size: same.size + trade.quantity,
            margin: round2(same.margin + trade.margin),
            entry_price: averageEntry({ size: same.size, entryPrice: same.entry_price }, { quantity: trade.quantity, price: trade.price }),
            tp_value: trade.tp_value ?? same.tp_value,
            tp_mode: trade.tp_mode ?? same.tp_mode,
            sl_value: trade.sl_value ?? same.sl_value,
            sl_mode: trade.sl_mode ?? same.sl_mode,
            updated_at: now(),
          })
          .eq("id", same.id),
      );
      return { intent: "add", balanceDelta: feePaid ? 0 : -round2(trade.margin + fee) };
    }

    const createdAt = now();
    unwrap(
      await this.client.from("positions").insert({
        closed_at: null,
        created_at: createdAt,
        entry_price: trade.price,
        event_name: trade.event_name,
        funding_accrued: 0,
        id: crypto.randomUUID(),
        last_funding_at: createdAt,
        leverage: trade.leverage,
        margin: trade.margin,
        mark_price: trade.price,
        option_id: optionId,
        option_label: trade.option_label,
        pnl: 0,
        pnl_percent: 0,
        side,
        size: trade.quantity,
        sl_mode: trade.sl_mode,
        sl_value: trade.sl_value,
        status: "Open",
        tp_mode: trade.tp_mode,
        tp_value: trade.tp_value,
        trade_id: trade.id,
        updated_at: createdAt,
        user_id: this.userId,
      }),
    );
    return { intent: "open", balanceDelta: feePaid ? 0 : -round2(trade.margin + fee) };
  }

  private async reduce(trade: TradeRow, position: PositionRow, fee: number): Promise<Execution> {
    // The opposite order trades at `price`; the position closes at 1 − price in its own space.
    const closePrice = mirrorPrice(trade.price);
    const closeQty = Math.min(trade.quantity, position.size);
    const share = closeQty / position.size;
    const releasedMargin = position.margin * share;
    const fundingSlice = position.funding_accrued * share;
    const realizedPnl = (closePrice - position.entry_price) * closeQty - fundingSlice;
    const remainingSize = position.size - closeQty;
    const intent = remainingSize <= EPSILON ? "close" : "reduce";
    const totalPnl = (position.pnl ?? 0) + realizedPnl;

    unwrap(
      await this.client
        .from("positions")
        .update(
          intent === "close"
            ? { status: "Closed", closed_at: now(), mark_price: closePrice, pnl: totalPnl, updated_at: now() }
            : {
                size: remainingSize,
                margin: position.margin - releasedMargin,
                funding_accrued: position.funding_accrued - fundingSlice,
                mark_price: closePrice,
                pnl: totalPnl,
                updated_at: now(),
              },
        )
        .eq("id", position.id),
    );
    unwrap(
      await this.client
        .from("trades")
        .update({
          pnl: realizedPnl,
          funding_paid: fundingSlice,
          status: "Filled",
          closed_at: intent === "close" ? now() : null,
          updated_at: now(),
        })
        .eq("id", trade.id),
    );
    return { intent, balanceDelta: round2(releasedMargin + realizedPnl - fee) };
  }
}
