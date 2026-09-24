"use client";

import { Flag } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPriceBare } from "../format";

/** Yellow mark price with the explanatory tooltip (used by the price bar and the order book). */
export function MarkPriceBadge({ price }: { price: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-sm text-trading-yellow font-mono flex items-center gap-1 cursor-help border-b border-dashed border-trading-yellow">
          <Flag className="w-3 h-3" /> {formatPriceBare(price)}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] p-3">
        <p className="text-sm">
          Mark price is derived by index price and funding rate, and reflects the fair market price. Liquidation is
          triggered by mark price.
        </p>
        <p className="text-sm text-trading-yellow mt-2 cursor-pointer">Click here for details</p>
      </TooltipContent>
    </Tooltip>
  );
}
