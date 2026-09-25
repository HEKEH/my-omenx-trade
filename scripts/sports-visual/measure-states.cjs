// Interaction states (rest / hover / focus) of representative controls on the reference and
// the replica. Colours, including those inside shadows, are normalised to rgba first.
//
//   node measure-states.cjs [event-id] [WxH]
const { launch, openPage, settle, pages, locators } = require("./common.cjs");

const [id = "wc26-usa-par", size = "1440x900"] = process.argv.slice(2);
const [width, height] = size.split("x").map(Number);

const targets = `
  const inRegion = (name, selector, test = () => true) => [...(regions[name]()?.querySelectorAll(selector) ?? [])].find(test);
  const text = (t) => (el) => el.textContent.trim() === t;
  const targets = {
    navLink: () => inRegion("topbar", "nav a"),
    equity: () => inRegion("topbar", "a[href$='/wallet']"),
    userMenu: () => inRegion("topbar", "button[aria-haspopup=menu]"),
    share: () => inRegion("hero", "button", (b) => b.textContent.trim() === "Share"),
    stageTab: () => [...document.querySelectorAll("[role=tab]")].find((t) => t.getAttribute("aria-selected") === "false"),
    rangePill: () => inRegion("outcomes", "button", text("1H")),
    legend: () => inRegion("outcomes", "button", (b) => b.className.includes("opacity-55")),
    outcomeRow: () => document.querySelectorAll("[role=button][aria-expanded], [role=button][tabindex='0']")[1],
    buyButton: () => document.querySelectorAll("[role=button][tabindex='0']")[1]?.querySelector("button"),
    pickerChip: () => [...regions.picker().querySelectorAll("button")][1],
    sellSide: () => inRegion("form", "button", text("sell")),
    limitTab: () => inRegion("form", "button", text("limit")),
    quickPct: () => inRegion("form", "button", text("25%")),
    submit: () => [...regions.form().querySelectorAll("button")].pop(),
    positionsTab: () => [...regions.positions().children[0].querySelectorAll("button")][1],
    closeButton: () => inRegion("positions", "button", text("Close")),
    tpslButton: () => inRegion("positions", "button", (b) => b.textContent.trim() === "TP/SL"),
    relatedChip: () => inRegion("related", "a"),
    marginInput: () => regions.form().querySelector("input[type=number]"),
  };
`;

const read = (name) => {
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
  const el = window.__stateTargets[name]();
  if (!el) return null;
  const s = getComputedStyle(el);
  return {
    bg: s.backgroundImage !== "none" ? colours(s.backgroundImage) : rgba(s.backgroundColor),
    color: rgba(s.color),
    border: `${s.borderTopWidth} ${rgba(s.borderTopColor)}`,
    shadow: colours(s.boxShadow),
    outline: `${s.outlineStyle} ${s.outlineWidth} ${rgba(s.outlineColor)}`,
    opacity: s.opacity,
    transform: s.transform,
    cursor: s.cursor,
    decoration: s.textDecorationLine,
  };
};

(async () => {
  const browser = await launch();
  const out = {};
  for (const [name, url] of pages(id)) {
    const { page } = await openPage(browser, url, { width, height });
    await page.bringToFront();
    // The reference's floating stream player (B-5, not built here) sits over the lower right on
    // every page; hide it so the controls under it can be hovered.
    // It appears once the stage scrolls away, so a stylesheet keeps it hidden whenever it shows.
    await page.addStyleTag({ content: "body > div.pointer-events-none.fixed.z-50 { display: none !important; }" });
    // Live events open on the Stream tab; the outcome controls are on Markets.
    await page.evaluate(() => [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent.trim() === "Markets")?.click());
    await settle(page);
    await page.evaluate(new Function(`${locators}; ${targets}; window.__stateTargets = targets;`));
    const names = await page.evaluate(() => Object.keys(window.__stateTargets));
    out[name] = {};
    for (const target of names) {
      await page.mouse.move(1, height - 1);
      await new Promise((resolve) => setTimeout(resolve, 350));
      const rest = await page.evaluate(read, target);
      const handle = await page.evaluateHandle((t) => window.__stateTargets[t](), target);
      const element = handle.asElement();
      if (!element) {
        out[name][target] = null;
        continue;
      }
      await element.hover();
      await new Promise((resolve) => setTimeout(resolve, 350));
      // A hover only counts if the pointer really reaches the element: on live events the
      // reference's floating stream player (not built here, B-5) covers the lower right.
      const reached = await element.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      });
      const hover = reached ? await page.evaluate(read, target) : "covered";
      let focus = null;
      if (target === "marginInput") {
        await element.focus();
        await new Promise((resolve) => setTimeout(resolve, 350));
        focus = await page.evaluate(read, target);
        await page.evaluate(() => document.activeElement.blur());
      }
      out[name][target] = { rest, hover, focus };
    }
    await page.close();
  }
  await browser.close();

  let different = 0;
  for (const target of Object.keys(out.ref)) {
    const diffs = [];
    if (!out.ref[target] && !out.new[target]) {
      console.log(`${target.padEnd(14)} n/a (not on this page)`);
      continue;
    }
    if (!out.ref[target] || !out.new[target]) diffs.push(`missing on ${out.ref[target] ? "new" : "ref"}`);
    for (const state of ["rest", "hover", "focus"]) {
      const a = out.ref[target]?.[state];
      const b = out.new[target]?.[state];
      if (!a && !b) continue;
      if (a === "covered" || b === "covered") {
        diffs.push(`${state}: not measurable on ${a === "covered" ? "ref" : "new"} (covered)`);
        continue;
      }
      for (const key of Object.keys(a ?? b)) {
        if (a?.[key] !== b?.[key]) diffs.push(`${state}.${key}: ${JSON.stringify(a?.[key])} vs ${JSON.stringify(b?.[key])}`);
      }
    }
    if (diffs.length) different += 1;
    const changed = ["hover", "focus"].filter((state) => out.new[target]?.[state] && out.new[target][state] !== "covered" && JSON.stringify(out.new[target][state]) !== JSON.stringify(out.new[target].rest));
    console.log(`${target.padEnd(14)} ${diffs.length ? diffs.join(" | ") : "SAME"}  [changes on: ${changed.join(", ") || "-"}]`);
  }
  console.log(`${different} controls differ`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
