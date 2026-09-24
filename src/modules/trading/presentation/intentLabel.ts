import { binaryOutcome, isBlocked, type OrderIntent, type OrderSide, type SideLabels } from "../domain";

/**
 * Submit button text for an order: "Reduce X" / "Close X" when it nets
 * against a position, "Order unavailable" when blocked, otherwise "Buy X" /
 * "Sell X". Binary Yes/No labels use the market's aliases when it has them.
 */
export const intentLabel = (
  intent: OrderIntent,
  side: OrderSide,
  optionLabel: string,
  sideLabels?: SideLabels,
) => {
  const nets = intent.kind === "reduce" || intent.kind === "close";
  const raw = nets ? (intent.existingPosition?.optionLabel ?? optionLabel) : optionLabel;
  const outcome = binaryOutcome(raw);
  const label = sideLabels && outcome ? sideLabels[outcome] : raw;
  if (intent.kind === "reduce") return `Reduce ${label}`;
  if (intent.kind === "close") return `Close ${label}`;
  if (isBlocked(intent.kind)) return "Order unavailable";
  return side === "buy" ? `Buy ${label}` : `Sell ${label}`;
};
