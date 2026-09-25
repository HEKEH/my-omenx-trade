/**
 * Take-profit / stop-loss validation and PnL preview (reference lib/tpsl.ts), shared by the
 * order form and the edit dialog. Prices are in ¢ (0–100). YES: TP > entry, SL < entry (and
 * > liq above 1×); NO: the reverse.
 */
export interface TpSlInput {
  side: "yes" | "no";
  /** Current price for new orders, entry price for open positions. */
  entry: number;
  /** Liquidation price; only enforced above 1×. */
  liq: number;
  leverage: number;
  tp: number | null;
  sl: number | null;
}

export interface TpSlValidation {
  tpError: string | null;
  slError: string | null;
  hasError: boolean;
}

const inRange = (v: number | null) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100);

export function validateTpSl({ side, entry, liq, leverage, tp, sl }: TpSlInput): TpSlValidation {
  const tpDirOk = tp === null ? true : side === "yes" ? tp > entry : tp < entry;
  const slDirOk =
    sl === null ? true : side === "yes" ? sl < entry && (leverage <= 1 || sl > liq) : sl > entry && (leverage <= 1 || sl < liq);

  const tpError = !inRange(tp) ? "0–100¢" : !tpDirOk ? (side === "yes" ? `must be > ${entry}¢` : `must be < ${entry}¢`) : null;

  let slError: string | null = null;
  if (!inRange(sl)) slError = "0–100¢";
  else if (!slDirOk) {
    const pastLiq = leverage > 1 && sl !== null && (side === "yes" ? sl <= liq : sl >= liq);
    if (side === "yes") slError = pastLiq ? `must be > liq ${liq}¢` : `must be < ${entry}¢`;
    else slError = pastLiq ? `must be < liq ${liq}¢` : `must be > ${entry}¢`;
  }

  return { tpError, slError, hasError: !!tpError || !!slError };
}

/** PnL (USDC) if TP / SL hits; null when the target is unset or invalid. */
export function previewTpSlPnl(input: TpSlInput & { notional: number; fee: number }): { tpPnl: number | null; slPnl: number | null } {
  const { side, entry, tp, sl, notional, fee } = input;
  const { tpError, slError } = validateTpSl(input);
  const sign = side === "yes" ? 1 : -1;
  const tpPnl = tp !== null && !tpError ? (tp / 100 - entry / 100) * notional * sign - fee : null;
  const slPnl = sl !== null && !slError ? (sl / 100 - entry / 100) * notional * sign - fee : null;
  return { tpPnl, slPnl };
}
