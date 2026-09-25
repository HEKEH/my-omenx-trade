# Sports event page: comparison scripts

Tools for replicating the reference event page (`omenx-sports`, `/event/<id>` on :8081) at
`/sports/event/<id>` on :3000. See `.doc/体育赛事/体育赛事详情页复刻_开发参考.md` §10 for results.

Browser scripts use puppeteer-core and the local Chrome; set `PUPPETEER_CORE` to the
puppeteer-core install to use. Both dev servers must be running (override the URLs with
`REF_BASE` / `NEW_BASE`).

| Script | What it does |
| --- | --- |
| `common.cjs` | Opens a page with `setInterval` frozen, so the positions' jitter, the live tape and the pre-match countdown stay at their first render (R-3), and defines the region locators. |
| `measure-tree.cjs <id> [WxH] [regions] [--action=…]` | Node-by-node comparison of regions (box, typography, colours, borders, radius, spacing, shadows, own text, SVG paths). Actions open an overlay or change state first, e.g. `--action=menu`. |
| `measure-states.cjs [id] [WxH]` | Rest / hover / focus of 19 representative controls. Hides the reference's floating stream player (B-5), which covers the lower right. |
| `check-flow.cjs` | Runs the same user flows on both pages (orders, close, cancel, TP/SL, BUG-10, `?outcome=`, following a related event, unknown id) and compares what is shown afterwards. Folds the reference's StrictMode duplicates (E-25). |
| `walkthrough.sh` | M9: every region of seven sample events at 1440×900 and 1920×1080. |
| `dump-ref-markets.ts` | Run with bun from the reference root: writes the reference's `ALL_MARKETS` as the baseline for `infrastructure/data.test.ts`. |
| `ref-goldens.ts` | Run with bun from the reference root: prints the expected values the domain tests use, computed by the reference's own functions. |

Without `--action`, `measure-tree` loads each page once and measures every region from it; boxes of elements with a looping animation are not compared (their phase depends on timing).

Regions: `topbar`, `hero`, `prematch`, `stage`, `outcomes`, `tape`, `picker`, `form`, `related`,
`positions`, and the overlays `menu`, `popover`, `dialog`, `toast`.
