// Expected values for the sports domain tests, computed by the reference implementation
// itself (M3). Exported helpers are imported; private ones (buildSeed, genSeries, the tape
// and pre-match helpers) are cut out of the reference source and transpiled, so the numbers
// come from the reference's code, not from a re-reading of it. Run with bun from the
// reference project root:
//
//   cd ../omenx-sports && bun ../omenx-test/scripts/sports-visual/ref-goldens.ts
//
// and paste the printed values into the tests that cite this script.
import { readFileSync } from "node:fs";

const root = process.cwd();
const { ALL_MARKETS, getMarketById } = await import(`${root}/src/data/sports-markets.ts`);
const { validateTpSl, previewTpSlPnl } = await import(`${root}/src/lib/tpsl.ts`);
const { deriveTradeFormProps } = await import(`${root}/src/components/sports/trade/TradeOutcomePicker.tsx`);
const { getRelatedMarkets } = await import(`${root}/src/components/sports/event/related-markets.ts`);

// Bun global (this script only runs under bun; the project has no bun types).
declare const Bun: { Transpiler: new (options: { loader: "tsx" }) => { transformSync(code: string): string } };
const transpiler = new Bun.Transpiler({ loader: "tsx" });

/** Index just past the bracket that closes the one at `open`. */
function closing(src: string, open: number): number {
  const pairs: Record<string, string> = { "{": "}", "[": "]", "(": ")" };
  const openChar = src[open];
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === openChar) depth++;
    if (src[i] === pairs[openChar]) depth--;
    if (depth === 0) return i + 1;
  }
  throw new Error("unbalanced");
}

/**
 * Cuts a top-level `function name` or `const NAME = [...]` out of a source file. The file is
 * transpiled first, so type annotations (return types with braces) are already gone.
 */
function cut(file: string, header: string): string {
  const js = transpiler.transformSync(readFileSync(`${root}/${file}`, "utf8"));
  const start = js.indexOf(header);
  if (start < 0) throw new Error(`${header} not found in ${file}`);
  if (header.startsWith("function")) {
    const paramsEnd = closing(js, js.indexOf("(", start));
    return js.slice(start, closing(js, js.indexOf("{", paramsEnd)));
  }
  return `${js.slice(start, closing(js, js.indexOf("[", start)))};`;
}

function load<T>(parts: string[], exportNames: string[]): T {
  return new Function(`${parts.join("\n")}\nreturn { ${exportNames.join(", ")} };`)() as T;
}

const route = "src/routes/event.$id.tsx";
const seedFns = load<{ buildSeed: (market: unknown, league: string) => unknown; leagueKeyFromShort: (short: string) => string }>(
  [cut(route, "function clampPct"), cut(route, "function leagueKeyFromShort"), cut(route, "function buildSeed")],
  ["buildSeed", "leagueKeyFromShort"],
);
const chart = "src/components/sports/event/CombinedPriceChart.tsx";
const seriesFns = load<{ hashSeed: (s: string) => number; genSeries: (seed: number, endPrice: number) => number[] }>(
  [cut(chart, "function hashSeed"), cut(chart, "function genSeries")],
  ["hashSeed", "genSeries"],
);
const tape = "src/components/sports/event/LiveTape.tsx";
const tapeFns = load<{ rand: (seed: number) => () => number; fmtAgo: (s: number) => string; USERS: string[] }>(
  [cut(tape, "const USERS"), cut(tape, "function rand"), cut(tape, "function fmtAgo")],
  ["rand", "fmtAgo", "USERS"],
);
const pre = "src/components/sports/event/PreMatchStrip.tsx";
const preFns = load<{ hash: (s: string) => number; FORMATIONS: string[]; WEATHER: { label: string; icon: string }[]; fmt: (ms: number) => unknown }>(
  [cut(pre, "function hash"), cut(pre, "const FORMATIONS"), cut(pre, "const WEATHER"), cut(pre, "function fmt")],
  ["hash", "FORMATIONS", "WEATHER", "fmt"],
);

