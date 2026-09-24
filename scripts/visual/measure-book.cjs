// Compares the chart card (tabs + price bar) and the order book card of the reference and the replica.
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");

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
  const box = (el, withPos = true) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      ...(withPos ? { x: round(r.x), y: round(r.y) } : {}),
      w: round(r.width), h: round(r.height),
      pad: s.padding, gap: s.gap, radius: s.borderRadius,
      border: `${s.borderTopWidth}/${s.borderBottomWidth} ${rgba(s.borderTopColor)}`,
      bg: rgba(s.backgroundColor), color: rgba(s.color),
      font: `${s.fontSize}/${s.lineHeight} ${s.fontWeight} ${s.fontFamily.split(",")[0]}`,
    };
  };
  const root = [...document.querySelectorAll("div")].find((el) => el.classList.contains("h-screen") && el.classList.contains("flex-col"));
  const body = [...root.children].find((el) => el.classList.contains("flex-1") && el.classList.contains("overflow-hidden"));
  const topRow = body.children[0].children[0];
  const chart = topRow.children[0];
  const bookCard = topRow.children[1];
  const book = bookCard.children[0];
  const [tabs, controls, columns, asks, mid, bids, ratio] = [...book.children];
  const priceBar = chart.children[1];
  return {
    chartTabs: box(chart.children[0]),
    chartTab: box(chart.children[0].children[0]),
    priceBar: box(priceBar),
    lastPrice: box(priceBar.children[0], false),
    change: box(priceBar.children[1], false),
    mark: box(priceBar.children[2], false),
    chartArea: { h: round(chart.children[2].getBoundingClientRect().height) },
    book: box(book),
    bookTabs: box(tabs),
    bookTabActive: box(tabs.querySelector("button"), false),
    controls: box(controls),
    viewIcon: box(controls.querySelector("button")),
    stepButton: box(controls.querySelector(".relative button")),
    columns: box(columns),
    asks: { h: round(asks.getBoundingClientRect().height), rows: asks.children.length },
    askRow: box(asks.children[asks.children.length - 1]),
    askPrice: box(asks.children[asks.children.length - 1]?.children[1], false),
    askDepth: { ...box(asks.children[0]?.children[0], false), w: undefined },
    mid: box(mid),
    midPrice: box(mid.querySelector(".text-lg"), false),
    bids: { h: round(bids.getBoundingClientRect().height), rows: bids.children.length },
    bidRow: box(bids.children[0]),
    ratio: box(ratio),
    ratioBar: box(ratio.querySelector(".h-1\\.5")),
    ratioTag: box(ratio.querySelector("span"), false),
  };
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const out = {};
  for (const [name, base] of [["ref", "http://localhost:8080/trade"], ["new", "http://localhost:3000/trade"]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(base + eventQuery, { waitUntil: "networkidle2" });
    await page.waitForFunction(() => document.body.innerText.includes("Order Book") && document.body.innerText.includes("Price(USDT)"), { timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 800));
    out[name] = await page.evaluate(probe);
    await page.close();
  }
  await browser.close();
  const flat = (o, p = "") => Object.entries(o ?? {}).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  for (const key of Object.keys(out.ref)) {
    const fb = Object.fromEntries(flat(out.new[key]));
    const diffs = flat(out.ref[key]).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(fb[k]));
    console.log(`${key.padEnd(14)} ${diffs.length ? diffs.map(([k, v]) => `${k}: ${JSON.stringify(v)} vs ${JSON.stringify(fb[k])}`).join(" | ") : "SAME"}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
