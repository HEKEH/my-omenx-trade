// M7 trade form behaviour on the replica (plus the order book checks deferred from M6).
const assert = require("node:assert/strict");
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000/trade";

const num = (text) => Number(String(text).replace(/[^\d.-]/g, ""));

// In-page helpers (serialised into each evaluate call).
const helpers = `
  const card = () => {
    const root = [...document.querySelectorAll("div")].find((el) => el.classList.contains("h-screen") && el.classList.contains("flex-col"));
    const body = [...root.children].find((el) => el.classList.contains("flex-1") && el.classList.contains("overflow-hidden"));
    return body.children[1].children[0];
  };
  const button = (text, scope = document) => [...scope.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
  const summary = () => Object.fromEntries([...card().querySelectorAll(".border-t .flex.justify-between")].map((row) => [row.children[0].textContent, row.children[1].textContent]));
  const submit = () => [...card().querySelectorAll("button")].pop();
`;
const run = (page, body) => page.evaluate(new Function(`${helpers}; ${body}`));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const problems = [];
  page.on("console", (msg) => (msg.type() === "error" || /hydrat/i.test(msg.text())) && problems.push(msg.text().slice(0, 200)));
  page.on("pageerror", (err) => problems.push(err.message));
  const open = async (query = "") => {
    await page.goto(BASE + query, { waitUntil: "networkidle2" });
    await page.waitForFunction(() => document.body.innerText.includes("Margin Mode"));
  };
  const typeSize = async (value) => {
    const input = await page.evaluateHandle(new Function(`${helpers}; return [...card().querySelectorAll("input")].find((i) => i.placeholder === "0.00");`));
    await input.focus();
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyA");
    await page.keyboard.up("Control");
    await input.type(value);
  };
  const check = async (name, fn) => {
    await fn();
    console.log(`✓ ${name}`);
  };

  await open("?event=2");
  await page.evaluate(() => window.__tradeMock.freeze());

  await check("summary follows the server rules for amount 100 at 10x", async () => {
    await typeSize("100");
    const s = await run(page, "return summary();");
    const price = await run(page, `return Number(document.querySelector("button.border-trading-purple .font-mono").textContent.replace(/[^\\d.]/g, ""));`);
    const qty = Math.round((100 * 10) / price);
    const notional = Math.round(price * qty * 100) / 100;
    assert.equal(num(s["Notional val."]), notional);
    assert.equal(num(s["Margin req."]), Math.round((price * qty) / 10 * 100) / 100);
    assert.equal(num(s["Total"]), Math.round((num(s["Margin req."]) + num(s["Fee (est.)"])) * 100) / 100);
    const label = await run(page, "return submit().textContent;");
    assert.match(label, /^Buy \$80,000 - \$90,000/);
    assert.match(label, /To win \$[\d,]+/);
  });

  await check("percent slider sizes the order from the available balance", async () => {
    const thumb = await page.evaluateHandle(new Function(`${helpers}; return card().querySelectorAll("[role=slider]")[1];`));
    await thumb.focus();
    await page.keyboard.press("End");
    const value = await run(page, `return [...card().querySelectorAll("input")].find((i) => i.placeholder === "0.00").value;`);
    const balance = await run(page, `return [...card().querySelectorAll(".font-mono.text-xs")].find((e) => e.parentElement.textContent.includes("")).textContent;`);
    assert.equal(num(value), num(balance));
  });

  await check("leverage presets and qty mode", async () => {
    await run(page, `button("5x", card()).click();`);
    assert.match(await run(page, `return card().textContent;`), /Leverage5x/);
    await run(page, `card().querySelector("svg.lucide-arrow-left-right").closest("button").click();`);
    const text = await run(page, `return card().textContent;`);
    assert.match(text, /Qty/);
    await run(page, `card().querySelector("svg.lucide-arrow-left-right").closest("button").click();`);
  });

  await check("clicking an order book level switches to a limit order at that price (M6)", async () => {
    const levelPrice = await page.evaluate(() => {
      const book = [...document.querySelectorAll("div.border-l")].find((el) => el.textContent.includes("Order Book"));
      const row = book.querySelector(".flex-1 > .grid");
      row.click();
      return row.children[1].textContent;
    });
    await page.waitForFunction((p) => [...document.querySelectorAll("input")].some((i) => i.placeholder === "0.0000" && i.value === p), {}, levelPrice);
  });

  await check("No side mirrors the price bar and the order book to 1 - p (M6)", async () => {
    const yesPrice = await page.evaluate(() => Number(document.querySelector(".text-2xl.font-bold.font-mono").textContent));
    await run(page, `card().querySelectorAll("button.relative.flex.flex-col")[1].click();`);
    await page.waitForFunction((p) => Math.abs(Number(document.querySelector(".text-2xl.font-bold.font-mono").textContent) - (1 - p)) < 1e-9, {}, yesPrice);
    const mid = await page.evaluate(() => Number(document.querySelector(".text-lg.font-bold.font-mono").textContent.replace(/[^\d.]/g, "")));
    assert.ok(Math.abs(mid - (1 - yesPrice)) < 0.002, `mid ${mid} vs ${1 - yesPrice}`);
    const submitClass = await run(page, "return submit().className;");
    assert.match(submitClass, /from-trading-red/);
    assert.match(await run(page, "return submit().textContent;"), /^Sell /);
  });

  await check("binary: an order beyond the opposite position is blocked; a smaller one reduces", async () => {
    await open("?event=6");
    await page.evaluate(() => window.__tradeMock.freeze());
    await run(page, `card().querySelectorAll("button.relative.flex.flex-col")[1].click();`);
    await typeSize("5000");
    await page.waitForFunction(new Function(`${helpers}; return submit().disabled;`));
    assert.match(await run(page, "return card().textContent;"), /exceed/);
    assert.match(await run(page, "return submit().textContent;"), /^Order unavailable/);
    await typeSize("5");
    await page.waitForFunction(new Function(`${helpers}; return !submit().disabled;`));
    assert.match(await run(page, "return submit().textContent;"), /^Reduce Yes/);
  });

  await check("binary with side labels shows the team names", async () => {
    await open("?event=7");
    const text = await run(page, `return card().querySelector(".grid.grid-cols-2").textContent;`);
    assert.match(text, /Lakers/);
    assert.match(text, /Celtics/);
  });

  await check("TP/SL percent shows the target price", async () => {
    await open("?event=2");
    await typeSize("100");
    await run(page, `[...card().querySelectorAll("button")].find((b) => b.textContent.includes("TP/SL")).click();`);
    const tp = await page.evaluateHandle(new Function(`${helpers}; return [...card().querySelectorAll("input")].find((i) => i.placeholder === "0");`));
    await tp.type("10");
    await page.waitForFunction(new Function(`${helpers}; return /Target: \\$0\\.\\d{4}/.test(card().textContent);`));
  });

  await browser.close();
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log("✓ no console errors or hydration warnings");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
