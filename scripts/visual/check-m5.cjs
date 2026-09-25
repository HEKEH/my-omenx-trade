// M5 header interactions on the replica, plus dropdown/popover geometry against the reference.
const assert = require("node:assert/strict");
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const REF = "http://localhost:8080/trade";
const NEW = "http://localhost:3000/trade";

const rect = (page, selector) =>
  page.$eval(selector, (el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100 };
  });
const clickText = (page, selector, text) =>
  page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((node) => node.textContent.trim().startsWith(t));
      if (!el) throw new Error(`no ${sel} with text ${t}`);
      el.click();
    },
    selector,
    text,
  );
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const openDropdown = (page) => page.click("header button.min-w-0");
const DROPDOWN = "div.w-\\[500px\\]";

async function geometry(page) {
  // Input events only reach the foreground tab.
  await page.bringToFront();
  await openDropdown(page);
  await page.waitForSelector(DROPDOWN);
  // The event count differs (the replica adds two binary markets), so compare the fixed parts.
  const panel = await page.$eval(DROPDOWN, (el) => ({
    w: el.getBoundingClientRect().width,
    search: el.children[0].getBoundingClientRect().height,
    columns: el.children[1].getBoundingClientRect().height,
  }));
  const row = await page.$eval(`${DROPDOWN} .max-h-\\[300px\\] > *`, (el) => Math.round(el.getBoundingClientRect().height * 100) / 100);
  await openDropdown(page);
  const indicator = await page.$("header .bg-indicator\\/10");
  let popover = null;
  if (indicator) {
    await indicator.click();
    await page.waitForSelector("[data-radix-popper-content-wrapper]");
    // Wait out the zoom-in animation before measuring.
    await new Promise((resolve) => setTimeout(resolve, 400));
    popover = await rect(page, "[data-radix-popper-content-wrapper] > *");
    await page.keyboard.press("Escape");
  }
  return { panel, row, popover };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const open = async (url) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForSelector("header");
    return page;
  };

  const ref = await open(REF);
  const page = await open(NEW);
  const problems = [];
  page.on("console", (msg) => (msg.type() === "error" || /hydrat/i.test(msg.text())) && problems.push(msg.text().slice(0, 200)));
  page.on("pageerror", (err) => problems.push(err.message));
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector("header");

  const check = async (name, fn) => {
    console.log(`… ${name}`);
    await fn();
    console.log(`✓ ${name}`);
  };

  await check("dropdown panel, row and indicator popover match the reference", async () => {
    const a = await geometry(ref);
    const b = await geometry(page);
    console.log("   ref", JSON.stringify(a), "\n   new", JSON.stringify(b));
    assert.deepEqual(b.panel, a.panel);
    assert.equal(b.row, a.row);
    assert.equal(b.popover.w, a.popover.w);
    // Popover height can differ by the body font's line box (A-12); allow 1px.
    assert.ok(Math.abs(b.popover.h - a.popover.h) <= 1, `popover height ${a.popover.h} vs ${b.popover.h}`);
  });

  await page.bringToFront();
  await check("search filters by name; no match shows the empty state", async () => {
    await openDropdown(page);
    await page.type(`${DROPDOWN} input`, "bitcoin");
    assert.equal(await page.$$eval(`${DROPDOWN} [role=button]`, (rows) => rows.length), 1);
    await page.type(`${DROPDOWN} input`, "zzz");
    assert.match(await bodyText(page), /No events found/);
  });

  await check("favorites filter: empty state, then a starred event", async () => {
    await page.$eval(`${DROPDOWN} input`, (el) => el.select());
    await page.keyboard.press("Backspace");
    // Clearing the search grows the list and Radix repositions the popover a frame
    // later; let it settle so clicks land on the final coordinates.
    const settle = async (predicate) => {
      await page.waitForFunction((sel, fn) => new Function("n", `return ${fn};`)(document.querySelectorAll(`${sel} [role=button]`).length), { timeout: 5000 }, DROPDOWN, predicate);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    };
    await settle("n > 1");
    await page.click(`${DROPDOWN} button[title="Show favorites only"]`);
    await page.waitForFunction(() => document.body.innerText.includes("No favorites yet"), { timeout: 5000 });
    await clickText(page, `${DROPDOWN} button`, "View all events");
    await settle("n > 1");
    await page.click(`${DROPDOWN} [role=button]:nth-child(2) button`);
    await page.waitForFunction(() => document.body.innerText.includes("Added to favorites"));
    await page.click(`${DROPDOWN} button[title="Show favorites only"]`);
    await settle("n === 1");
    assert.equal(await page.evaluate(() => localStorage.getItem("trading_favorites")), '["2"]');
    await page.click(`${DROPDOWN} button[title="Show all events"]`);
  });

  await check("picking an event switches the page and the URL, and closes the dropdown", async () => {
    await page.evaluate(() => [...document.querySelectorAll("[role=button]")].find((r) => r.textContent.includes("Bitcoin"))?.click());
    await page.waitForFunction(() => location.search === "?event=2");
    assert.equal(await page.$(DROPDOWN), null);
    assert.match(await page.$eval("header span.font-semibold", (el) => el.textContent), /Bitcoin/);
  });

  await check("option chips select and remember an option", async () => {
    await clickText(page, "button", "$120,000 - $130,000");
    const selected = await page.$eval("button.border-trading-purple", (el) => el.textContent);
    assert.match(selected, /\$120,000 - \$130,000/);
    const remembered = await page.evaluate(() => JSON.parse(localStorage.getItem("trading_last_option") || "{}"));
    assert.equal(remembered["2"], "2-5");
  });

  await check("binary events hide the chips row and have no indicator", async () => {
    await page.goto(`${NEW}?event=6`, { waitUntil: "networkidle2" });
    await page.waitForSelector("header");
    assert.doesNotMatch(await bodyText(page), /Select Option:/);
    assert.equal(await page.$("header .bg-indicator\\/10"), null);
  });

  await check("the countdown ticks", async () => {
    const read = () => page.$eval("header .text-trading-red.font-mono", (el) => el.textContent);
    const first = await read();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    assert.notEqual(await read(), first);
  });

  await browser.close();
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log("✓ no console errors or hydration warnings");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
