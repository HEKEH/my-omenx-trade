// Node-by-node comparison of whole regions. Walks the reference and replica DOM
// subtrees of each region in parallel and compares every element: box relative to
// the region, spacing, typography, colours, borders, shadows, leaf text and SVG
// path data (catches icon differences). Best run with REF_BACKEND=1 REF_FONTS=1,
// so both pages show the same data in the same fonts.
//
//   node measure-tree.cjs [WxH] [region,region,...]
//
// Regions: header, chips, chart, book, form, panel, risk, and the overlays
// cancel, close, tpsl, detail, preview, dropdown, indicator (opened on both pages).
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");
const { emulateReferenceFonts } = require("./ref-fonts.cjs");
const { attachReferenceBackend } = require("./ref-backend.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [width, height] = (process.argv[2] || "1440x900").split("x").map(Number);
const ALL = ["header", "chips", "chart", "book", "form", "panel", "risk", "cancel", "close", "tpsl", "detail", "preview", "dropdown", "indicator"];
const wanted = process.argv[3] ? process.argv[3].split(",") : ALL;
const MAX_DIFFS = Number(process.env.MAX_DIFFS || 25);

// In-page helpers: region roots and the actions that open overlays.
const pageHelpers = `
  const root = () => [...document.querySelectorAll("div")].find((el) => el.classList.contains("h-screen") && el.classList.contains("flex-col"));
  const body = () => [...root().children].find((el) => el.classList.contains("flex-1") && el.classList.contains("overflow-hidden"));
  const topRow = () => body().children[0].children[0];
  const panel = () => body().children[0].children[1];
  const rows = () => [...panel().querySelectorAll("tbody tr")].filter((r) => r.children.length > 1);
  const tab = (prefix) => [...panel().querySelectorAll("button")].find((b) => b.textContent.startsWith(prefix));
  const overlay = () => [...document.querySelectorAll("[role=dialog], [role=alertdialog]")].pop();
  const popper = () => [...document.querySelectorAll("[data-radix-popper-content-wrapper] > *")].pop();
  const regions = {
    header: () => document.querySelector("header"),
    chips: () => [...document.querySelectorAll("div")].find((el) => el.classList.contains("overflow-x-auto") && el.textContent.includes("Select Option")),
    // Tabs and price bar only; the chart area itself is the M11 placeholder.
    chart: () => topRow().children[0].children[1],
    book: () => topRow().children[1],
    form: () => body().children[1].children[0],
    panel: () => panel(),
    risk: () => [...document.querySelectorAll("div")].find((d) => d.className === "p-3 space-y-3"),
    cancel: overlay, close: overlay, tpsl: overlay, detail: overlay, preview: overlay,
    dropdown: () => document.querySelector('div[class~="w-[500px]"]'), indicator: popper,
  };
  const openers = {
    cancel: () => { tab("Current Orders").click(); return () => [...rows()[0].querySelectorAll("button")].pop().click(); },
    close: () => { tab("Positions").click(); return () => [...rows().find((r) => r.textContent.includes("$100,000 - $110,000")).querySelectorAll("button")].pop().click(); },
    tpsl: () => { tab("Positions").click(); return () => rows()[0].children[9].querySelector("button").click(); },
    detail: () => { tab("Positions").click(); return () => rows()[0].querySelector('button[title="View position details"]').click(); },
  };
`;

const snapshot = () => {
  const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true });
  const rgba = (color) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r},${g},${b},${Math.round((a / 255) * 100) / 100})`;
  };
  const colours = (value) => value.replace(/(rgba?|oklab|oklch|lab|lch)\([^)]*\)/g, (c) => rgba(c));
  // v4 always lists ring / inset / shadow layers; a layer with no offset, blur or spread draws nothing.
  const shadows = (value) =>
    value === "none"
      ? "none"
      : colours(value).split(/,(?![^(]*\))/).map((part) => part.trim()).filter((part) => !/ 0px 0px 0px 0px$/.test(part)).join(", ") || "none";
  const round = (n) => Math.round(n * 10) / 10;
  const el = window.__treeRoot;
  if (!el) return null;
  const origin = el.getBoundingClientRect();
  const walk = (node) => {
    const r = node.getBoundingClientRect();
    const s = getComputedStyle(node);
    const kids = [...node.children];
    const out = {
      tag: node.tagName.toLowerCase(),
      box: `${round(r.x - origin.x)},${round(r.y - origin.y)} ${round(r.width)}x${round(r.height)}`,
      font: `${s.fontSize}/${s.lineHeight} ${s.fontWeight} ${s.fontStyle} ${s.letterSpacing} ${s.textTransform}`,
      color: rgba(s.color),
      bg: s.backgroundImage !== "none" ? colours(s.backgroundImage).replace(/ 0%| 100%/g, "") : rgba(s.backgroundColor),
      border: ["Top", "Right", "Bottom", "Left"].map((side) => `${s[`border${side}Width`]} ${s[`border${side}Style`]} ${rgba(s[`border${side}Color`])}`).join(" / "),
      radius: s.borderRadius.replace(/3\.35544e\+07px/g, "9999px"),
      // Margins are left out: their effect shows in the boxes, and v4 moved space-y margins
      // to the other side of each child (R-6 ⑦) without changing any position.
      spacing: `p ${s.padding} gap ${s.gap}`,
      layout: `${s.display} ${s.flexDirection} ${s.alignItems} ${s.justifyContent} ${s.textAlign}`,
      // Opacity of a looping animation (the live dot) depends on when it is sampled.
      effects: node.getAnimations().some((a) => a.effect?.getTiming().iterations === Infinity) ? "animated" : `${shadows(s.boxShadow)} op ${s.opacity}`,
      // The element's own text, including text mixed with child elements ("+$14.00<span>…").
      text: [...node.childNodes].filter((child) => child.nodeType === 3).map((child) => child.textContent).join("").trim().slice(0, 60),
    };
    if (node.tagName.toLowerCase() === "path") out.d = node.getAttribute("d");
    out.children = kids.map(walk);
    return out;
  };
  return walk(el);
};

const compare = (a, b, path, diffs, counter) => {
  counter.nodes += 1;
  // A different tag is reported, but its styles and subtree are still compared (the replica
  // uses <div role="button"> where the reference nests a <button> in a <button>).
  if (a.tag !== b.tag) diffs.push(`${path}: tag ${a.tag} vs ${b.tag}`);
  // Different child counts (e.g. a list with more rows): report it, then compare the shared prefix.
  if (a.children.length !== b.children.length) diffs.push(`${path}: children ${a.children.length} vs ${b.children.length}`);
  for (const key of ["box", "font", "color", "bg", "border", "radius", "spacing", "layout", "effects", "text", "d"]) {
    if (a[key] !== b[key]) diffs.push(`${path} ${key}: ${JSON.stringify(a[key])} vs ${JSON.stringify(b[key])}`);
  }
  a.children
    .slice(0, b.children.length)
    .forEach((child, index) => compare(child, b.children[index], `${path}>${child.tag}[${index}]`, diffs, counter));
};

const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const noAnimations = (page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), { timeout: 5000 });

const capture = async (page, region) => {
  await page.evaluate(new Function(`${pageHelpers}; window.__regions = regions; window.__openers = openers;`));
  if (["cancel", "close", "tpsl", "detail"].includes(region)) {
    await page.evaluate((name) => { window.__open = window.__openers[name](); }, region);
    await settle(page);
    await page.evaluate(() => window.__open());
    await page.waitForSelector("[role=dialog], [role=alertdialog]");
  }
  if (region === "preview") {
    const input = await page.evaluateHandle(() => window.__regions.form().querySelector('input[placeholder="0.00"]'));
    await input.asElement().click({ clickCount: 3 });
    await page.keyboard.type("10");
    await page.evaluate(() => [...window.__regions.form().querySelectorAll("button")].pop().click());
    await page.waitForSelector("[role=dialog]");
  }
  if (region === "dropdown") {
    // Input events only reach the foreground tab.
    await page.bringToFront();
    await page.click("header button.min-w-0");
    await page.waitForSelector('div[class~="w-[500px]"]');
  }
  if (region === "indicator") {
    await page.evaluate(() => [...document.querySelector("header").children[0].children].find((el) => el.className.includes("bg-indicator")).click());
    await page.waitForSelector("[data-radix-popper-content-wrapper]");
  }
  await noAnimations(page).catch(() => {});
  await settle(page);
  await page.evaluate((name) => { window.__treeRoot = window.__regions[name](); }, region);
  return page.evaluate(snapshot);
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  let total = 0;
  for (const region of wanted) {
    const trees = {};
    for (const [name, base] of [["ref", "http://localhost:8080/trade"], ["new", "http://localhost:3000/trade"]]) {
      const page = await browser.newPage();
      await page.setViewport({ width, height });
      await attachReferenceBackend(page, base);
      await page.goto(base, { waitUntil: "networkidle2" });
      await emulateReferenceFonts(page, base);
      await page.waitForFunction(() => document.body.innerText.includes("Current Orders"), { timeout: 30000 });
      trees[name] = await capture(page, region).catch((err) => ({ error: err.message.split("\n")[0] }));
      await page.close();
    }
    if (!trees.ref || !trees.new || trees.ref.error || trees.new.error) {
      console.log(`${region.padEnd(10)} not measured: ref ${trees.ref?.error ?? "ok"}, new ${trees.new?.error ?? "ok"}`);
      continue;
    }
    const diffs = [];
    const counter = { nodes: 0 };
    compare(trees.ref, trees.new, region, diffs, counter);
    total += diffs.length;
    console.log(`${region.padEnd(10)} ${counter.nodes} nodes, ${diffs.length ? `${diffs.length} differences` : "SAME"}`);
    diffs.slice(0, MAX_DIFFS).forEach((diff) => console.log(`  ${diff}`));
    if (diffs.length > MAX_DIFFS) console.log(`  … ${diffs.length - MAX_DIFFS} more`);
  }
  await browser.close();
  console.log(`total differences: ${total}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
