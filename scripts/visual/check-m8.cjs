// M8 order flow on the replica: preview dialog, submit, toast, balance and form reset.
const assert = require("node:assert/strict");
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000/trade";

const helpers = `
  const card = () => {
    const root = [...document.querySelectorAll("div")].find((el) => el.classList.contains("h-screen") && el.classList.contains("flex-col"));
    const body = [...root.children].find((el) => el.classList.contains("flex-1") && el.classList.contains("overflow-hidden"));
    return body.children[1].children[0];
  };
  const submit = () => [...card().querySelectorAll("button")].pop();
  const dialog = () => document.querySelector("[role=dialog]");
  const balance = () => Number([...card().querySelectorAll("span")].find((s) => s.textContent === "Available (USDC)").nextElementSibling.children[0].textContent.replace(/,/g, ""));
  const totalCost = () => Number([...card().querySelectorAll(".flex.justify-between")].find((r) => r.children[0].textContent === "Total").children[1].textContent.replace(/[^\\d.]/g, ""));
`;
const run = (page, body) => page.evaluate(new Function(`${helpers}; ${body}`));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const problems = [];
  page.on("console", (msg) => (msg.type() === "error" || /hydrat/i.test(msg.text())) && problems.push(msg.text().slice(0, 200)));
  page.on("pageerror", (err) => problems.push(err.message));

  const open = async (query) => {
    await page.goto(BASE + query, { waitUntil: "networkidle2" });
    await page.waitForFunction(() => document.body.innerText.includes("Margin Mode"));
    await page.evaluate(() => window.__tradeMock.freeze());
  };
  const typeSize = async (value) => {
    const input = await page.$('input[placeholder="0.00"]');
    await input.focus();
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyA");
    await page.keyboard.up("Control");
    await input.type(value);
  };
  const waitToast = async (text) => {
    try {
      await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 5000 }, text);
    } catch {
      const toasts = await page.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.innerText));
      throw new Error(`toast \"${text}\" not shown; toasts: ${JSON.stringify(toasts)}`);
    }
  };
  const check = async (name, fn) => {
    console.log(`… ${name}`);
    await fn();
    console.log(`✓ ${name}`);
  };

  await check("market order: preview → confirm → toast, balance and form reset", async () => {
    await open("?event=2");
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.startsWith("$100,000 - $110,000")).click());
    await typeSize("100");
    const before = await run(page, "return balance();");
    const total = await run(page, "return totalCost();");
    await run(page, "submit().click();");
    await page.waitForSelector("[role=dialog]");
    const text = await run(page, "return dialog().innerText;");
    assert.match(text, /Order Preview/);
    assert.match(text, /add/i, "adds to the seeded long position");
    assert.match(text, /This order increases exposure/);
    await run(page, "[...dialog().querySelectorAll('button')].find((b) => b.textContent.includes('To win')).click();");
    await waitToast("Order executed successfully!");
    await page.waitForFunction(() => !document.querySelector("[role=dialog]"));
    await page.waitForFunction(new Function(`${helpers}; return balance() !== ${before};`));
    assert.equal(await run(page, "return balance();"), Math.round((before - total) * 100) / 100);
    assert.equal(await page.$eval('input[placeholder="0.00"]', (el) => el.value), "0.00");
  });

  await check("limit order: preview shows the limit price; confirm reserves funds", async () => {
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Limit").click());
    const priceInput = await page.$('input[placeholder="0.0000"]');
    await priceInput.focus();
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyA");
    await page.keyboard.up("Control");
    await priceInput.type("0.2000");
    await typeSize("50");
    const before = await run(page, "return balance();");
    const total = await run(page, "return totalCost();");
    await run(page, "submit().click();");
    await page.waitForSelector("[role=dialog]");
    assert.match(await run(page, "return dialog().innerText;"), /Price\s+0\.2000 USDC/);
    await run(page, "[...dialog().querySelectorAll('button')].find((b) => b.textContent.includes('To win')).click();");
    await waitToast("Limit order placed successfully!");
    await page.waitForFunction(new Function(`${helpers}; return balance() !== ${before};`));
    assert.equal(await run(page, "return balance();"), Math.round((before - total) * 100) / 100);
  });

  await check("binary opposite order previews as a reduce with released margin", async () => {
    await open("?event=6");
    await run(page, `card().querySelectorAll("button.relative.flex.flex-col")[1].click();`);
    await typeSize("5");
    await run(page, "submit().click();");
    await page.waitForSelector("[role=dialog]");
    const text = await run(page, "return dialog().innerText;");
    assert.match(text, /reduce/i);
    assert.match(text, /Released margin/);
    await run(page, "[...dialog().querySelectorAll('button')].find((b) => b.textContent.includes('To win')).click();");
    await waitToast("Order executed successfully!");
  });

  await check("an unaffordable order is refused with the balance message", async () => {
    await open("?event=2");
    await page.evaluate(() => {
      const button = document.querySelectorAll("button");
      [...button].find((b) => b.textContent.trim() === "1x").click();
    });
    await typeSize("999999");
    await run(page, "submit().click();");
    await page.waitForSelector("[role=dialog]");
    await run(page, "[...dialog().querySelectorAll('button')].find((b) => b.textContent.includes('To win')).click();");
    await waitToast("Insufficient balance");
    assert.ok(await page.$("[role=dialog]"), "dialog stays open on failure");
  });

  await browser.close();
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log("✓ no console errors or hydration warnings");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
