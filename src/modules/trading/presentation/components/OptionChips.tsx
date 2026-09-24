"use client";

import type { OutcomeOption } from "../../domain";
import { formatPrice } from "../format";

interface OptionChipsProps {
  options: readonly OutcomeOption[];
  selectedOptionId: string | undefined;
  onSelect: (optionId: string) => void;
}

/** Option switcher for multi-outcome events (binary events never show it). */
export function OptionChips({ options, selectedOptionId, onSelect }: OptionChipsProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 overflow-x-auto scrollbar-hide">
      <span className="text-xs text-muted-foreground flex-shrink-0">Select Option:</span>
      {options.map((option) => {
        const selected = option.id === selectedOptionId;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selected
                ? "bg-trading-purple/20 border border-trading-purple text-foreground"
                : "bg-muted border border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{option.label}</span>
            <span className={`ml-2 font-mono ${selected ? "text-trading-purple" : ""}`}>{formatPrice(option.price)}</span>
          </button>
        );
      })}
    </div>
  );
}
