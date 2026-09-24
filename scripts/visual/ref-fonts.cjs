// With REF_FONTS=1, renders the replica in the fonts the reference actually shows:
// the reference never loads Inter, so its sans text falls back to the system
// sans-serif (dev reference E-33). Leaves the reference page untouched. Used to
// tell font-caused deltas from real ones (A-12 keeps Inter in the product).
const emulateReferenceFonts = async (page, url) => {
  if (!process.env.REF_FONTS || !url.includes(":3000")) return;
  await page.addStyleTag({ content: "html { --font-inter: sans-serif !important; }" });
  await page.evaluate(() => document.fonts.ready);
};

module.exports = { emulateReferenceFonts };
