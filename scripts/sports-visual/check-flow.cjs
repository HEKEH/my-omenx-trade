// Behaviour check (M8): runs the same flows on the reference and the replica and compares
// what the user sees afterwards (tab counts, rows, toasts, URL, the order button). The clock
// is frozen (R-3), so both pages close positions at tick 0.
//
//   node check-flow.cjs
const assert = require("node:assert/strict");
const { launch, openPage, settle, locators } = require("./common.cjs");

const REF = process.env.REF_BASE || "http://localhost:8081/event/";
const NEW = process.env.NEW_BASE || "http://localhost:3000/sports/event/";

const helpers = `
  ${locators}
  const buttons = (scope) => [...(scope || document).querySelectorAll("button, a, [role=tab]")];
  const byText = (scope, text) => buttons(scope).find((b) => b.textContent.trim() === text);
  const startsWith = (scope, text) => buttons(scope).find((b) => b.textContent.trim().startsWith(text));
  const cta = () => [...regions.form().querySelectorAll("button")].pop().textContent.trim();
  const tabs = () => [...regions.positions().children[0].querySelectorAll("button")].map((b) => b.textContent.replace(/\\s+/g, " ").trim());
  const rows = () => [...regions.positions().querySelectorAll("tbody tr")].map((tr) => tr.innerText.replace(/\\s+/g, " ").trim());
  // The reference runs in React StrictMode (dev), which runs its state updaters twice, and its
  // close / cancel handlers toast and add history inside those updaters: in dev every such
  // toast and history row appears twice (E-25). Repeats are folded so both pages compare.
  const unique = (list) => list.filter((item, i) => item !== list[i - 1]);
  const toasts = () => unique([...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText.replace(/\\s+/g, " ").trim()));
  const dialog = () => document.querySelector("[role=dialog], [role=alertdialog]");
`;
const run = (page, body) => page.evaluate(new Function(`${helpers}; ${body}`));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Each flow returns what the user sees afterwards; the two pages must agree.
const flows = {
  "market order opens a position": async (page) => {
    await run(page, "cta(); [...regions.form().querySelectorAll('button')].pop().click();");
    await wait(500);
    return run(page, "return { tabs: tabs(), first: rows()[0], toasts: toasts() };");
  },
  "limit order away from the price rests as an order": async (page) => {
    await run(page, "byText(regions.form(), 'limit').click();");
    await settle(page);
    const input = await page.evaluateHandle(new Function(`${helpers}; return regions.form().querySelector("input:not([type=number])");`));
    await input.asElement().click({ clickCount: 3 });
    await page.keyboard.type("40");
    await run(page, "[...regions.form().querySelectorAll('button')].pop().click();");
    await wait(300);
    await run(page, "startsWith(regions.positions(), 'Open Orders').click();");
    await settle(page);
    return run(page, "return { tabs: tabs(), first: rows()[0], cta: cta() };");
  },
  "closing a position moves it to history": async (page) => {
    await run(page, "byText(regions.positions(), 'Close').click();");
    await page.waitForSelector("[role=alertdialog]");
    await run(page, "startsWith(dialog(), 'Close at').click();");
    await wait(500);
    const positionsTab = await run(page, "return tabs()[0];");
    await run(page, "startsWith(regions.positions(), 'History').click();");
    await settle(page);
    return run(page, `return { positionsTab: ${JSON.stringify(positionsTab)}, history: unique(rows()), toasts: toasts() };`);
  },
  "cancelling an order removes it": async (page) => {
    await run(page, "startsWith(regions.positions(), 'Open Orders').click();");
    await settle(page);
    await run(page, "byText(regions.positions(), 'Cancel').click();");
    await page.waitForSelector("[role=alertdialog]");
    await run(page, "byText(dialog(), 'Cancel order').click();");
    await wait(500);
    return run(page, "return { tabs: tabs(), rows: rows(), toasts: toasts() };");
  },
  "editing TP/SL shows the new values": async (page) => {
    await run(page, "[...regions.positions().querySelectorAll('tbody tr')[1].querySelectorAll('button')].find((b) => b.textContent.includes('TP/SL')).click();");
    await page.waitForSelector("[role=dialog]");
    const inputs = await page.$$("[role=dialog] input");
    await inputs[0].type("20");
    await run(page, "byText(dialog(), 'Save').click();");
    await wait(500);
    return run(page, "return { second: rows()[1], toasts: toasts() };");
  },
  "a row's NO on another outcome ends on YES (BUG-10)": async (page) => {
    await run(page, "byText(document, 'Markets')?.click();");
    await settle(page);
    await run(page, "[...document.querySelectorAll('[role=button][aria-expanded]')[1].querySelectorAll('button')].find((b) => b.textContent.startsWith('NO')).click();");
    await wait(800);
    return run(page, "return { cta: cta(), pulse: regions.form().className.includes('animate-trade-pulse') };");
  },
};

