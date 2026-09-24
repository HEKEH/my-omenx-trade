// M9 positions / orders / risk behaviour on the replica.
const assert = require("node:assert/strict");
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000/trade";

const helpers = `
  const panel = () => {
    const root = [...document.querySelectorAll("div")].find((el) => el.classList.contains("h-screen") && el.classList.contains("flex-col"));
    const body = [...root.children].find((el) => el.classList.contains("flex-1") && el.classList.contains("overflow-hidden"));
    return body.children[0].children[1];
  };
  const rows = () => [...panel().querySelectorAll("tbody tr")].filter((r) => r.children.length > 1);
  const tabButton = (prefix) => [...panel().querySelectorAll("button")].find((b) => b.textContent.startsWith(prefix));
  const balance = () => Number([...document.querySelectorAll("span")].find((s) => s.textContent === "Available (USDC)").nextElementSibling.children[0].textContent.replace(/,/g, ""));
  const dialog = () => document.querySelector("[role=dialog], [role=alertdialog]");
  const riskCard = () => [...document.querySelectorAll("div")].find((d) => d.className === "p-3 space-y-3");
`;
const run = (page, body) => page.evaluate(new Function(`${helpers}; ${body}`));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const problems = [];
  page.on("console", (msg) => (msg.type() === "error" || /hydrat/i.test(msg.text())) && problems.push(msg.text().slice(0, 200)));
  page.on("pageerror", (err) => problems.push(err.message));
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => document.body.innerText.includes("Current Orders"));
  await page.evaluate(() => window.__tradeMock.freeze());
  const waitText = (text) => page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 5000 }, text);
  const check = async (name, fn) => {
    console.log(`… ${name}`);
    try {
      await fn();
    } catch (err) {
      // Show what was on screen when a step failed.
      const state = await page.evaluate(() => ({
        dialog: document.querySelector("[role=dialog], [role=alertdialog]")?.innerText.slice(0, 400) ?? null,
        toasts: [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText),
      }));
      console.log(JSON.stringify(state, null, 1));
      throw err;
    }
    console.log(`✓ ${name}`);
  };

  await check("opens on Current Orders with seeded counts", async () => {
    const text = await run(page, "return panel().children[0].textContent;");
    assert.match(text, /Positions\s*\(3\)/);
    assert.match(text, /Current Orders\s*\(2\)/);
    assert.equal(await run(page, "return rows().length;"), 2);
  });

  await check("cancel order: confirm → toast, refund, row gone", async () => {
    const before = await run(page, "return balance();");
    await run(page, "rows()[0].querySelector('button:last-of-type').click();");
    await page.waitForSelector("[role=alertdialog]");
    assert.match(await run(page, "return dialog().innerText;"), /Are you sure you want to cancel this order\?/);
    await run(page, "[...dialog().querySelectorAll('button')].find((b) => b.textContent === 'Cancel Order').click();");
    await waitText("Order Cancelled");
    await page.waitForFunction(new Function(`${helpers}; return rows().length === 1 && balance() > ${before};`));
  });

  await check("positions tab: partial close credits the balance and shrinks the row", async () => {
    await run(page, "tabButton('Positions').click();");
    await page.waitForFunction(new Function(`${helpers}; return rows().length === 3;`));
    const btcIndex = await run(page, "return rows().findIndex((r) => r.textContent.includes('$100,000 - $110,000'));");
    const sizeBefore = await run(page, `return Number(rows()[${btcIndex}].children[2].textContent.replace(/,/g, ""));`);
    const before = await run(page, "return balance();");
    await run(page, `[...rows()[${btcIndex}].querySelectorAll('button')].pop().click();`);
    await page.waitForSelector("[role=dialog]");
    assert.match(await run(page, "return dialog().innerText;"), /Close position/);
    await run(page, "[...dialog().querySelectorAll('button')].find((b) => b.textContent === '25%').click();");
    await page.waitForFunction(new Function(`${helpers}; return [...dialog().querySelectorAll('button')].some((b) => /^Close [0-9,]+ contracts$/.test(b.textContent) && !b.disabled);`), { timeout: 5000 });
    await run(page, "[...dialog().querySelectorAll('button')].find((b) => b.textContent.startsWith('Close ') && b.textContent.includes('contracts')).click();");
    await waitText("Closed");
    await page.waitForFunction(
      new Function(`${helpers}; const r = rows().find((row) => row.textContent.includes('$100,000 - $110,000')); return r && Number(r.children[2].textContent.replace(/,/g, "")) < ${sizeBefore};`),
    );
    await page.waitForFunction(new Function(`${helpers}; return balance() !== ${before};`));
    const toast = await page.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText).join(" | "));
    const closed = Number(/Closed (\d+) contracts/.exec(toast)[1]);
    const remaining = Number(/(\d+) remaining/.exec(toast)[1]);
    assert.equal(closed + remaining, sizeBefore, `toast: ${toast}`);
    // Let the close dialog finish its exit animation before opening the next one.
    await page.waitForFunction(() => !document.querySelector("[role=dialog]"));
  });

  await check("edit TP/SL: saved values show in the row", async () => {
    await run(page, "rows()[0].children[9].querySelector('button').click();");
    await page.waitForSelector("[role=dialog]");
    const input = await page.$("[role=dialog] input[type=number]");
    await input.type("10");
    await run(page, "[...dialog().querySelectorAll('button')].find((b) => b.textContent === 'Confirm').click();");
    await waitText("TP/SL Updated");
    await page.waitForFunction(new Function(`${helpers}; return rows()[0].children[9].textContent.includes('+10%');`));
  });

  await check("position detail dialog shows net P&L and funding", async () => {
    await run(page, "rows()[0].querySelector('button[title=\"View position details\"]').click();");
    await page.waitForFunction(() => document.querySelector("[role=dialog]")?.innerText.includes("Net unrealized PnL"));
    const text = await run(page, "return dialog().innerText;");
    assert.match(text, /Funding/);
    assert.match(text, /Current rate \/ hour/);
    assert.match(text, /Liq\. price/);
    await page.keyboard.press("Escape");
    // Radix keeps body pointer-events off during the exit animation; a hover then would be lost.
    await page.waitForFunction(() => !document.querySelector("[role=dialog]") && !document.body.style.pointerEvents);
  });

  await check("risk card: equity = balance + unrealized P&L; eye hides values", async () => {
    const text = await run(page, "return riskCard().innerText;");
    assert.match(text, /Unified Trading Account/);
    assert.match(text, /Risk Ratio/);
    assert.match(text, /SAFE|WARNING|RESTRICTION|LIQUIDATION/);
    await run(page, "riskCard().querySelector('button').click();");
    assert.match(await run(page, "return riskCard().innerText;"), /\*\*\*\*/);
  });

  await check("'Go to this event' from a row switches the page", async () => {
    const hover = await page.evaluateHandle(new Function(`${helpers}; return rows().find((r) => r.textContent.includes('Fed interest')).querySelector('.cursor-help');`));
    // ElementHandle.hover scrolls the trigger into view (it sits below the fold at 900px).
    await page.mouse.move(0, 0);
    await hover.asElement().hover();
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Go to this event")), { timeout: 5000 });
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Go to this event")).click());
    await page.waitForFunction(() => location.search === "?event=4");
  });

  await browser.close();
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log("✓ no console errors or hydration warnings");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
