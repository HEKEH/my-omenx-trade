import { describe, expect, it } from "vitest";
import { marketRepository } from "../../infrastructure/repositories";
import { buildPlacedOrder, ctaLabel, deriveTicket, orderProblem, quickMargin, quoteOrder, REFERENCE_FORM_BALANCE } from ".";

const market = (id: string) => {
  const found = marketRepository.getById(id);
  if (!found) throw new Error(id);
  return found;
};

describe("deriveTicket (dev reference §5.7)", () => {
  // Values from scripts/sports-visual/ref-goldens.ts (reference deriveTradeFormProps).
  it("3-way: alias + YES/NO label, NO priced 100 − ¢", () => {
    const ticket = deriveTicket({ market: market("wc26-usa-par"), outcomeId: "d", side: "no" });
    expect(ticket).toMatchObject({ formOutcome: "no", formLabel: "Draw NO", formPrice: 71, needsSideToggle: true });
    expect(ticket.selected.id).toBe("d");
  });

  it("falls back to the highest-priced outcome when none is selected", () => {
    const ticket = deriveTicket({ market: market("wc26-usa-par"), outcomeId: undefined, side: "yes" });
    expect(ticket).toMatchObject({ formOutcome: "yes", formLabel: "USA YES", formPrice: 48 });
    expect(ticket.selected.id).toBe("h");
  });

  it("binary: the second outcome is the NO tone, labelled with the team name", () => {
    const binary = market("liv-new");
    const ticket = deriveTicket({ market: binary, outcomeId: binary.outcomes[1].id, side: "yes" });
    expect(ticket).toMatchObject({ formOutcome: "no", formLabel: "Newcastle", formPrice: 37, needsSideToggle: false });
  });
});

describe("quoteOrder (dev reference §5.7, TradeForm.tsx:74-90)", () => {
  const base = { type: "market" as const, price: 48, limitInput: "48", outcome: "yes" as const, balance: REFERENCE_FORM_BALANCE };

  it("1× market order: no liquidation price", () => {
    expect(quoteOrder({ ...base, margin: 100, leverage: 1 })).toEqual({
      px: 48,
      notional: 100,
      shares: 208.33333333333334,
      fee: 0.2,
      pnlAtSettle: 51.8,
      liq: 0,
    });
  });

  it("leveraged YES: liq = px − 90% of the balance over notional, clamped to 1..99", () => {
    expect(quoteOrder({ ...base, margin: 100, leverage: 5 })).toMatchObject({ notional: 500, fee: 1, pnlAtSettle: 259, liq: 1 });
    expect(quoteOrder({ ...base, margin: 1000, leverage: 20 })).toMatchObject({ notional: 20000, liq: 26 });
  });

  it("leveraged NO: liq is above px", () => {
    expect(quoteOrder({ ...base, price: 71, limitInput: "71", outcome: "no", margin: 2000, leverage: 3 })).toMatchObject({
      shares: 8450.704225352114,
      fee: 12,
      pnlAtSettle: 1728.0000000000002,
      liq: 99,
    });
  });

  it("limit orders price at the input, falling back to the market price when it is not a number (BUG-6)", () => {
    expect(quoteOrder({ ...base, type: "limit", limitInput: "40", margin: 100, leverage: 1 }).px).toBe(40);
    expect(quoteOrder({ ...base, type: "limit", limitInput: "abc", margin: 100, leverage: 1 }).px).toBe(48);
    expect(quoteOrder({ ...base, type: "limit", limitInput: "", margin: 100, leverage: 1 }).px).toBe(48);
  });

  it("zero margin quotes to zero", () => {
    expect(quoteOrder({ ...base, margin: 0, leverage: 5 })).toMatchObject({ notional: 0, shares: 0, fee: 0, pnlAtSettle: 0, liq: 0 });
  });

  it("the page never passes a balance, so the form uses 5000 (BUG-1)", () => {
    expect(REFERENCE_FORM_BALANCE).toBe(5000);
    expect([25, 50, 75, 100].map((pct) => quickMargin(REFERENCE_FORM_BALANCE, pct))).toEqual([1250, 2500, 3750, 5000]);
  });
});

describe("CTA and submit checks (TradeForm.tsx:116-164)", () => {
  it("shows leverage only above 1×, price rounded", () => {
    expect(ctaLabel({ side: "buy", label: "USA YES", leverage: 1, px: 48 })).toBe("Buy USA YES @ 48¢");
    expect(ctaLabel({ side: "sell", label: "Draw NO", leverage: 5, px: 70.6 })).toBe("Sell Draw NO 5× @ 71¢");
  });

  it("reports the first problem: TP/SL, then margin, then balance", () => {
    expect(orderProblem({ hasTpSlError: true, margin: 0, balance: 5000 })).toBe("tpsl");
    expect(orderProblem({ hasTpSlError: false, margin: 0, balance: 5000 })).toBe("no-margin");
    expect(orderProblem({ hasTpSlError: false, margin: 5001, balance: 5000 })).toBe("insufficient");
    expect(orderProblem({ hasTpSlError: false, margin: 5000, balance: 5000 })).toBeNull();
  });

  it("builds the placed order with the price rounded", () => {
    const quote = quoteOrder({ type: "limit", price: 48, limitInput: "40.4", margin: 100, leverage: 2, outcome: "yes", balance: 5000 });
    expect(
      buildPlacedOrder({ side: "buy", type: "limit", outcome: "yes", outcomeLabel: "USA YES", margin: 100, leverage: 2, quote, tp: 60, sl: null }),
    ).toEqual({
      side: "buy",
      type: "limit",
      outcome: "yes",
      outcomeLabel: "USA YES",
      price: 40,
      margin: 100,
      leverage: 2,
      notional: 200,
      shares: quote.shares,
      fee: 0.4,
      liq: quote.liq,
      tp: 60,
      sl: null,
      label: "Buy USA YES 2× @ 40¢",
    });
  });
});
