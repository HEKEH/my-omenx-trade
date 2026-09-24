import { DomainError, round2 } from "../shared";

/**
 * Applies a balance change. Only the real balance is used for trading: the
 * trial balance does not take part in any calculation.
 */
export const applyBalanceDelta = (balance: number, delta: number) => {
  const next = round2(balance + delta);
  if (next < 0) {
    throw new DomainError(
      "insufficient-balance",
      `Insufficient balance. You need ${(-delta).toFixed(2)} USDC but only have ${balance.toFixed(2)} USDC.`,
    );
  }
  return next;
};

export type RiskLevel = "SAFE" | "WARNING" | "RESTRICTION" | "LIQUIDATION";

export const riskLevelFor = (riskRatio: number): RiskLevel => {
  if (riskRatio >= 100) return "LIQUIDATION";
  if (riskRatio >= 95) return "RESTRICTION";
  if (riskRatio >= 80) return "WARNING";
  return "SAFE";
};

/** Maintenance margin as a share of initial margin. */
const MAINTENANCE_RATIO = 0.5;
/** Ratios are shown capped at this value; the level uses the raw ratio. */
const MAX_DISPLAYED_RATIO = 150;

export interface AccountRisk {
  equity: number;
  unrealizedPnl: number;
  initialMargin: number;
  maintenanceMargin: number;
  /** Initial margin over equity, in percent (capped for display). */
  riskRatio: number;
  maintenanceRate: number;
  level: RiskLevel;
  availableMargin: number;
}

/** Account-level risk for the unified (cross) account. Display only: orders are not gated on it. */
export const computeAccountRisk = ({
  balance,
  positions,
}: {
  balance: number;
  positions: readonly { margin: number; unrealizedPnl: number }[];
}): AccountRisk => {
  const unrealizedPnl = positions.reduce((sum, position) => sum + position.unrealizedPnl, 0);
  const initialMargin = positions.reduce((sum, position) => sum + position.margin, 0);
  const maintenanceMargin = initialMargin * MAINTENANCE_RATIO;
  const equity = balance + unrealizedPnl;
  const ratio = (value: number) => (equity > 0 ? (value / equity) * 100 : 0);
  const riskRatio = ratio(initialMargin);
  return {
    equity,
    unrealizedPnl,
    initialMargin,
    maintenanceMargin,
    riskRatio: Math.min(riskRatio, MAX_DISPLAYED_RATIO),
    maintenanceRate: Math.min(ratio(maintenanceMargin), MAX_DISPLAYED_RATIO),
    level: riskLevelFor(riskRatio),
    availableMargin: Math.max(equity - initialMargin, 0),
  };
};