// LiveTape's seeded rows (LiveTape.tsx:58-80), with the component's draw order.
function seedTape(market: { id: string; outcomes: { price: number; label: string; team?: { name: string } }[] }, rows = 8) {
  const r = tapeFns.rand([...market.id].reduce((acc, c) => acc + c.charCodeAt(0), 0) + 17);
  const out = [];
  for (let i = 0; i < rows; i++) {
    const outcomeIdx = Math.floor(r() * market.outcomes.length);
    const o = market.outcomes[outcomeIdx];
    const px = Math.round(o.price * 100);
    const jitter = Math.floor(r() * 5) - 2;
    out.push({
      id: `seed-${i}`,
      user: tapeFns.USERS[Math.floor(r() * tapeFns.USERS.length)],
      outcomeIdx,
      outcomeLabel: o.team?.name ?? o.label,
      side: r() > 0.42 ? "buy" : "sell",
      price: Math.max(1, Math.min(99, px + jitter)),
      size: 10 + Math.floor(r() * 480),
      agoSec: 4 + i * 6 + Math.floor(r() * 9),
    });
  }
  return out;
}

const live = getMarketById("wc26-usa-par");
const binary = ALL_MARKETS.find((m: { outcomes: unknown[]; fixture?: unknown }) => m.outcomes.length === 2 && m.fixture);
const question = ALL_MARKETS.find((m: { outcomes: unknown[]; fixture?: unknown }) => m.outcomes.length > 3 && !m.fixture);
const preMatch = ALL_MARKETS.find((m: { fixture?: unknown; isLiveStream?: boolean }) => m.fixture && !m.isLiveStream);

const out = {
  ids: { live: live.id, binary: binary.id, question: question.id, preMatch: preMatch.id },
  leagueKeys: ["EPL", "LL", "UCL", "SA", "NBA", "WC", "MLS"].map((s) => [s, seedFns.leagueKeyFromShort(s)]),
  seed: {
    live: seedFns.buildSeed(live, seedFns.leagueKeyFromShort(live.league.short)),
    binary: seedFns.buildSeed(binary, seedFns.leagueKeyFromShort(binary.league.short)),
  },
  ticket: [
    deriveTradeFormProps({ market: live, outcomeId: "d", side: "no" }),
    deriveTradeFormProps({ market: live, outcomeId: undefined, side: "yes" }),
    deriveTradeFormProps({ market: binary, outcomeId: binary.outcomes[1].id, side: "yes" }),
  ].map(({ formOutcome, formLabel, formPrice, needsSideToggle, selected }) => ({ formOutcome, formLabel, formPrice, needsSideToggle, selected: selected.id })),
  tpsl: [
    { side: "yes", entry: 48, liq: 30, leverage: 3, tp: 60, sl: 35 },
    { side: "yes", entry: 48, liq: 30, leverage: 3, tp: 40, sl: 25 },
    { side: "no", entry: 52, liq: 70, leverage: 2, tp: 60, sl: 75 },
    { side: "no", entry: 52, liq: 70, leverage: 1, tp: 40, sl: 75 },
    { side: "yes", entry: 48, liq: 0, leverage: 1, tp: 120, sl: null },
  ].map((input) => ({ input, v: validateTpSl(input), p: previewTpSlPnl({ ...input, notional: 300, fee: 0.6 }) })),
  series: live.outcomes.map((o: { id: string; price: number }) => {
    const seeds = [0, 1, 2, 3, 4].map((bump) => seriesFns.hashSeed(`${live.id}:${o.id}`) + bump * 13);
    const values = seriesFns.genSeries(seeds[2], o.price);
    return { id: o.id, seeds, first: values.slice(0, 5), last: values.slice(-3), sum: Number(values.reduce((a, b) => a + b, 0).toFixed(2)) };
  }),
  tape: { live: seedTape(live), binary: seedTape(binary) },
  ago: [0, 1, 59, 60, 3599, 3600, 7300].map((s) => [s, tapeFns.fmtAgo(s)]),
  prematch: [preMatch, live].map((m: { id: string }) => {
    const seed = preFns.hash(m.id);
    return {
      id: m.id,
      seed,
      home: preFns.FORMATIONS[seed % preFns.FORMATIONS.length],
      away: preFns.FORMATIONS[(seed >> 3) % preFns.FORMATIONS.length],
      weather: preFns.WEATHER[seed % preFns.WEATHER.length],
      offsetMs: (preFns.hash(m.id) % (12 * 3600)) * 1000 + 30 * 60 * 1000,
    };
  }),
  countdown: [0, 59_999, 3_723_000, 90_061_000, -5].map((ms) => [ms, preFns.fmt(ms)]),
  related: [live, binary, question].map((m: { id: string }) => [m.id, getRelatedMarkets(m).map((r: { id: string }) => r.id)]),
};
console.log(JSON.stringify(out, null, 1));

export {};
