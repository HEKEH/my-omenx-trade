// Dumps the reference project's ALL_MARKETS as JSON, the baseline for the data port test
// (dev reference E-21). Run with bun from the reference project root:
//
//   cd ../omenx-sports && bun ../omenx-test/scripts/sports-visual/dump-ref-markets.ts \
//     > ../omenx-test/src/modules/sports/infrastructure/__fixtures__/ref-markets.json
//
// Local image imports (bun resolves them to file paths) become bare file names, so the
// baseline does not depend on where either project lives; external URLs stay as they are.
const { ALL_MARKETS } = await import(`${process.cwd()}/src/data/sports-markets.ts`);

const localAsset = /^(?!https?:).*[\/]([^\/]+\.(?:png|jpe?g|svg|webp))$/i;
const json = JSON.stringify(
  ALL_MARKETS,
  (_key, value) => (typeof value === "string" && localAsset.test(value) ? value.replace(localAsset, "$1") : value),
  2,
);
process.stdout.write(`${json}\n`);

export {};
