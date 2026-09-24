import { clamp01, feeFor, round2, round4 } from "../shared";
import type { TpSlKind, TpSlMode } from "../order";

export * from "./intent";

/*
 * Every position is long in its own side's price space: a long holds the
 * option at `p`, a short holds its complement at `1 − p`. Entry, mark and
 * close prices passed here are all in that space.
 */

/** Liquidation estimate: `entry × (1 − 0.9 / leverage)`, clamped to [0, 1]. */
export const liquidationPrice = (entryPrice: number, leverage: number): number | null => {
  if (!Number.isFinite(entryPrice) || !Number.isFinite(leverage) || entryPrice <= 0 || leverage <= 0) {
    return null;
  }
  return round4(clamp01(entryPrice * (1 - 0.9 / leverage)));
};

export const unrealizedPnl = ({
  entryPrice,
  markPrice,
  size,
}: {
  entryPrice: number;
  markPrice: number;
  size: number;
}) => (markPrice - entryPrice) * size;

/** P&L as a percentage of posted margin. */
export const returnOnMargin = (pnl: number, margin: number) => (margin > 0 ? (pnl / margin) * 100 : 0);

export const averageEntry = (
  position: { size: number; entryPrice: number },
  fill: { quantity: number; price: number },
) => {
  const size = position.size + fill.quantity;
  return size > 0 ? (position.size * position.entryPrice + fill.quantity * fill.price) / size : fill.price;
};

/** Close size in whole contracts: at least 1, never more than the position holds. */
export const clampCloseQuantity = (requested: number, size: number) =>
  Math.min(Math.max(1, Math.floor(requested || 0)), Math.floor(size));

/** Contracts for a quick-close ratio such as 25%. */
export const quickCloseQuantity = (size: number, percent: number) =>
  clampCloseQuantity(Math.max(1, Math.round((size * percent) / 100)), size);

export interface ClosablePosition {
  size: number;
  entryPrice: number;
  margin: number;
  fundingAccrued: number;
}

export interface CloseResult {
  quantity: number;
  releasedMargin: number;
  /** Funding accrued on the closed share, taken out of realized P&L. */
  fundingSlice: number;
  realizedPnl: number;
  fee: number;
  /** What the account balance changes by. */
  balanceDelta: number;
  remaining: { size: number; margin: number; fundingAccrued: number };
  fullyClosed: boolean;
}

/** Closing part or all of a position at `closePrice`, by the server's rules. */
export const computeClose = ({
  position,
  quantity,
  closePrice,
}: {
  position: ClosablePosition;
  quantity: number;
  closePrice: number;
}): CloseResult => {
  const closed = clampCloseQuantity(quantity, position.size);
  const share = position.size > 0 ? closed / position.size : 0;
  const releasedMargin = position.margin * share;
  const fundingSlice = position.fundingAccrued * share;
  const realizedPnl = (closePrice - position.entryPrice) * closed - fundingSlice;
  const fee = feeFor(closePrice, closed);
  const fullyClosed = closed >= position.size;
  return {
    quantity: closed,
    releasedMargin,
    fundingSlice,
    realizedPnl,
    fee,
    balanceDelta: round2(releasedMargin + realizedPnl - fee),
    remaining: fullyClosed
      ? { size: 0, margin: 0, fundingAccrued: 0 }
      : {
          size: position.size - closed,
          margin: position.margin - releasedMargin,
          fundingAccrued: position.fundingAccrued - fundingSlice,
        },
    fullyClosed,
  };
};

/**
 * Estimated P&L shown while editing an open position's TP/SL. Percent mode is
 * a return on margin (so leverage scales it); price mode is the price distance.
 */
export const estimateTpSlEditPnl = ({
  position,
  kind,
  mode,
  value,
}: {
  position: { entryPrice: number; size: number; margin: number; leverage: number };
  kind: TpSlKind;
  mode: TpSlMode;
  value: number;
}): number | null => {
  if (!value || !position.margin) return null;
  if (mode === "pct") {
    const pnl = position.margin * (value / 100) * position.leverage;
    return round2(kind === "tp" ? pnl : -pnl);
  }
  if (!position.entryPrice || !position.size) return null;
  return round2((value - position.entryPrice) * position.size);
};

/** Figures for the position detail dialog, at the live mark. */
export const positionDetail = ({
  position,
  markPrice,
}: {
  position: ClosablePosition;
  markPrice: number;
}) => {
  const pricePnl = unrealizedPnl({ entryPrice: position.entryPrice, markPrice, size: position.size });
  const netPnl = pricePnl - position.fundingAccrued;
  const notional = position.size * markPrice;
  return {
    pricePnl,
    netPnl,
    pnlPercent: returnOnMargin(netPnl, position.margin),
    notional,
    openFee: feeFor(position.entryPrice, position.size),
    estCloseFee: feeFor(markPrice, position.size),
  };
};
