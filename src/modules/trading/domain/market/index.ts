import { mirrorPrice, round4, type Side } from "../shared";

/** One tradable outcome of an event. `price` is the Yes price, a probability. */
export interface OutcomeOption {
  id: string;
  label: string;
  price: number;
}

/** Display aliases for a binary market's two outcomes (e.g. two team names). */
export interface SideLabels {
  yes: string;
  no: string;
}

/** An event and its outcome options. */
export interface Market {
  id: string;
  name: string;
  endTime: Date | null;
  options: OutcomeOption[];
  sideLabels?: SideLabels;
}

export type BinaryOutcome = "yes" | "no";

export const binaryOutcome = (label: string | null | undefined): BinaryOutcome | null => {
  const normalized = label?.trim().toLowerCase();
  return normalized === "yes" || normalized === "no" ? normalized : null;
};

/** A single-market binary event: exactly two options, labelled Yes and No. */
export const isBinaryMarket = (options: readonly { label: string }[]) => {
  if (options.length !== 2) return false;
  const outcomes = options.map((option) => binaryOutcome(option.label));
  return outcomes.includes("yes") && outcomes.includes("no");
};

export const yesNoOptions = <T extends { label: string }>(options: readonly T[]) => ({
  yes: options.find((option) => binaryOutcome(option.label) === "yes"),
  no: options.find((option) => binaryOutcome(option.label) === "no"),
});

/** Reads `events.side_labels` (arbitrary JSON) into aliases, if well-formed. */
export const parseSideLabels = (raw: unknown): SideLabels | undefined => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const { yes, no } = raw as Record<string, unknown>;
  return typeof yes === "string" && typeof no === "string" ? { yes, no } : undefined;
};

/** Label to show for an option: aliases apply only to binary markets. */
export const displayOptionLabel = (label: string, market: Pick<Market, "options" | "sideLabels">) => {
  const outcome = binaryOutcome(label);
  if (!outcome || !market.sideLabels || !isBinaryMarket(market.options)) return label;
  return market.sideLabels[outcome];
};

/** "Yes"/"No" for a direction, or the market's alias when one is given. */
export const directionLabel = (side: Side, sideLabels?: SideLabels) => {
  if (sideLabels) return side === "long" ? sideLabels.yes : sideLabels.no;
  return side === "long" ? "Yes" : "No";
};

export const findOption = (market: Market, optionId: string | null | undefined) =>
  market.options.find((option) => option.id === optionId) ?? market.options[0];

/**
 * Prices on the Yes/No toggle. A binary market quotes each option's own price;
 * a multi-outcome option quotes `p` for Yes and `1 − p` for No.
 */
export const tradePrices = (market: Market, selectedOptionId: string | null | undefined) => {
  if (isBinaryMarket(market.options)) {
    const { yes, no } = yesNoOptions(market.options);
    return { yes: round4(yes?.price ?? 0), no: round4(no?.price ?? 0) };
  }
  const price = findOption(market, selectedOptionId)?.price ?? 0;
  return { yes: round4(price), no: mirrorPrice(price) };
};
