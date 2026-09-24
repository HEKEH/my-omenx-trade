// M6 order book interactions, compared with the reference where the behaviour is shared.
const assert = require("node:assert/strict");
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const bookInfo = () => {
  const root = [...document.querySelectorAll("div")].find((el) => el.classList.contains("h-screen") && el.classList.contains("flex-col"));
  const body = [...root.children].find((el) => el.classList.contains("flex-1") && el.classList.contains("overflow-hidden"));
  const book = body.children[0].children[0].children[1].children[0];
  const lists = [...book.querySelectorAll(":scope > .flex-1")];
  const firstRow = lists[0]?.children[0];
  return {
    lists: lists.map((list) => list.children.length),
    rowH: firstRow ? Math.round(firstRow.getBoundingClientRect().height * 100) / 100 : null,
    header: [...book.children].find((el) => el.classList.contains("grid"))?.textContent,
    firstPrice: firstRow?.children[0]?.textContent ?? firstRow?.textContent,
  };
};

const clickButton = (page, predicate) =>
  page.evaluate((src) => {
    const match = new Function("b", `return (${src})(b)`);
    const button = [...document.querySelectorAll("button")].find((b) => match(b));
    if (!button) throw new Error("button not found");
    button.click();
  }, predicate.toString());

async function scenario(page) {
  await page.bringToFront();
  const result = {};
  result.both = await page.evaluate(bookInfo);
  // View modes are the three icon buttons right after the tabs.
  const viewButtons = () =>
    page.evaluate(() => [...[...document.querySelectorAll("div.border-l")].find((el) => el.textContent.includes("Order Book")).querySelectorAll("button.w-5.h-5")].length);
  result.viewButtons = await viewButtons();
  await page.evaluate(() => [...document.querySelectorAll("div.border-l")].find((el) => el.textContent.includes("Order Book")).querySelectorAll("button.w-5.h-5")[1].click());
  result.bidsOnly = await page.evaluate(bookInfo);
  await page.evaluate(() => [...document.querySelectorAll("div.border-l")].find((el) => el.textContent.includes("Order Book")).querySelectorAll("button.w-5.h-5")[2].click());
  result.asksOnly = await page.evaluate(bookInfo);
  await page.evaluate(() => [...document.querySelectorAll("div.border-l")].find((el) => el.textContent.includes("Order Book")).querySelectorAll("button.w-5.h-5")[0].click());
  await clickButton(page, (b) => b.textContent.trim() === "0.0001");
  await clickButton(page, (b) => b.textContent.trim() === "0.01");
  result.step001 = await page.evaluate(bookInfo);
  await clickButton(page, (b) => b.textContent.trim() === "Recent Trades");
  result.trades = await page.evaluate(bookInfo);
  return result;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const open = async (url) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForFunction(() => document.body.innerText.includes("Price(USDT)"), { timeout: 30000 });
    return page;
  };
  const ref = await scenario(await open("http://localhost:8080/trade"));
  const page = await open("http://localhost:3000/trade");
  const problems = [];
  page.on("console", (msg) => (msg.type() === "error" || /hydrat/i.test(msg.text())) && problems.push(msg.text().slice(0, 200)));
  const now = await scenario(page);
  console.log("ref", JSON.stringify(ref));
  console.log("new", JSON.stringify(now));

  for (const key of ["both", "bidsOnly", "asksOnly", "trades"]) {
    assert.deepEqual(now[key].lists, ref[key].lists, `${key} list sizes`);
    assert.equal(now[key].rowH, ref[key].rowH, `${key} row height`);
    assert.equal(now[key].header, ref[key].header, `${key} column header`);
  }
  assert.equal(now.viewButtons, ref.viewButtons);
  assert.ok(now.step001.lists[0] < now.both.lists[0], "0.01 buckets merge levels");
  console.log("✓ view modes, price step, recent trades match the reference");

  // No side: prices mirror to 1 - p.
  await page.goto("http://localhost:3000/trade?event=2", { waitUntil: "networkidle2" });
  await page.waitForFunction(() => document.body.innerText.includes("Price(USDT)"));
  const yes = await page.evaluate(() => Number(document.querySelector(".text-lg.font-bold.font-mono").textContent.replace(/[^\d.]/g, "")));
  const option = await page.evaluate(() => Number(document.querySelector("button.border-trading-purple .font-mono").textContent.replace(/[^\d.]/g, "")));
  assert.ok(Math.abs(yes - option) < 0.01, `Yes-side mid ${yes} near option price ${option}`);
  console.log("✓ Yes side mid tracks the option price");

  // Binary market: the order book centres on the selected option's own price.
  await page.goto("http://localhost:3000/trade?event=6", { waitUntil: "networkidle2" });
  await page.waitForFunction(() => document.body.innerText.includes("Price(USDT)"));
  const mid = await page.evaluate(() => Number(document.querySelector(".text-lg.font-bold.font-mono").textContent.replace(/[^\d.]/g, "")));
  assert.ok(mid > 0.4 && mid < 0.8, `binary mid ${mid}`);
  console.log("✓ binary market book renders");

  await browser.close();
  assert.deepEqual(problems, [], problems.join("\n"));
  console.log("✓ no console errors or hydration warnings");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
