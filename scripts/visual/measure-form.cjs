// Compares the trade form card of the reference (:8080) and the replica (:3000), section by section.
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");
const { emulateReferenceFonts } = require("./ref-fonts.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [width, height] = (process.argv[2] || "1440x900").split("x").map(Number);
const eventQuery = process.argv[3] || "";
// Optional setup run in the page before measuring, e.g. "limit" or "tpsl".
const setup = process.argv[4] || "";

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
      w: round(r.width), h: round(r.height),
      pad: s.padding, gap: s.gap, radius: s.borderRadius,
      border: `${s.borderTopWidth}/${s.borderBottomWidth} ${rgba(s.borderTopColor)}`,
      bg: s.backgroundImage !== "none" ? s.backgroundImage.replace(/oklab\([^)]*\)|rgb[a]?\([^)]*\)/g, (c) => rgba(c)) : rgba(s.backgroundColor),
      color: rgba(s.color),
      font: `${s.fontSize}/${s.lineHeight} ${s.fontWeight}`,
      shadow: s.boxShadow === "none" ? "none" : "set",
    };
  };
  const root = [...document.querySelectorAll("div")].find((el) => el.classList.contains("h-screen") && el.classList.contains("flex-col"));
  const body = [...root.children].find((el) => el.classList.contains("flex-1") && el.classList.contains("overflow-hidden"));
  const card = body.children[1].children[0];
  const [title, content] = card.children;
  const sections = [...content.children];
  const out = { card: box(card), title: box(title), content: box(content) };
  sections.forEach((section, index) => {
    out[`s${index}`] = { ...box(section), text: section.textContent.replace(/[\d.,]+/g, "#").slice(0, 40) };
  });
  const toggle = sections[0];
  out.yesTop = box(toggle.children[0].children[0]);
  out.yesBar = box(toggle.children[0].children[1]);
  out.noTop = box(toggle.children[1].children[0]);
  out.noBar = box(toggle.children[1].children[1]);
  const submit = sections[sections.length - 1];
  out.submitLabel = box(submit.querySelector("span span"));
  const slider = content.querySelector("[role=slider]");
  out.sliderThumb = box(slider);
  out.sliderTrack = box(slider?.closest("span[dir], span")?.parentElement?.querySelector("span"));
  return out;
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const out = {};
  for (const [name, base] of [["ref", "http://localhost:8080/trade"], ["new", "http://localhost:3000/trade"]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(base + eventQuery, { waitUntil: "networkidle2" });
    await emulateReferenceFonts(page, base);
    await page.waitForFunction(() => document.body.innerText.includes("Margin Mode"), { timeout: 30000 });
    if (setup === "limit") await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Limit").click());
    if (setup === "tpsl") await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("TP/SL")).click());
    if (setup === "no") await page.evaluate(() => [...document.querySelectorAll("button.relative.flex.flex-col")][1].click());
    await new Promise((resolve) => setTimeout(resolve, 500));
    out[name] = await page.evaluate(probe);
    await page.close();
  }
  await browser.close();
  const flat = (o, p = "") => Object.entries(o ?? {}).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  for (const key of new Set([...Object.keys(out.ref), ...Object.keys(out.new)])) {
    const fb = Object.fromEntries(flat(out.new[key]));
    const fa = flat(out.ref[key]);
    const diffs = fa.filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(fb[k]));
    console.log(`${key.padEnd(12)} ${!out.ref[key] || !out.new[key] ? `MISSING ref=${!!out.ref[key]} new=${!!out.new[key]}` : diffs.length ? diffs.map(([k, v]) => `${k}: ${JSON.stringify(v)} vs ${JSON.stringify(fb[k])}`).join(" | ") : "SAME"}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
