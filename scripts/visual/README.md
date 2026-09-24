# Visual checks

Browser checks for the trade page, driven by `puppeteer-core` and the locally
installed Chrome. They stand in for the chrome-devtools MCP when a session
cannot load it (see the dev reference, R-14).

`puppeteer-core` is deliberately not a project dependency. Install it anywhere
and point the scripts at it:

```bash
mkdir -p /tmp/pptr && (cd /tmp/pptr && npm i puppeteer-core)
export PUPPETEER_CORE=/tmp/pptr/node_modules/puppeteer-core
```

Both dev servers must be running: the reference project on `:8080`
(`node_modules/.bin/vite --port 8080` in `tradeomenx`) and this project on `:3000`.

- `measure-layout.cjs [1440x900,1920x1080]` — compares the layout frame
  (position, size, spacing, borders, colours normalised to rgba) of both pages.
- `check-m4.cjs` — page states, event selection and remembered choices, and a
  clean console (no hydration warnings) on this project.
