import { clamp, round4, type BookLevel, type OrderBook } from "../../domain";
import type {
  MarketDataFeed,
  MarketDataSnapshot,
  MarketStats,
  RecentTrade,
  ReferenceIndicator,
  Unsubscribe,
} from "../../application";
import type { Random } from "../mock-server";

/*
 * Order book, recent trades and 24h stats. The reference generates all of
 * these in the browser (DesktopTrading.tsx:109-138, DesktopOrderBook.tsx);
 * there is no backend API, so this stays a local generator using the same
 * rules, centred on the option's live price.
 */

const LEVELS = 12;
const LEVEL_STEP = 0.0005;
const BOOK_INTERVAL_MS = 500;
const TRADE_INTERVAL_MS = 1500;
const MAX_TRADES = 20;

// The reference hard-codes the header's 24h volume and open interest, and
// attaches a tracked quantity to some events by name (useEvents.ts:147-176).
// Here that mapping is explicit per event id.
const HEADER_STATS = { volume24h: "$2.45M", openInterest: "$480K" };

const INDICATORS: Record<string, ReferenceIndicator> = {
  "1": { kind: "tweets", value: "1847" },
  "2": { kind: "price", value: "$104,567.89", change24h: "+1.56%" },
  "3": { kind: "price", value: "$3,456.78", change24h: "+2.34%" },
  "5": { kind: "price", value: "6,234.56", change24h: "+0.45%" },
};

const pad = (value: number) => String(value).padStart(2, "0");
const clockTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

export interface MarketDataFeedOptions {
  random: Random;
  /** Live Yes price of an option. */
  priceOf: (optionId: string) => number | undefined;
  /** When true, ticks are skipped so the page holds still. */
  frozen: () => boolean;
  now?: () => Date;
}

export class MockMarketDataFeed implements MarketDataFeed {
  private readonly now: () => Date;

  constructor(private readonly options: MarketDataFeedOptions) {
    this.now = options.now ?? (() => new Date());
  }

  subscribe(optionId: string, listener: (snapshot: MarketDataSnapshot) => void): Unsubscribe {
    const { random } = this.options;
    const price = () => this.options.priceOf(optionId) ?? 0.5;
    const amounts = {
      asks: Array.from({ length: LEVELS }, () => Math.floor(random() * 50_000 + 500)),
      bids: Array.from({ length: LEVELS }, () => Math.floor(random() * 50_000 + 500)),
    };
    const trades: RecentTrade[] = Array.from({ length: MAX_TRADES }, (_, index) =>
      this.randomTrade(price(), new Date(this.now().getTime() - index * TRADE_INTERVAL_MS)),
    );
    let buyRatio = 40;
    let newTrade: RecentTrade | null = null;

    const book = (base: number): OrderBook<BookLevel> => ({
      asks: amounts.asks.map((amount, index) => ({ price: round4(base + LEVEL_STEP * (index + 1)), amount })),
      bids: amounts.bids.map((amount, index) => ({ price: round4(Math.max(0, base - LEVEL_STEP * (index + 1))), amount })),
    });
    const emit = () => {
      const base = round4(price());
      listener({ book: book(base), trades: [...trades], newTrade, midPrice: base, buyRatio });
      newTrade = null;
    };

    const bookTimer = setInterval(() => {
      if (this.options.frozen()) return;
      for (const side of [amounts.asks, amounts.bids]) {
        side.forEach((amount, index) => {
          if (random() < 0.3) side[index] = Math.max(100, amount + Math.floor((random() - 0.4) * 5000));
        });
      }
      buyRatio = clamp(buyRatio + (random() - 0.5) * 5, 10, 90);
      emit();
    }, BOOK_INTERVAL_MS);

    const tradeTimer = setInterval(() => {
      if (this.options.frozen()) return;
      newTrade = this.randomTrade(price(), this.now());
      trades.unshift(newTrade);
      trades.length = Math.min(trades.length, MAX_TRADES);
      emit();
    }, TRADE_INTERVAL_MS);

    emit();
    return () => {
      clearInterval(bookTimer);
      clearInterval(tradeTimer);
    };
  }

  stats(eventId: string): MarketStats {
    return { ...HEADER_STATS, indicator: INDICATORS[eventId] ?? null };
  }

  private randomTrade(base: number, at: Date): RecentTrade {
    const { random } = this.options;
    return {
      price: round4(clamp(base + (random() - 0.5) * 0.002, 0.0001, 0.9999)),
      amount: Math.floor(random() * 5000 + 100),
      time: clockTime(at),
      side: random() > 0.5 ? "buy" : "sell",
    };
  }
}
