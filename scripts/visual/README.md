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

Comparisons (reference vs replica; each prints `SAME` or the differing values):

- `measure-layout.cjs [1440x900,1920x1080]` — the layout frame: position, size,
  spacing, borders and colours (normalised to rgba).
- `measure-header.cjs [WxH] [?event=N]` — header, event selector, indicator,
  stats strip and option chips.
- `measure-book.cjs [WxH] [?event=N]` — chart card tabs and price bar, order book.
- `measure-form.cjs [WxH] [?event=N] [limit|tpsl|no]` — the trade form, section
  by section, in the given state.
- `measure-panel.cjs [WxH] [orders|positions]` — the positions / orders panel
  (removes the reference's logged-out blur first, R-1).
- `measure-states.cjs [WxH]` — rest / hover / focus styles of representative
  controls; reports a hover the reference's overlay blocks as "not measurable".

Set `REF_FONTS=1` to render the replica in the fonts the reference actually
shows (system sans-serif instead of Inter, dev reference E-33 / A-12). Any
difference left then is not caused by the font.

- `measure-tree.cjs [WxH] [region,...]` — node-by-node comparison of whole
  regions and overlays (header, chips, chart, book, form, panel, risk, cancel,
  close, tpsl, detail, preview, dropdown, indicator): box, spacing, typography,
  colours, borders, shadows, own text and SVG path data. `MAX_DIFFS` caps the
  lines printed per region.

Set `REF_BACKEND=1` to compare against the same data: the reference is logged in
as the replica's mock user and its Supabase REST reads are answered from the
replica's seed (`dump-seed.ts`), while the replica starts frozen. Google Fonts
requests are cached in `scripts/visual/.cache/` (git-ignored) so the reference's
fonts load reliably. See `ref-backend.cjs` for the details, including the
workaround for the reference's duplicate realtime channels (dev reference E-36).

The usual full run: `REF_BACKEND=1 REF_FONTS=1 node scripts/visual/measure-tree.cjs 1440x900`.

Behaviour checks on the replica (each also fails on console errors or hydration
warnings):

- `check-m4.cjs` — page states, event selection and remembered choices.
- `check-m5.cjs` — header interactions; dropdown / popover geometry vs the reference.
- `check-m6.cjs` — order book interactions.
- `check-m7.cjs` — trade form behaviour.
- `check-m8.cjs` — order flow: preview, submit, toast, balance and form reset.
- `check-m9.cjs` — cancel, partial close, TP/SL edit, position detail, risk card,
  "Go to this event".
