"use client";

import type { MarketListing } from "../../../application";
import {
  binaryOutcome,
  isBinaryMarket,
  isBlocked,
  tradePrices,
  yesNoOptions,
  type Market,
  type OutcomeOption,
} from "../../../domain";
import { formatInteger } from "../../format";
import { useOrderPreview } from "../../hooks/useOrderPreview";
import { useTrade, useTradeActions, useTradeForm, useTradeFormActions } from "../../hooks/useTrade";
import { intentLabel } from "../../intentLabel";
import {
  AvailableBalance,
  LeverageControl,
  LimitPriceInput,
  MarginModeSelect,
  OrderSummary,
  OrderTypeTabs,
  PercentSlider,
  SizeInput,
  TpSlSection,
} from "./FormSections";
import { SideToggle } from "./SideToggle";
import { TradeSubmitButton } from "./TradeSubmitButton";

interface TradeFormCardProps {
  listing: MarketListing;
  market: Market;
  option: OutcomeOption | undefined;
  /** Opens the order preview (M8). */
  onPreview?: () => void;
}

/** Right-column trade card (reference DesktopTrading.tsx:1464-1845). */
export function TradeFormCard({ listing, market, option, onPreview }: TradeFormCardProps) {
  const side = useTrade((state) => state.side);
  const balance = useTrade((state) => state.account?.balance ?? 0);
  const actions = useTradeActions();
  const form = useTradeForm((state) => state);
  const formActions = useTradeFormActions();
  const preview = useOrderPreview(listing, market, option, side);

  const binary = isBinaryMarket(market.options);
  const labels = binary && market.sideLabels ? market.sideLabels : { yes: "Yes", no: "No" };
  const prices = tradePrices(market, option?.id);
  const yesSelected = binary ? binaryOutcome(option?.label) === "yes" : side === "buy";

  const chooseYes = () => {
    actions.setSide("buy");
    const { yes } = yesNoOptions(market.options);
    if (binary && yes) actions.selectOption(yes.id);
  };
  const chooseNo = () => {
    const { no } = yesNoOptions(market.options);
    if (binary && no) {
      // A binary No is its own long position on the No option.
      actions.setSide("buy");
      actions.selectOption(no.id);
    } else {
      actions.setSide("sell");
    }
  };

  const intent = preview?.quote.intent;
  const blocked = intent ? isBlocked(intent.kind) : false;
  const label = intent && option ? intentLabel(intent, side, option.label, binary ? market.sideLabels : undefined) : "";
  const closeAndContinue = () => {
    if (!intent || !preview) return;
    // Size the order to exactly the opposite position.
    const price = preview.quote.price;
    formActions.setSize(((intent.existingQty * price) / form.leverage).toFixed(2));
  };

  return (
    <>
      <div className="flex items-center px-4 py-2 border-b border-border/30">
        <span className="text-sm font-medium">Trade</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        <SideToggle
          yesLabel={labels.yes}
          noLabel={labels.no}
          yesPrice={prices.yes}
          noPrice={prices.no}
          yesSelected={yesSelected}
          onYes={chooseYes}
          onNo={chooseNo}
        />

        <MarginModeSelect value={form.marginMode} />
        <LeverageControl value={form.leverage} onChange={formActions.setLeverage} />
        <AvailableBalance balance={balance} />
        <OrderTypeTabs value={form.orderType} onChange={formActions.setOrderType} />

        {form.orderType === "Limit" && (
          <LimitPriceInput
            value={form.limitPrice || (preview ? preview.marketPrice.toFixed(4) : "")}
            onChange={formActions.setLimitPrice}
          />
        )}

        <SizeInput value={form.size} mode={form.inputMode} onChange={formActions.setSize} onToggleMode={formActions.toggleInputMode} />
        <PercentSlider value={form.percent} onChange={(percent) => formActions.setPercent(percent, balance)} />

        <TpSlSection
          enabled={form.tpSlEnabled}
          onToggle={formActions.toggleTpSl}
          tpValue={form.tpValue}
          slValue={form.slValue}
          tpMode={form.tpMode}
          slMode={form.slMode}
          tp={preview?.tp ?? null}
          sl={preview?.sl ?? null}
          onTpValue={formActions.setTpValue}
          onSlValue={formActions.setSlValue}
          onTpMode={formActions.setTpMode}
          onSlMode={formActions.setSlMode}
        />

        <OrderSummary
          hasSize={preview?.hasSize ?? false}
          notional={preview?.quote.cost.notional ?? 0}
          margin={preview?.quote.cost.margin ?? 0}
          fee={preview?.quote.cost.fee ?? 0}
          total={preview?.quote.cost.total ?? 0}
        />

        {blocked && intent && (
          <div className="space-y-2 rounded-lg border border-trading-red/30 bg-trading-red/10 px-3 py-2 text-[11px] text-trading-red">
            <p>{intent.blockReason}</p>
            {!binary && intent.kind === "blocked-cross-zero" && intent.existingQty > 0 && (
              <button type="button" onClick={closeAndContinue} className="text-foreground underline underline-offset-2">
                Close & Continue
              </button>
            )}
          </div>
        )}

        <TradeSubmitButton
          side={side}
          label={label}
          potentialWin={preview?.hasSize ? formatInteger(preview.quote.preview.potentialWin) : "0"}
          onClick={() => onPreview?.()}
          disabled={blocked}
        />
      </div>
    </>
  );
}
