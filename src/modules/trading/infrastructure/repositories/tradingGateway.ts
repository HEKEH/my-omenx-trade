import { DomainError, computeClose } from "../../domain";
import type {
  AccountRepository,
  ClosePositionCommand,
  ClosePositionOutcome,
  PlaceOrderCommand,
  PlaceOrderOutcome,
  TradingGateway,
} from "../../application";
import type { TradeRow } from "../supabase-shape/rows";
import { NonBinaryOrders } from "./nonBinaryOrders";
import { unwrap, type BackendClient } from "./supabaseRepositories";

const now = () => new Date().toISOString();

/**
 * Order execution with the reference's call sequence: every order first goes
 * to `process_binary_trade`; a `null` result means the market is not binary
 * and the order is written client-side, with the balance updated here.
 */
export class SupabaseTradingGateway implements TradingGateway {
  private readonly nonBinary: NonBinaryOrders;

  constructor(
    private readonly client: BackendClient,
    private readonly userId: string,
    private readonly account: AccountRepository,
  ) {
    this.nonBinary = new NonBinaryOrders(client, userId);
  }

  async placeOrder(command: PlaceOrderCommand): Promise<PlaceOrderOutcome> {
    const binary = unwrap(
      await this.client.rpc("process_binary_trade", {
        p_mode: "place",
        p_event_name: command.eventName,
        p_option_label: command.optionLabel,
        p_option_id: command.optionId,
        p_side: command.side,
        p_order_type: command.orderType,
        p_price: command.price,
        p_amount: command.amount,
        p_quantity: command.quantity,
        p_leverage: command.leverage,
        p_tp_value: command.tp?.value ?? null,
        p_tp_mode: command.tp?.mode ?? null,
        p_sl_value: command.sl?.value ?? null,
        p_sl_mode: command.sl?.mode ?? null,
      }),
    );
    if (binary) {
      return {
        intent: binary.intent ?? "open",
        status: binary.trade.status === "Pending" ? "Pending" : "Filled",
        balanceDelta: binary.balanceDelta ?? 0,
      };
    }

    const outcome = await this.nonBinary.place(command);
    if (outcome.balanceDelta !== 0) await this.account.applyBalanceDelta(outcome.balanceDelta);
    return outcome;
  }

  async cancelOrder(orderId: string) {
    const binary = unwrap(await this.client.rpc("process_binary_trade", { p_mode: "cancel", p_order_id: orderId }));
    if (binary) return;
    const refund = await this.nonBinary.cancel(orderId);
    await this.account.applyBalanceDelta(refund);
  }

  /** Fills a pending non-binary limit order (binary fills run inside the RPC). */
  async fillNonBinaryOrder(trade: TradeRow) {
    const { balanceDelta } = await this.nonBinary.fill(trade);
    if (balanceDelta !== 0) await this.account.applyBalanceDelta(balanceDelta);
  }

  async closePosition({ positionId, quantity, closePrice }: ClosePositionCommand): Promise<ClosePositionOutcome> {
    const position = unwrap(
      await this.client.from("positions").select("*").eq("id", positionId).eq("user_id", this.userId).maybeSingle(),
    );
    if (!position || position.status !== "Open") {
      throw new DomainError("position-not-found", "This position is no longer open.");
    }

    const result = computeClose({
      position: {
        size: position.size,
        entryPrice: position.entry_price,
        margin: position.margin,
        fundingAccrued: position.funding_accrued,
      },
      quantity,
      closePrice,
    });
    const pnl = (position.pnl ?? 0) + result.realizedPnl;

    unwrap(
      await this.client
        .from("positions")
        .update(
          result.fullyClosed
            ? { status: "Closed", closed_at: now(), mark_price: closePrice, pnl, updated_at: now() }
            : {
                size: result.remaining.size,
                margin: result.remaining.margin,
                funding_accrued: result.remaining.fundingAccrued,
                mark_price: closePrice,
                pnl,
                updated_at: now(),
              },
        )
        .eq("id", positionId),
    );
    if (result.fullyClosed && position.trade_id) {
      unwrap(
        await this.client
          .from("trades")
          .update({ status: "Closed", pnl, funding_paid: position.funding_accrued, closed_at: now(), updated_at: now() })
          .eq("id", position.trade_id),
      );
    }
    // The reference never credited a partial close back to the balance (FIX-5).
    await this.account.applyBalanceDelta(result.balanceDelta);

    return {
      closedQuantity: result.quantity,
      realizedPnl: result.realizedPnl,
      releasedMargin: result.releasedMargin,
      fee: result.fee,
      balanceDelta: result.balanceDelta,
      fullyClosed: result.fullyClosed,
    };
  }

  async accrueFunding(positionId?: string) {
    unwrap(await this.client.functions.invoke("accrue-funding", { body: { positionId } }));
  }
}
