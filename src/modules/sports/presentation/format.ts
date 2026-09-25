/** "▲3¢" / "▼3¢" / "—0¢" for a 24h change in whole cents (reference EventOutcomesPanel.tsx). */
export const formatDeltaCents = (delta: number) => (delta > 0 ? `▲${delta}¢` : delta < 0 ? `▼${Math.abs(delta)}¢` : `—0¢`);

/** Chart chip P/L: "+$1.20" / "−$1.20" with a true minus sign (reference CombinedPriceChart.tsx). */
export const formatChipPnl = (pnl: number) => `${pnl >= 0 ? "+" : "−"}$${Math.abs(pnl).toFixed(2)}`;

/** Thousands separators as the reference renders them (an en-US browser, R-10). */
export const formatInteger = (value: number) => value.toLocaleString("en-US");
