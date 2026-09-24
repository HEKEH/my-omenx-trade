// M4 browser acceptance on the replica (:3000).
const assert = require("node:assert/strict");
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");

const BASE = "http://localhost:3000/trade";
const eventOnScreen = (page) => page.$eval("[data-event-id]", (el) => el.getAttribute("data-event-id")).catch(() => null);
const text = (page) => page.evaluate(() => document.body.innerText);
const ready = (page) =>
  page.waitForFunction(() => !document.body.innerText.includes("Loading events"), { timeout: 30000 });

(async () => {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const problems = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (msg.type() === "error" || /hydrat/i.test(t)) problems.push(`${msg.type()}: ${t.slice(0, 200)}`);
  });
  page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));

  const check = async (name, fn) => {
    await fn();
    console.log(`✓ ${name}`);
  };

  await check("unknown ?event= shows the ended fallback with the id", async () => {
    await page.goto(`${BASE}?event=nope`, { waitUntil: "networkidle2" });
    await ready(page);
    const body = await text(page);
    assert.match(body, /Event Has Ended/);
    assert.match(body, /nope/);
  });

  await check("default event is the first open one", async () => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE, { waitUntil: "networkidle2" });
    await ready(page);
    assert.equal(await eventOnScreen(page), "1");
  });

  await check("last viewed event is remembered across reloads", async () => {
    await page.evaluate(() => localStorage.setItem("trading_last_event", "3"));
    await page.reload({ waitUntil: "networkidle2" });
    await ready(page);
    assert.equal(await eventOnScreen(page), "3");
  });

  await check("?event= wins over the remembered event; binary hides the chips row", async () => {
    await page.goto(`${BASE}?event=6`, { waitUntil: "networkidle2" });
    await ready(page);
    assert.equal(await eventOnScreen(page), "6");
    const rows = await page.$eval("[data-event-id]", (el) => el.children.length);
    assert.equal(rows, 2, "header + body only");
    assert.equal(await page.evaluate(() => localStorage.getItem("trading_last_event")), "6");
  });

  await check("multi-outcome event shows the chips row", async () => {
    await page.goto(`${BASE}?event=2`, { waitUntil: "networkidle2" });
    await ready(page);
    assert.equal(await page.$eval("[data-event-id]", (el) => el.children.length), 3);
  });

  await check("no events shows the empty state", async () => {
    await page.goto(BASE, { waitUntil: "networkidle2" });
    await ready(page);
    await page.evaluate(() => window.__tradeMock.reset({ events: [] }));
    await page.waitForFunction(() => document.body.innerText.includes("No events available"), { timeout: 5000 });
  });

  await check("devtools controls are installed", async () => {
    const keys = await page.evaluate(() => Object.keys(window.__tradeMock || {}).sort());
    assert.deepEqual(keys, ["freeze", "reset", "resume", "setPrice"]);
  });

  await browser.close();
  assert.deepEqual(problems, [], `console problems:\n${problems.join("\n")}`);
  console.log("✓ no hydration warnings or console errors");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
