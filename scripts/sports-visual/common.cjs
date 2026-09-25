// Shared setup for the sports page comparison scripts: the two pages, a frozen clock for
// setInterval (dev reference R-3) and in-page locators for the page's regions.
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const REF_BASE = process.env.REF_BASE || "http://localhost:8081/event/";
const NEW_BASE = process.env.NEW_BASE || "http://localhost:3000/sports/event/";
const pages = (id) => [
  ["ref", `${REF_BASE}${id}`],
  ["new", `${NEW_BASE}${id}`],
];

const launch = () => puppeteer.launch({ executablePath: CHROME, headless: true });

/**
 * Opens a page with setInterval frozen, so the positions' jitter, the live tape and the
 * pre-match countdown all stay at their first render. setTimeout is left alone: Radix, sonner
 * and the form pulse need it.
 */
async function openPage(browser, url, { width = 1440, height = 900, freeze = true } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  if (freeze) {
    await page.evaluateOnNewDocument(() => {
      window.setInterval = () => 0;
    });
  }
  const problems = [];
  page.on("console", (msg) => (msg.type() === "error" || /hydrat/i.test(msg.text())) && problems.push(msg.text().slice(0, 200)));
  page.on("pageerror", (err) => problems.push(err.message));
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
  return { page, problems };
}

const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

// In-page locators; both pages share the reference's DOM structure (dev reference §2).
const locators = `
  const grid = () => [...document.querySelectorAll("div")].find((el) => el.className.includes("lg:grid-cols-[minmax(0,1fr)_360px]"));
  const shell = () => grid().parentElement;
  const left = () => grid().children[0];
  const right = () => grid().children[1];
  const bottom = () => grid().nextElementSibling;
  const leftChild = (test) => [...left().children].find(test);
  const regions = {
    topbar: () => shell().querySelector(":scope > header"),
    hero: () => left().children[0],
    prematch: () => leftChild((el) => el.textContent.includes("Projected lineups")),
    stage: () => leftChild((el) => el.querySelector(":scope > [role=tablist]")),
    outcomes: () => leftChild((el) => el.textContent.includes("Price history")) || left().querySelector("[role=tabpanel] > div"),
    tape: () => leftChild((el) => el.textContent.startsWith("Live tape")),
    picker: () => right().children[0],
    form: () => right().children[1],
    related: () => [...bottom().children].find((el) => el.textContent.startsWith("Related events")),
    positions: () => [...bottom().children].find((el) => el.textContent.includes("Open Orders")),
    menu: () => document.querySelector("[role=menu]"),
    popover: () => document.querySelector("[data-radix-popper-content-wrapper] > *"),
    dialog: () => document.querySelector("[role=dialog], [role=alertdialog]"),
    toast: () => document.querySelector("[data-sonner-toast]"),
  };
`;

module.exports = { launch, openPage, settle, pages, locators };
