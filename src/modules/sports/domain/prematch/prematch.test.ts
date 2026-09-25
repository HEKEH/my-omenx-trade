import { describe, expect, it } from "vitest";
import { marketRepository } from "../../infrastructure/repositories";
import { formatCountdown, preMatchInfo } from ".";

// Values from scripts/sports-visual/ref-goldens.ts (reference PreMatchStrip helpers).
describe("pre-match strip (dev reference §5.3)", () => {
  it("formations, weather and the kickoff offset come from the market id", () => {
    expect(preMatchInfo(marketRepository.getById("che-psg-2025-ucl")!)).toEqual({
      homeFormation: "4-2-3-1",
      awayFormation: "3-5-2",
      weather: { label: "Clear · 18°C", icon: "☀️" },
      offsetMs: 19136000,
    });
    expect(preMatchInfo(marketRepository.getById("wc26-usa-par")!)).toEqual({
      homeFormation: "4-3-3",
      awayFormation: "4-2-3-1",
      weather: { label: "Light rain · 12°C", icon: "🌦️" },
      offsetMs: 19490000,
    });
  });

  it("countdown splits into zero-padded d / h / m / s, never negative", () => {
    expect([0, 59_999, 3_723_000, 90_061_000, -5].map(formatCountdown)).toEqual([
      { d: "00", h: "00", m: "00", s: "00" },
      { d: "00", h: "00", m: "00", s: "59" },
      { d: "00", h: "01", m: "02", s: "03" },
      { d: "01", h: "01", m: "01", s: "01" },
      { d: "00", h: "00", m: "00", s: "00" },
    ]);
  });
});
