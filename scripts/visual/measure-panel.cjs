// Compares the positions / orders panel. The reference is logged out, so its
// panel sits under a blurred auth gate; the blur is removed before measuring (R-1).
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");
const { emulateReferenceFonts } = require("./ref-fonts.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [width, height] = (process.argv[2] || "1440x900").split("x").map(Number);
const tab = process.argv[3] || "orders";

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
      h: round(r.height),
      pad: s.padding,
      border: `${s.borderTopWidth}/${s.borderBottomWidth} ${rgba(s.borderBottomColor)}`,
      bg: rgba(s.backgroundColor),
      color: rgba(s.color),
      font: `${s.fontSize}/${s.lineHeight} ${s.fontWeight}`,
      radius: s.borderRadius,
    };
  };
  const root = [...document.querySelectorAll("div")].find((el) => el.classList.contains("h-screen") && el.classList.contains("flex-col"));
  const body = [...root.children].find((el) => el.classList.contains("flex-1") && el.classList.contains("overflow-hidden"));
  const panel = body.children[0].children[1];
  const tabs = panel.children[0];
  const table = panel.querySelector("table");
  const firstRow = table?.querySelector("tbody tr");
  return {
    panelBorder: box(panel),
    tabs: box(tabs),
    activeTab: box([...tabs.querySelectorAll("button")].find((b) => b.className.includes("trading-purple"))),
    inactiveTab: box([...tabs.querySelectorAll("button")].find((b) => !b.className.includes("trading-purple"))),
    scroller: { maxH: getComputedStyle(table.parentElement.closest(".overflow-y-auto")).maxHeight },
    headerRow: box(table.querySelector("thead tr")),
    th: box(table.querySelector("th")),
    thRight: box([...table.querySelectorAll("th")].find((th) => getComputedStyle(th).textAlign === "right")),
    headers: [...table.querySelectorAll("th")].map((th) => th.textContent).join("|"),
    row: box(firstRow),
    cellFirst: box(firstRow?.children[0]),
    contract: box(firstRow?.children[0]?.children[0]),
    eventLine: box(firstRow?.children[0]?.querySelector(".text-xs")),
    monoCell: box(firstRow?.children[3]),
    badge: box(firstRow?.querySelector("span.rounded")),
    actionButton: box([...(firstRow?.querySelectorAll("button") ?? [])].pop()),
  };
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const out = {};
  for (const [name, base] of [["ref", "http://localhost:8080/trade"], ["new", "http://localhost:3000/trade"]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(base, { waitUntil: "networkidle2" });
    await emulateReferenceFonts(page, base);
    await page.waitForFunction(() => document.body.innerText.includes("Current Orders"), { timeout: 30000 });
    // Remove the reference's auth-gate blur and overlay (no-op on the replica).
    await page.evaluate(() => {
      document.querySelectorAll(".blur-\\[3px\\]").forEach((el) => {
        el.classList.remove("blur-[3px]", "opacity-70", "pointer-events-none");
      });
    });
    if (tab === "positions") {
      await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.startsWith("Positions")).click());
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    out[name] = await page.evaluate(probe);
    await page.close();
  }
  await browser.close();
  const flat = (o, p = "") => Object.entries(o ?? {}).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  for (const key of Object.keys(out.ref)) {
    const a = out.ref[key];
    const b = out.new[key];
    if (typeof a !== "object" || a === null) {
      console.log(`${key.padEnd(13)} ${a === b ? "SAME" : `${JSON.stringify(a)} vs ${JSON.stringify(b)}`}`);
      continue;
    }
    const fb = Object.fromEntries(flat(b));
    const diffs = flat(a).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(fb[k]));
    console.log(`${key.padEnd(13)} ${diffs.length ? diffs.map(([k, v]) => `${k}: ${JSON.stringify(v)} vs ${JSON.stringify(fb[k])}`).join(" | ") : "SAME"}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
