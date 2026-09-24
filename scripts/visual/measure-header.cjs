// Compares the header and option chips of the reference (:8080) and the replica (:3000).
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");
const { emulateReferenceFonts } = require("./ref-fonts.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [width, height] = (process.argv[2] || "1440x900").split("x").map(Number);
const eventQuery = process.argv[3] || "";

const probe = () => {
  const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true });
  const rgba = (color) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r},${g},${b},${Math.round((a / 255) * 100) / 100})`;
  };
  const round = (n) => Math.round(n * 100) / 100;
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height),
      pad: s.padding, gap: s.gap, radius: s.borderRadius,
      border: `${s.borderTopWidth} ${rgba(s.borderTopColor)}`,
      bg: rgba(s.backgroundColor), color: rgba(s.color),
      font: `${s.fontSize}/${s.lineHeight} ${s.fontWeight} ${s.fontFamily.split(",")[0]}`,
    };
  };
  const header = document.querySelector("header");
  const [left, strip] = [...header.children].filter((el) => el.tagName !== "BUTTON" || el.querySelector("svg.lucide-star"));
  const trigger = left?.children[0];
  const name = trigger?.querySelector("span.font-semibold");
  const endsRow = trigger?.querySelector(".text-xs");
  const countdown = endsRow?.querySelector(".font-mono");
  const indicator = [...(left?.children ?? [])].find((el) => el.className.includes("bg-indicator"));
  const stats = [...(strip?.children ?? [])];
  const chips = [...document.querySelectorAll("div")].find((el) => el.classList.contains("overflow-x-auto") && el.textContent.includes("Select Option"));
  const chipButtons = chips ? [...chips.querySelectorAll("button")] : [];
  const selectedChip = chipButtons.find((el) => el.className.includes("trading-purple"));
  const otherChip = chipButtons.find((el) => el !== selectedChip);
  return {
    header: box(header),
    left: box(left),
    trigger: box(trigger),
    name: box(name),
    endsRow: box(endsRow),
    countdown: box(countdown),
    indicator: box(indicator),
    indicatorValue: box(indicator?.querySelector(".font-mono")),
    strip: box(strip),
    ...Object.fromEntries(stats.map((el, i) => [`stat${i}`, { ...box(el), label: box(el.children[0]), value: box(el.children[1]) }])),
    star: box(header.lastElementChild),
    starIcon: box(header.lastElementChild?.querySelector("svg")),
    chipsRow: box(chips),
    chipLabel: box(chips?.querySelector("span")),
    selectedChip: box(selectedChip),
    selectedChipPrice: box(selectedChip?.querySelectorAll("span")[1]),
    otherChip: box(otherChip),
    chipCount: chipButtons.length,
  };
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const out = {};
  for (const [name, base] of [["ref", "http://localhost:8080/trade"], ["new", "http://localhost:3000/trade"]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(base + eventQuery, { waitUntil: "networkidle2" });
    await emulateReferenceFonts(page, base);
    await page.waitForFunction(() => document.querySelector("header"), { timeout: 30000 });
    out[name] = await page.evaluate(probe);
    await page.close();
  }
  await browser.close();
  const keys = Object.keys(out.ref);
  for (const key of keys) {
    const a = out.ref[key];
    const b = out.new[key];
    if (typeof a !== "object" || a === null || b === null || typeof b !== "object") {
      console.log(`${key.padEnd(18)} ${JSON.stringify(a) === JSON.stringify(b) ? "SAME" : `${JSON.stringify(a)} vs ${JSON.stringify(b)}`}`);
      continue;
    }
    const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
    const fb = Object.fromEntries(flat(b));
    const diffs = flat(a).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(fb[k]));
    console.log(`${key.padEnd(18)} ${diffs.length ? diffs.map(([k, v]) => `${k}: ${JSON.stringify(v)} vs ${JSON.stringify(fb[k])}`).join(" | ") : "SAME"}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
