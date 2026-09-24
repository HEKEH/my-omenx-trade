import { accrueFunding, hoursBetween, round6, sidePrice, type Side } from "../../domain";
import type { AccrueFundingResult } from "../supabase-shape/rows";
import type { MockDatabase } from "./db";
import { MOCK_USER_ID } from "./seed";

/**
 * Mock of the `accrue-funding` edge function: charges funding on the user's
 * open positions (or one position) since their last accrual and writes a
 * ledger row per charge.
 *
 * As agreed (FIX-4), the notional uses the live option price in the
 * position's own side space rather than the stale `positions.mark_price`.
 */
export const accrueFundingFunction = (
  db: MockDatabase,
  body: { positionId?: string } = {},
  now: Date = new Date(),
  userId: string = MOCK_USER_ID,
): AccrueFundingResult => {
  const options = new Map(db.rows("event_options").map((option) => [option.id, option]));
  const positions = db
    .rows("positions")
    .filter(
      (row) =>
        row.user_id === userId && row.status === "Open" && (!body.positionId || row.id === body.positionId),
    );

  let processed = 0;
  for (const position of positions) {
    const option = position.option_id ? options.get(position.option_id) : undefined;
    const ratePerHour = option?.funding_rate ?? 0;
    const side = position.side as Side;
    const markPrice = option ? sidePrice(option.price, side) : position.mark_price;
    const since = position.last_funding_at ?? position.created_at;
    const amount = accrueFunding({
      side,
      ratePerHour,
      size: position.size,
      markPrice,
      hours: hoursBetween(since, now),
    });
    // Nothing accrued yet: keep the timestamp so the next run catches up.
    if (amount === 0) continue;

    const accrualEnd = now.toISOString();
    db.update("positions", (row) => row.id === position.id, {
      funding_accrued: round6(position.funding_accrued + amount),
      last_funding_at: accrualEnd,
      pnl: round6((position.pnl ?? 0) - amount),
      updated_at: accrualEnd,
    });
    db.insert("position_funding_ledger", {
      accrual_end: accrualEnd,
      accrual_start: since,
      amount,
      applied_rate: ratePerHour,
      created_at: accrualEnd,
      event_name: position.event_name,
      id: crypto.randomUUID(),
      notional: round6(position.size * markPrice),
      option_id: position.option_id,
      position_id: position.id,
      user_id: userId,
    });
    processed += 1;
  }
  return { success: true, processed };
};
