// With REF_BACKEND=1, logs the reference (:8080) in as the replica's mock user and
// answers its Supabase REST calls from the replica's seed, so both pages show the
// same events, prices, positions, orders and balance. Only reads are emulated
// (PostgREST table reads with eq / in / order filters); anything else gets a 400.
const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const HOST = "https://placeholder.supabase.co";
const USER_ID = "mock-user";
let seed = null;

const loadSeed = () => {
  if (seed) return seed;
  const script = path.join(__dirname, "dump-seed.ts");
  seed = JSON.parse(execFileSync(`pnpm dlx tsx "${script}"`, { encoding: "utf8", shell: true, maxBuffer: 1 << 26 }));
  return seed;
};

const session = () => {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 86_400;
  const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER_ID, exp, role: "authenticated", aud: "authenticated" })}.sig`;
  return JSON.stringify({
    access_token: jwt,
    refresh_token: "mock",
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: exp,
    user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "demo@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
  });
};

// Google Fonts, fetched once and then served from disk: when a font request stalls the
// reference renders fallback fonts (and navigation never goes idle), which spoils a run.
const FONT_CACHE = path.join(__dirname, ".cache", "fonts");
const FONT_HOSTS = ["https://fonts.googleapis.com/", "https://fonts.gstatic.com/"];

const cachedFont = async (request) => {
  const url = request.url();
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const file = path.join(FONT_CACHE, key);
  if (!fs.existsSync(file)) {
    let lastError;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        // Google serves CSS by user agent; ask as the page's browser does.
        const response = await fetch(url, { headers: { "user-agent": request.headers()["user-agent"] ?? "" }, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        fs.mkdirSync(FONT_CACHE, { recursive: true });
        fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
        fs.writeFileSync(`${file}.type`, response.headers.get("content-type") ?? "application/octet-stream");
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
  }
  return {
    status: 200,
    headers: { "access-control-allow-origin": "*" },
    contentType: fs.readFileSync(`${file}.type`, "utf8"),
    body: fs.readFileSync(file),
  };
};

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-expose-headers": "content-range",
};

const matches = (row, key, expr) => {
  const value = row[key];
  if (expr.startsWith("eq.")) return String(value) === expr.slice(3);
  if (expr.startsWith("neq.")) return String(value) !== expr.slice(4);
  if (expr.startsWith("in.(")) return expr.slice(4, -1).split(",").map((v) => v.replace(/^"|"$/g, "")).includes(String(value));
  if (expr.startsWith("is.")) return expr.slice(3) === "null" ? value == null : String(value) === expr.slice(3);
  if (expr.startsWith("gt.")) return String(value) > expr.slice(3);
  if (expr.startsWith("gte.")) return String(value) >= expr.slice(4);
  if (expr.startsWith("lt.")) return String(value) < expr.slice(3);
  if (expr.startsWith("lte.")) return String(value) <= expr.slice(4);
  return true;
};

const read = (table, params, tables) => {
  let rows = [...(tables[table] ?? [])];
  for (const [key, expr] of params) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    rows = rows.filter((row) => matches(row, key, expr));
  }
  const select = params.get("select") ?? "*";
  // Embedded parents, e.g. `events!inner(name)` or `events(*)`.
  for (const [, parent] of select.matchAll(/(\w+)(?:!inner)?\(/g)) {
    if (!tables[parent]) continue;
    const fk = `${parent.replace(/s$/, "")}_id`;
    rows = rows.map((row) => ({ ...row, [parent]: tables[parent].find((p) => p.id === row[fk]) ?? null }));
  }
  const order = params.get("order");
  if (order) {
    const [column, direction] = order.split(",")[0].split(".");
    rows.sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0) * (direction === "desc" ? -1 : 1));
  }
  const limit = params.get("limit");
  return limit ? rows.slice(0, Number(limit)) : rows;
};

/** Call before `page.goto` on either page. No-op unless REF_BACKEND=1. */
const attachReferenceBackend = async (page, url) => {
  if (!process.env.REF_BACKEND) return;
  if (url.includes(":3000")) {
    // The reference has no live prices here; keep the replica's seed prices still too.
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, "__tradeMock", {
        configurable: true,
        get: () => undefined,
        set(controls) {
          Object.defineProperty(window, "__tradeMock", { value: controls, writable: true, configurable: true });
          controls.freeze();
        },
      });
    });
    return;
  }
  if (!url.includes(":8080")) return;
  const tables = loadSeed();
  // The reference first renders its static fallback events, then swaps in the served rows;
  // measuring in between compares the wrong data. Make `goto` wait for the served data.
  const goto = page.goto.bind(page);
  page.goto = async (target, options = {}) => {
    const response = await goto(target, { ...options, waitUntil: "networkidle2" });
    await page.waitForFunction(
      () => /Positions\s*\(\d+\)/.test(document.body.innerText) && document.body.innerText.includes("Unified Trading Account"),
      { timeout: 30000 },
    );
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return response;
  };
  await page.evaluateOnNewDocument((value) => {
    localStorage.setItem("sb-placeholder-auth-token", value);
    // Realtime can't reach the placeholder host; its reconnect loop would keep the network
    // busy (no "network idle"). Its sockets never connect; others (Vite's HMR) are real.
    const RealSocket = window.WebSocket;
    class QuietSocket {
      readyState = 0;
      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    }
    window.WebSocket = new Proxy(RealSocket, {
      construct: (target, args) => (String(args[0]).includes("placeholder.supabase.co") ? new QuietSocket() : new target(...args)),
    });
  }, session());
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const target = request.url();
    // The reference mounts several hooks more than once with fixed channel names; supabase-js
    // then hands back the already-subscribed channel and the page throws (E-36). Give each
    // channel its own name in the served client module (the reference repo is not modified).
    if (target.includes("/src/integrations/supabase/client.ts")) {
      const source = await (await fetch(target)).text();
      return request.respond({
        status: 200,
        contentType: "application/javascript",
        body: `${source}
const __channel = supabase.channel.bind(supabase);
supabase.channel = (name, options) => __channel(\`\${name}-\${Math.random().toString(36).slice(2)}\`, options);
`,
      });
    }
    if (FONT_HOSTS.some((host) => target.startsWith(host))) {
      return cachedFont(request).then(
        (response) => request.respond(response),
        () => request.abort(),
      );
    }
    if (!target.startsWith(HOST)) return request.continue();
    if (request.method() === "OPTIONS") return request.respond({ status: 204, headers: CORS });
    const { pathname, searchParams } = new URL(target);
    const table = pathname.startsWith("/rest/v1/") ? pathname.slice("/rest/v1/".length) : null;
    if (request.method() !== "GET" || !table || table.startsWith("rpc/")) {
      return request.respond({ status: 400, headers: CORS, contentType: "application/json", body: '{"message":"not emulated"}' });
    }
    const rows = read(table, searchParams, tables);
    const single = (request.headers()["accept"] ?? "").includes("vnd.pgrst.object");
    request.respond({
      status: 200,
      headers: { ...CORS, "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` },
      contentType: "application/json",
      body: JSON.stringify(single ? (rows[0] ?? null) : rows),
    });
  });
};

module.exports = { attachReferenceBackend };