async function observe(browser, base, id, flow, query = "") {
  const { page, problems } = await openPage(browser, `${base}${id}${query}`);
  const seen = await flows[flow](page);
  await page.close();
  return { seen, problems };
}

(async () => {
  const browser = await launch();
  const failures = [];
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (err) {
      failures.push(name);
      console.log(`✗ ${name}\n  ${String(err.message).split("\n").slice(0, 12).join("\n  ")}`);
    }
  };

  for (const flow of Object.keys(flows)) {
    await check(flow, async () => {
      const ref = await observe(browser, REF, "wc26-usa-par", flow);
      const mine = await observe(browser, NEW, "wc26-usa-par", flow);
      assert.deepEqual(mine.seen, ref.seen);
      assert.deepEqual(mine.problems.filter((p) => !/status of 404/.test(p)), []);
    });
  }

  await check("?outcome= pre-selects the outcome", async () => {
    const read = async (base) => {
      const { page } = await openPage(browser, `${base}wc26-usa-par?outcome=a`);
      const value = await run(page, "return cta();");
      await page.close();
      return value;
    };
    assert.equal(await read(NEW), await read(REF));
    assert.equal(await read(NEW), "Buy PAR YES @ 25¢");
  });

  // R-12: after following a related event, which outcome and side are selected?
  await check("following a related event (R-12)", async () => {
    const follow = async (base) => {
      const { page } = await openPage(browser, `${base}wc26-usa-par`);
      await run(page, "byText(regions.picker(), 'PAR25¢')?.click() ?? [...regions.picker().querySelectorAll('button')][2].click();");
      await run(page, "[...regions.picker().querySelectorAll('button')].find((b) => b.textContent.startsWith('No')).click();");
      await settle(page);
      await run(page, "[...regions.related().querySelectorAll('a')][0].click();");
      await page.waitForFunction(() => location.pathname.endsWith("che-psg-2025-ucl"), { timeout: 15000 });
      await wait(800);
      const value = await run(page, "return { path: location.pathname.split('/').pop(), cta: cta(), tabs: tabs() };");
      await page.close();
      return value;
    };
    const ref = await follow(REF);
    const mine = await follow(NEW);
    console.log(`  ref ${JSON.stringify(ref)}\n  new ${JSON.stringify(mine)}`);
    assert.deepEqual(mine, ref);
  });

  // The reference keeps its component tree mounted across events, so components' own state
  // (the table tab, the chart range) survives where the tree has the same shape.
  await check("local state after following a related event", async () => {
    const follow = async (base, from) => {
      const { page } = await openPage(browser, `${base}${from}`);
      await run(page, "startsWith(regions.positions(), 'History').click();");
      await run(page, "byText(document, 'Markets')?.click();");
      await settle(page);
      await run(page, "byText(regions.outcomes(), '1W').click();");
      await settle(page);
      await run(page, "[...regions.related().querySelectorAll('a')][0].click();");
      await page.waitForFunction((f) => !location.pathname.endsWith(f), { timeout: 15000 }, from);
      await wait(800);
      const value = await run(page, `return {
        path: location.pathname.split('/').pop(),
        tab: [...regions.positions().children[0].querySelectorAll('button')].find((b) => b.querySelector('.bg-gradient-neon'))?.textContent.trim(),
        range: [...(regions.outcomes()?.querySelectorAll('button') ?? [])].find((b) => b.className.includes('bg-primary text-primary-foreground'))?.textContent.trim() ?? null,
      };`);
      await page.close();
      return value;
    };
    for (const from of ["wc26-usa-par", "liv-new"]) {
      const ref = await follow(REF, from);
      const mine = await follow(NEW, from);
      console.log(`  ${from}: ref ${JSON.stringify(ref)} new ${JSON.stringify(mine)}`);
      assert.deepEqual(mine, ref);
    }
  });

  await check("an unknown id shows Event not found", async () => {
    const { page } = await openPage(browser, `${NEW}nope`);
    assert.match(await page.evaluate(() => document.body.innerText), /Event not found/);
    assert.equal(await page.title(), "Event — OmenX Sports");
    await page.close();
  });

  await browser.close();
  if (failures.length) {
    console.log(`${failures.length} failed`);
    process.exit(1);
  }
  console.log("all flows match the reference");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
