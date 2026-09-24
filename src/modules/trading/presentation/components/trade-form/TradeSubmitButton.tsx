"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderSide } from "../../../domain";

interface TradeSubmitButtonProps {
  side: OrderSide;
  label: string;
  /** Already formatted, e.g. "2,459". */
  potentialWin: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Trade call to action: label on the left, "To win $X →" on the right. */
export function TradeSubmitButton({
  side,
  label,
  potentialWin,
  onClick,
  disabled,
  loading,
  loadingText = "Processing...",
  size = "md",
  className,
}: TradeSubmitButtonProps) {
  const isBuy = side === "buy";
  const sizeClasses = size === "sm" ? "py-2 px-3" : size === "lg" ? "py-3.5 px-4" : "py-2.5 px-4";
  const labelClass = size === "sm" ? "text-[13px]" : "text-sm";
  const winClass = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "group relative w-full rounded-lg font-semibold transition-all duration-200",
        "active:scale-[0.98] hover:-translate-y-[1px]",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        "shadow-[0_4px_14px_-4px_hsl(var(--background))]",
        isBuy
          ? "bg-linear-to-b from-trading-green to-trading-green/85 text-trading-green-foreground hover:shadow-[0_8px_20px_-6px_hsl(var(--trading-green)/0.55)]"
          : "bg-linear-to-b from-trading-red to-trading-red/85 text-foreground hover:shadow-[0_8px_20px_-6px_hsl(var(--trading-red)/0.55)]",
        sizeClasses,
        className,
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className={labelClass}>{loadingText}</span>
        </span>
      ) : (
        <span className="flex items-center justify-between gap-3">
          <span className={cn("flex-1 text-left truncate", labelClass)}>{label}</span>
          <span className="flex items-center gap-1.5 shrink-0 opacity-90">
            <span className={cn("font-mono tracking-tight", winClass)}>
              To win <span className="font-semibold">${potentialWin}</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      )}
    </button>
  );
}
