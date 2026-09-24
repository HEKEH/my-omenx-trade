import { FUNDING_INTERVAL_MS, binaryOutcome, clamp, isBinaryMarket, randomFundingRate, round4, sidePrice } from "../../domain";
import type { EventOptionRow, TradeRow } from "../supabase-shape/rows";
import type { MockDatabase } from "./db";

export type Random = () => number;

/** Small deterministic PRNG (mulberry32) so mock runs can be replayed. */
export const seededRandom = (seed: number): Random => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const BINARY_VOLATILITY = 0.03;
const MULTI_VOLATILITY = 0.02;
const HOUR_MS = 3_600_000;

/** One step of the reference `update-prices` walk: noise plus pull toward 0.5. */
export const walkPrice = (price: number, volatility: number, random: Random) => {
  const change = (random() - 0.5) * 2 * volatility;
  const meanReversion = (0.5 - price) * 0.01;
  // Four decimals (the reference rounds to two, which flattens small options).
  return round4(clamp(price + change + meanReversion, 0.01, 0.99));
};

/** New prices for one event's options, keyed by option id. */
export const nextEventPrices = (options: readonly EventOptionRow[], random: Random): Map<string, number> => {
  const prices = new Map<string, number>();
  if (isBinaryMarket(options)) {
    const yes = options.find((option) => binaryOutcome(option.label) === "yes")!;
    const no = options.find((option) => binaryOutcome(option.label) === "no")!;
    const yesPrice = walkPrice(yes.price, BINARY_VOLATILITY, random);
    prices.set(yes.id, yesPrice);
    prices.set(no.id, round4(1 - yesPrice));
    return prices;
  }
  const walked = options.map((option) => walkPrice(option.price, MULTI_VOLATILITY, random));
  const sum = walked.reduce((total, price) => total + price, 0);
  options.forEach((option, index) => prices.set(option.id, round4(walked[index] / sum)));
  return prices;
};

/** Side price a pending order would fill at right now. */
const fillablePrice = (trade: TradeRow, option: EventOptionRow, binary: boolean) =>
  binary ? option.price : sidePrice(option.price, trade.side === "buy" ? "long" : "short");

export interface SimulatorOptions {
  random: Random;
  now?: () => Date;
  priceIntervalMs?: number;
  fundingIntervalMs?: number;
  /** Called for each pending limit order whose price has been reached. */
  onLimitReached?: (trade: TradeRow) => void;
  /** Called on the funding cadence to accrue funding on open positions. */
  onFundingTick?: () => void;
}

/**
 * The mock backend's background jobs: the price walk (with funding-rate
 * refreshes) and the funding cadence. `freeze()` stops all of them so
 * screenshots and pixel comparisons stay stable.
 */
export class MarketSimulator {
  private timers: ReturnType<typeof setInterval>[] = [];
  private readonly now: () => Date;

  constructor(
    private readonly db: MockDatabase,
    private readonly options: SimulatorOptions,
  ) {
    this.now = options.now ?? (() => new Date());
  }

  get running() {
    return this.timers.length > 0;
  }

  start() {
    if (this.running) return;
    this.timers.push(setInterval(() => this.tick(), this.options.priceIntervalMs ?? 3000));
    if (this.options.onFundingTick) {
      this.timers.push(setInterval(() => this.options.onFundingTick?.(), this.options.fundingIntervalMs ?? FUNDING_INTERVAL_MS));
    }
  }

  freeze() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  /** One price update across every open event, then limit-order checks. */
  tick() {
    const now = this.now();
    const openEvents = new Set(this.db.rows("events").filter((event) => !event.is_resolved).map((event) => event.id));
    const allOptions = this.db.rows("event_options").filter((option) => openEvents.has(option.event_id));
    const byEvent = Map.groupBy(allOptions, (option) => option.event_id);

    for (const options of byEvent.values()) {
      const prices = nextEventPrices(options, this.options.random);
      for (const option of options) {
        const refreshFunding = !option.next_funding_at || new Date(option.next_funding_at) <= now;
        this.db.update("event_options", (row) => row.id === option.id, {
          price: prices.get(option.id) ?? option.price,
          updated_at: now.toISOString(),
          ...(refreshFunding && {
            funding_rate: randomFundingRate(this.options.random),
            next_funding_at: new Date(now.getTime() + HOUR_MS).toISOString(),
          }),
        });
      }
    }
    this.checkLimitOrders();
  }

  /** Buy limits fill once the side price drops to the limit, at the limit (whole order). */
  checkLimitOrders() {
    if (!this.options.onLimitReached) return;
    const events = this.db.rows("events");
    const options = this.db.rows("event_options");
    for (const trade of this.db.rows("trades").filter((row) => row.status === "Pending" && row.order_type === "Limit")) {
      const event = events.find((row) => row.name === trade.event_name);
      if (!event) continue;
      const eventOptions = options.filter((option) => option.event_id === event.id);
      const option = eventOptions.find((row) => row.label === trade.option_label);
      if (!option) continue;
      if (fillablePrice(trade, option, isBinaryMarket(eventOptions)) <= trade.price) {
        this.options.onLimitReached(trade);
      }
    }
  }
}
