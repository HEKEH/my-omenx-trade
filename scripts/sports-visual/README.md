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
| `dump-ref-markets.ts` | Run with bun from the reference root: writes the reference's `ALL_MARKETS` as the baseline for `infrastructure/data.test.ts`. |
| `ref-goldens.ts` | Run with bun from the reference root: prints the expected values the domain tests use, computed by the reference's own functions. |

Regions: `topbar`, `hero`, `prematch`, `stage`, `outcomes`, `tape`, `picker`, `form`, `related`,
`positions`, and the overlays `menu`, `popover`, `dialog`, `toast`.
