"use client";

interface SideToggleProps {
  yesLabel: string;
  noLabel: string;
  yesPrice: number;
  noPrice: number;
  yesSelected: boolean;
  onYes: () => void;
  onNo: () => void;
}

function SideButton({
  label,
  price,
  selected,
  tone,
  onClick,
}: {
  label: string;
  price: number;
  selected: boolean;
  tone: "yes" | "no";
  onClick: () => void;
}) {
  const active =
    tone === "yes" ? "bg-trading-green text-trading-green-foreground" : "bg-trading-red text-foreground";
  const activeBar =
    tone === "yes"
      ? "bg-trading-green/85 text-trading-green-foreground border-black/20"
      : "bg-trading-red/85 text-foreground border-black/20";
  return (
    <button type="button" onClick={onClick} className="relative flex flex-col h-full rounded-md overflow-hidden transition-all">
      <div
        className={`relative flex-1 flex items-center justify-center min-h-[24px] py-1.5 px-2 text-[11px] font-semibold leading-tight line-clamp-2 text-center transition-colors ${
          selected ? active : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        {label}
        {selected && (
          <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-current shadow-[0_0_4px_currentColor]" />
        )}
      </div>
      <div
        className={`h-[22px] flex items-center justify-center text-[11px] font-mono border-t ${
          selected ? activeBar : "bg-muted-foreground/15 text-foreground/80 border-border/40"
        }`}
      >
        {price.toFixed(4)}
      </div>
    </button>
  );
}

/**
 * Two-layer Yes/No switch: outcome label above, price bar below. In a binary
 * market it picks the Yes or No option; otherwise it picks the side.
 */
export function SideToggle({ yesLabel, noLabel, yesPrice, noPrice, yesSelected, onYes, onNo }: SideToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-1 bg-muted/30 rounded-lg">
      <SideButton label={yesLabel} price={yesPrice} selected={yesSelected} tone="yes" onClick={onYes} />
      <SideButton label={noLabel} price={noPrice} selected={!yesSelected} tone="no" onClick={onNo} />
    </div>
  );
}
