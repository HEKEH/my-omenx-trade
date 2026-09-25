// Node-by-node comparison of page regions on the reference (:8081) and the replica (:3000).
// Walks both DOM subtrees in parallel and compares every element: box relative to the region,
// spacing, typography, colours, borders, radius, shadows, own text and SVG path data.
//
//   node measure-tree.cjs <event-id> [WxH] [region,region,...] [--action=<name>]
//
// Regions: see common.cjs. Actions open an overlay or change state before measuring:
//   menu (user menu), popover (live-delay info), markets (Markets stage tab), expand (second
//   outcome row), range1w (chart range), limit, tpsl, lev5, tpslerr / tpslok (TP/SL inputs),
//   submit (order toast), orders, history, close, cancel, edit, locktip (voucher TP/SL tooltip).
const { launch, openPage, settle, pages, locators } = require("./common.cjs");

const [id = "wc26-usa-par", size = "1440x900", regionArg = "topbar,hero", ...flags] = process.argv.slice(2);
const [width, height] = size.split("x").map(Number);
const wanted = regionArg.split(",");
const action = (flags.find((f) => f.startsWith("--action=")) || "").slice(9);
const MAX_DIFFS = Number(process.env.MAX_DIFFS || 25);

// In-page actions; each returns once the change has been triggered.
const actions = `
  const clickText = (scope, re) => [...scope.querySelectorAll("button, [role=tab], [role=button]")].find((b) => re.test(b.textContent.trim())).click();
  const actions = {
    menu: () => regions.topbar().querySelector("button[aria-haspopup=menu]"),
    popover: () => regions.hero().querySelector("button[aria-label='About live data delay']"),
    markets: () => clickText(document, /^Markets$/),
    expand: () => document.querySelectorAll("[role=button][aria-expanded]")[1].click(),
    range1w: () => clickText(document, /^1W$/),
    limit: () => clickText(regions.form(), /^limit$/i),
    tpsl: () => regions.form().querySelector("button[role=switch]").click(),
    lev5: () => null,
    orders: () => clickText(regions.positions(), /^Open Orders/),
    history: () => clickText(regions.positions(), /^History/),
    close: () => clickText(regions.positions(), /^Close$/),
    edit: () => regions.positions().querySelector("tbody tr button").click(),
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
  const colours = (value) => value.replace(/(rgba?|oklab|oklch|lab|lch|color)\([^)]*\)/g, (c) => rgba(c));
  // Tailwind 4 always lists ring / inset / shadow layers; a layer with no offset, blur or spread draws nothing.
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
    const out = {
      tag: node.tagName.toLowerCase(),
      box: `${round(r.x - origin.x)},${round(r.y - origin.y)} ${round(r.width)}x${round(r.height)}`,
      font: `${s.fontFamily.split(",")[0]} ${s.fontSize}/${s.lineHeight} ${s.fontWeight} ${s.fontStyle} ${s.letterSpacing} ${s.textTransform}`,
      color: rgba(s.color),
      bg: s.backgroundImage !== "none" ? colours(s.backgroundImage) : rgba(s.backgroundColor),
      border: ["Top", "Right", "Bottom", "Left"].map((side) => `${s[`border${side}Width`]} ${s[`border${side}Style`]} ${rgba(s[`border${side}Color`])}`).join(" / "),
      radius: s.borderRadius.replace(/3\.35544e\+07px/g, "9999px"),
      spacing: `p ${s.padding} gap ${s.gap}`,
      layout: `${s.display} ${s.flexDirection} ${s.alignItems} ${s.justifyContent} ${s.textAlign}`,
      effects: node.getAnimations().some((a) => a.effect?.getTiming().iterations === Infinity)
        ? "animated"
        : `${shadows(s.boxShadow)} op ${s.opacity} ${s.filter} ${s.backdropFilter}`,
      text: [...node.childNodes].filter((child) => child.nodeType === 3).map((child) => child.textContent).join("").trim().slice(0, 60),
    };
    if (out.tag === "path") out.d = node.getAttribute("d");
    out.children = [...node.children].map(walk);
    return out;
  };
  return walk(el);
};

const compare = (a, b, path, diffs, counter) => {
  counter.nodes += 1;
  if (a.tag !== b.tag) diffs.push(`${path}: tag ${a.tag} vs ${b.tag}`);
  if (a.children.length !== b.children.length) diffs.push(`${path}: children ${a.children.length} vs ${b.children.length}`);
  for (const key of ["box", "font", "color", "bg", "border", "radius", "spacing", "layout", "effects", "text", "d"]) {
    if (a[key] !== b[key]) diffs.push(`${path} ${key}: ${JSON.stringify(a[key])} vs ${JSON.stringify(b[key])}`);
  }
  a.children.slice(0, b.children.length).forEach((child, i) => compare(child, b.children[i], `${path}>${child.tag}[${i}]`, diffs, counter));
};

const noAnimations = (page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), {
    timeout: 5000,
  });

async function capture(page, region) {
  await page.evaluate(new Function(`${locators}; ${actions}; window.__regions = regions; window.__actions = actions;`));
  // Actions that need the keyboard run from here rather than in the page.
  if (action === "lev5") {
    await page.focus("[role=slider]");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  } else if (action === "tpslerr") {
    await page.evaluate(() => window.__regions.form().querySelector("button[role=switch]").click());
    await settle(page);
    const inputs = await page.$$("input[inputmode=decimal]");
    await inputs[0].type("10");
    await inputs[1].type("90");
  } else if (action === "tpslok") {
    await page.focus("[role=slider]");
    for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowRight");
    await page.evaluate(() => window.__regions.form().querySelector("button[role=switch]").click());
    await settle(page);
    const inputs = await page.$$("input[inputmode=decimal]");
    await inputs[0].type("60");
    await inputs[1].type("40");
  } else if (action === "cancel") {
    await page.evaluate(() => window.__actions.orders());
    await settle(page);
    await page.evaluate(() => [...window.__regions.positions().querySelectorAll("button")].find((b) => b.textContent.trim() === "Cancel").click());
    await page.waitForSelector("[role=alertdialog]");
    await new Promise((resolve) => setTimeout(resolve, 300));
  } else if (action === "locktip") {
    await page.bringToFront();
    await page.hover("[aria-label='TP/SL not available']");
    await page.waitForSelector("[data-radix-popper-content-wrapper]");
    await new Promise((resolve) => setTimeout(resolve, 400));
  } else if (action === "submit") {
    await page.evaluate(() => [...window.__regions.form().querySelectorAll("button")].pop().click());
    await page.waitForSelector("[data-sonner-toast]");
    await new Promise((resolve) => setTimeout(resolve, 600));
  } else if (action) {
    // Menu / popover triggers need a real pointer (Radix listens to pointerdown).
    const trigger = await page.evaluateHandle((name) => window.__actions[name](), action);
    if (trigger.asElement()) {
      await page.bringToFront();
      await trigger.asElement().click();
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  await noAnimations(page).catch(() => {});
  await settle(page);
  await page.evaluate((name) => { window.__treeRoot = window.__regions[name](); }, region);
  return page.evaluate(snapshot);
}

(async () => {
  const browser = await launch();
  let total = 0;
  for (const region of wanted) {
    const trees = {};
    for (const [name, url] of pages(id)) {
      const { page } = await openPage(browser, url, { width, height });
      trees[name] = await capture(page, region).catch((err) => ({ error: err.message.split("\n")[0] }));
      await page.close();
    }
    if (!trees.ref || !trees.new || trees.ref.error || trees.new.error) {
      console.log(`${region.padEnd(10)} not measured: ref ${trees.ref?.error ?? (trees.ref ? "ok" : "missing")}, new ${trees.new?.error ?? (trees.new ? "ok" : "missing")}`);
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
