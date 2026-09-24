"use client";

import { useState } from "react";
import { AlertTriangle, Ban, Eye, EyeOff, Info, ShieldCheck, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RiskLevel } from "../../../domain";
import { useAccountRisk } from "../../hooks/usePositionRows";

// Full class names (Tailwind only generates what it sees). Orange uses the
// Tailwind 3 palette value, as Tailwind 4 redefined it (R-6 ⑧).
const LEVEL_STYLE: Record<RiskLevel, { text: string; bar: string; badge: string }> = {
  SAFE: { text: "text-trading-green", bar: "bg-trading-green", badge: "bg-trading-green/20" },
  WARNING: { text: "text-trading-yellow", bar: "bg-trading-yellow", badge: "bg-trading-yellow/20" },
  RESTRICTION: { text: "text-[#f97316]", bar: "bg-[#f97316]", badge: "bg-[#f97316]/20" },
  LIQUIDATION: { text: "text-trading-red", bar: "bg-trading-red", badge: "bg-trading-red/20" },
};

const LEVEL_ICON: Record<RiskLevel, typeof ShieldCheck> = {
  SAFE: ShieldCheck,
  WARNING: AlertTriangle,
  RESTRICTION: Ban,
  LIQUIDATION: Zap,
};

const LEVEL_MESSAGE: Record<Exclude<RiskLevel, "SAFE">, { icon: string; text: string; box: string }> = {
  WARNING: {
    icon: "⚠️",
    text: "Opening restricted, consider reducing",
    box: "bg-trading-yellow/10 text-trading-yellow border border-trading-yellow/30",
  },
  RESTRICTION: {
    icon: "🚨",
    text: "Close-only mode, no new positions",
    box: "bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30",
  },
  LIQUIDATION: { icon: "💥", text: "Liquidation triggered!", box: "bg-trading-red/10 text-trading-red border border-trading-red/30" },
};

/** Unified account risk card (reference AccountRiskIndicator, compact variant). Display only. */
export function AccountRiskCard() {
  const risk = useAccountRisk();
  const [showValues, setShowValues] = useState(true);
  const style = LEVEL_STYLE[risk.level];
  const Icon = LEVEL_ICON[risk.level];
  const hidden = (text: string) => (showValues ? text : "****");

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Unified Trading Account</span>
          <button type="button" onClick={() => setShowValues((value) => !value)} className="text-muted-foreground hover:text-foreground transition-colors">
            {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
              <Info className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[280px]">
            <div className="space-y-2 text-xs">
              <p>
                <strong>Risk Ratio</strong> = IM / Equity
              </p>
              <p>
                <strong>IM (Initial Margin):</strong> Entry threshold - determines if you can open positions.
              </p>
              <p>
                <strong>MM (Maintenance Margin):</strong> Survival line - determines if you&apos;ll be liquidated.
              </p>
              <p>
                <strong>Equity:</strong> Your real wealth - determines how much you can still lose.
              </p>
              <div className="pt-1 border-t border-border/50 space-y-1">
                <p className="text-trading-green">SAFE: &lt;80% - Normal trading</p>
                <p className="text-trading-yellow">WARNING: 80-95% - Reduce positions</p>
                <p className="text-[#f97316]">RESTRICTION: 95-100% - Close only</p>
                <p className="text-trading-red">LIQUIDATION: ≥100% - Force close</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Margin Mode</span>
        <span className="text-xs text-foreground">Cross Margin</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Account Equity</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-foreground">{hidden(`$${risk.equity.toFixed(2)}`)}</span>
          {risk.unrealizedPnl !== 0 && showValues && (
            <span className={`text-[10px] font-mono ${risk.unrealizedPnl >= 0 ? "text-trading-green" : "text-trading-red"}`}>
              ({risk.unrealizedPnl >= 0 ? "+" : ""}
              {risk.unrealizedPnl.toFixed(2)})
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Risk Ratio</span>
            <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${style.badge} ${style.text}`}>
              <Icon className="w-3.5 h-3.5" />
              {risk.level}
            </span>
          </div>
          <span className={`text-xs font-mono font-semibold ${style.text}`}>{hidden(`${risk.riskRatio.toFixed(2)}%`)}</span>
        </div>
        <div className="relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
              style={{ width: `${Math.min(risk.riskRatio, 100)}%` }}
            />
          </div>
          <div className="absolute top-0 left-[80%] w-px h-2 bg-trading-yellow/50" />
          <div className="absolute top-0 left-[95%] w-px h-2 bg-[#f97316]/50" />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>0%</span>
          <span className="text-trading-yellow">80%</span>
          <span className="text-[#f97316]">95%</span>
          <span className="text-trading-red">100%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
        <div>
          <span className="text-[10px] text-muted-foreground">Initial Margin</span>
          <p className="text-xs font-mono text-foreground">{hidden(`$${risk.initialMargin.toFixed(2)}`)}</p>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Maint. Margin</span>
          <p className="text-xs font-mono text-foreground">{hidden(`$${risk.maintenanceMargin.toFixed(2)}`)}</p>
        </div>
      </div>

      {risk.level !== "SAFE" && risk.hasPositions && (
        <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${LEVEL_MESSAGE[risk.level].box}`}>
          <span>{LEVEL_MESSAGE[risk.level].icon}</span>
          <span>{LEVEL_MESSAGE[risk.level].text}</span>
        </div>
      )}
    </div>
  );
}
