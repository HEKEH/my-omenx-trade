// Measures the trade page layout frame on the reference (:8080) and the replica (:3000).
const puppeteer = require(process.env.PUPPETEER_CORE || "puppeteer-core");
const { emulateReferenceFonts } = require("./ref-fonts.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const viewports = (process.argv[2] || "1440x900,1920x1080").split(",").map((v) => v.split("x").map(Number));

const probe = () => {
  const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d");
  const rgba = (color) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000"; ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r},${g},${b},${Math.round((a / 255) * 100) / 100})`;
  };
  const root = [...document.querySelectorAll("div")].find(
    (el) => el.classList.contains("h-screen") && el.classList.contains("flex-col") && el.classList.contains("overflow-hidden"),
  );
  if (!root) return { error: "root not found", text: document.body.innerText.slice(0, 200) };
  const kids = [...root.children];
  const body = kids.find((el) => el.classList.contains("flex-1") && el.classList.contains("overflow-hidden"));
  const left = body?.children[0];
  const topRow = left?.children[0];
  const right = body?.children[1];
  const nodes = {
    root,
    header: kids[0],
    chips: kids.find((el) => el.classList.contains("overflow-x-auto")) ?? (kids[1] !== body ? kids[1] : null),
    body,
    left,
    topRow,
    chartCard: topRow?.children[0],
    bookCard: topRow?.children[1],
    bottom: left?.children[1],
    right,
    tradeCard: right?.children[0],
  };
  const pick = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      x: Math.round(r.x * 100) / 100,
      y: Math.round(r.y * 100) / 100,
      w: Math.round(r.width * 100) / 100,
      h: Math.round(r.height * 100) / 100,
      pad: s.padding,
      margin: s.margin,
      gap: s.gap,
      border: `${s.borderTopWidth} ${s.borderRightWidth} ${s.borderBottomWidth} ${s.borderLeftWidth}`,
      borderColor: rgba(s.borderTopColor),
      radius: s.borderRadius,
      bg: rgba(s.backgroundColor),
      minH: s.minHeight,
    };
  };
  const out = Object.fromEntries(Object.entries(nodes).map(([k, el]) => [k, pick(el)]));
  const b = getComputedStyle(document.body);
  out.document = { bodyBg: rgba(b.backgroundColor), bodyColor: rgba(b.color), bodyFont: b.fontFamily.split(",")[0], fontSize: b.fontSize };
  return out;
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const results = {};
  for (const [width, height] of viewports) {
    for (const [name, url] of [["ref", "http://localhost:8080/trade"], ["new", "http://localhost:3000/trade"]]) {
      const page = await browser.newPage();
      await page.setViewport({ width, height });
      const errors = [];
      page.on("console", (msg) => ["error", "warn"].includes(msg.type()) && errors.push(`${msg.type()}: ${msg.text().slice(0, 160)}`));
      page.on("pageerror", (err) => errors.push(`pageerror: ${err.message.slice(0, 160)}`));
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await emulateReferenceFonts(page, url);
      await page.waitForFunction(() => !document.body.innerText.includes("Loading events"), { timeout: 30000 }).catch(() => {});
      results[`${name}@${width}x${height}`] = { ...(await page.evaluate(probe)), consoleErrors: errors.slice(0, 8) };
      await page.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 1));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
