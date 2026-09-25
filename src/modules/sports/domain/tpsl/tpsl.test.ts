import { describe, expect, it } from "vitest";
import { previewTpSlPnl, validateTpSl, type TpSlInput } from ".";

// Inputs and expected values from scripts/sports-visual/ref-goldens.ts (reference lib/tpsl.ts),
// previews with notional 300 and fee 0.6.
const cases: { input: TpSlInput; tpError: string | null; slError: string | null; tpPnl: number | null; slPnl: number | null }[] = [
  { input: { side: "yes", entry: 48, liq: 30, leverage: 3, tp: 60, sl: 35 }, tpError: null, slError: null, tpPnl: 35.4, slPnl: -39.6 },
  { input: { side: "yes", entry: 48, liq: 30, leverage: 3, tp: 40, sl: 25 }, tpError: "must be > 48¢", slError: "must be > liq 30¢", tpPnl: null, slPnl: null },
  { input: { side: "no", entry: 52, liq: 70, leverage: 2, tp: 60, sl: 75 }, tpError: "must be < 52¢", slError: "must be < liq 70¢", tpPnl: null, slPnl: null },
  { input: { side: "no", entry: 52, liq: 70, leverage: 1, tp: 40, sl: 75 }, tpError: null, slError: null, tpPnl: 35.4, slPnl: -69.6 },
  { input: { side: "yes", entry: 48, liq: 0, leverage: 1, tp: 120, sl: null }, tpError: "0–100¢", slError: null, tpPnl: null, slPnl: null },
];

describe("TP/SL (dev reference §5.7, lib/tpsl.ts)", () => {
  it.each(cases)("$input.side entry $input.entry lev $input.leverage tp $input.tp sl $input.sl", (c) => {
    expect(validateTpSl(c.input)).toEqual({ tpError: c.tpError, slError: c.slError, hasError: !!c.tpError || !!c.slError });
    expect(previewTpSlPnl({ ...c.input, notional: 300, fee: 0.6 })).toEqual({ tpPnl: c.tpPnl, slPnl: c.slPnl });
  });

  it("SL on the wrong side of entry at 1× names the entry, not the liquidation price", () => {
    expect(validateTpSl({ side: "yes", entry: 48, liq: 0, leverage: 1, tp: null, sl: 50 }).slError).toBe("must be < 48¢");
    expect(validateTpSl({ side: "no", entry: 52, liq: 70, leverage: 3, tp: null, sl: 50 }).slError).toBe("must be > 52¢");
  });

  it("both unset is valid and previews nothing", () => {
    const input: TpSlInput = { side: "yes", entry: 48, liq: 30, leverage: 3, tp: null, sl: null };
    expect(validateTpSl(input).hasError).toBe(false);
    expect(previewTpSlPnl({ ...input, notional: 300, fee: 0.6 })).toEqual({ tpPnl: null, slPnl: null });
  });

  it("NaN input is out of range", () => {
    expect(validateTpSl({ side: "yes", entry: 48, liq: 0, leverage: 1, tp: Number.NaN, sl: null }).tpError).toBe("0–100¢");
  });
});
