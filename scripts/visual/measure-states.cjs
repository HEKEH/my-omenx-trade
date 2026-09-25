// Compares interaction states (rest / hover / focus) of representative controls on
// the reference (:8080) and the replica (:3000). Colours, including those inside
// shadows, are normalised to rgba first (R-6 ⑥).
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");
const { emulateReferenceFonts } = require("./ref-fonts.cjs");
const { attachReferenceBackend } = require("./ref-backend.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [width, height] = (process.argv[2] || "1440x900").split("x").map(Number);

// Each locator runs in the page and returns one element; the same structure exists on both pages.
const locators = `
  const root = [...document.querySelectorAll("div")].find((el) => el.classList.contains("h-screen") && el.classList.contains("flex-col"));
  const body = [...root.children].find((el) => el.classList.contains("flex-1") && el.classList.contains("overflow-hidden"));
  const header = document.querySelector("header");
  const chips = [...document.querySelectorAll("div")].find((el) => el.classList.contains("overflow-x-auto") && el.textContent.includes("Select Option"));
  const topRow = body.children[0].children[0];
  const book = topRow.children[1].children[0];
  const panel = body.children[0].children[1];
  const card = body.children[1].children[0];
  const sections = [...card.children[1].children];
  const byText = (scope, text) => [...scope.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
  const targets = {
    eventTrigger: () => header.children[0].children[0],
    star: () => header.lastElementChild,
    optionChip: () => [...chips.querySelectorAll("button")].find((b) => !b.className.includes("trading-purple")),
    bookTab: () => book.children[0].querySelectorAll("button")[1],
    sideNo: () => sections[0].children[1],
    orderTypeLimit: () => byText(card, "Limit"),
    submit: () => sections[sections.length - 1].querySelector("button"),
    panelTab: () => [...panel.children[0].querySelectorAll("button")].find((b) => !b.className.includes("trading-purple")),
    cancelOrder: () => [...panel.querySelector("tbody tr").querySelectorAll("button")].pop(),
    amountInput: () => card.querySelector("input"),
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
  const colours = (value) => value.replace(/(rgba?|oklab|oklch|lab|lch)\([^)]*\)/g, (c) => rgba(c));
  const el = window.__stateTargets[name]();
  if (!el) return null;
  const s = getComputedStyle(el);
  return {
    bg: rgba(s.backgroundColor),
    color: rgba(s.color),
    border: `${s.borderTopWidth} ${rgba(s.borderTopColor)}`,
    shadow: colours(s.boxShadow),
    outline: `${s.outlineStyle} ${s.outlineWidth} ${rgba(s.outlineColor)}`,
    opacity: s.opacity,
    cursor: s.cursor,
    decoration: s.textDecorationLine,
  };
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const out = {};
  for (const [name, base] of [["ref", "http://localhost:8080/trade"], ["new", "http://localhost:3000/trade"]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await attachReferenceBackend(page, base);
    await page.goto(base, { waitUntil: "networkidle2" });
    await emulateReferenceFonts(page, base);
    await page.waitForFunction(() => document.body.innerText.includes("Current Orders"), { timeout: 30000 });
    // Reference: lift the logged-out blur so the panel can be hovered (R-1).
    await page.evaluate(() => {
      document.querySelectorAll(".blur-\\[3px\\]").forEach((el) => el.classList.remove("blur-[3px]", "opacity-70", "pointer-events-none"));
    });
    await page.evaluate(new Function(`${locators}; window.__stateTargets = targets;`));
    const names = await page.evaluate(() => Object.keys(window.__stateTargets));
    out[name] = {};
    for (const target of names) {
      await page.mouse.move(0, height - 1);
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
      // A hover only counts if the pointer really reaches the element (the reference's
      // logged-out overlay covers the panel, R-1).
      const reached = await element.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      });
      const hover = reached ? await page.evaluate(read, target) : "blocked";
      let focus = null;
      if (target === "amountInput") {
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

  for (const target of Object.keys(out.ref)) {
    const diffs = [];
    for (const state of ["rest", "hover", "focus"]) {
      const a = out.ref[target]?.[state];
      const b = out.new[target]?.[state];
      if (!a && !b) continue;
      if (a === "blocked" || b === "blocked") {
        diffs.push(`${state}: not measurable on ${a === "blocked" ? "ref" : "new"} (covered)`);
        continue;
      }
      for (const key of Object.keys(a ?? b)) {
        if (a?.[key] !== b?.[key]) diffs.push(`${state}.${key}: ${JSON.stringify(a?.[key])} vs ${JSON.stringify(b?.[key])}`);
      }
    }
    const changed = ["hover", "focus"].filter((state) => out.new[target]?.[state] && out.new[target][state] !== "blocked" && JSON.stringify(out.new[target][state]) !== JSON.stringify(out.new[target].rest));
    console.log(`${target.padEnd(15)} ${diffs.length ? diffs.join(" | ") : "SAME"}  [changes on: ${changed.join(", ") || "-"}]`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
