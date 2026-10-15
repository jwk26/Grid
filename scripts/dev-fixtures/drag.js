// GridDO drag helper for browser checks in the Playwright MCP browser.
//
// dnd-kit starts a drag only after the pointer moves 8px with the button held,
// and it reads drop targets between frames, so a one-jump drag (`dragTo`,
// browser_drag) never lands. This moves in steps and waits between them.
//
// Install once per browser session: browser_run_code_unsafe with
// `filename: "scripts/dev-fixtures/drag.js"`. Then, in later calls:
//   async (page) => page.griddoDrag(
//     page.getByRole("listitem").filter({ hasText: "Archive the old drafts" }).getByLabel("Drag breakdown"),
//     page.getByTestId("bit-staging-zone"))
// `from` and `to` take a Locator or a selector string. The helper only drags;
// check the result with a snapshot or screenshot.
// The file is one function expression because run_code calls it with `page`.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async (page) => {
  const center = async (target) => {
    const locator = typeof target === "string" ? page.locator(target) : target;
    await locator.scrollIntoViewIfNeeded({ timeout: 5000 });
    const box = await locator.boundingBox();
    if (!box) throw new Error(`griddoDrag: no box for ${locator}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };

  page.griddoDrag = async (from, to, { settle = 250 } = {}) => {
    // Resolve both ends first, so a missing target never leaves the button held.
    await center(to);
    const start = await center(from);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    try {
      // Pass the 8px activation distance before heading for the target.
      await page.mouse.move(start.x + 12, start.y, { steps: 4 });
      await page.waitForTimeout(150);
      // Re-read the target: the drag overlay can shift layout.
      const end = await center(to);
      await page.mouse.move(end.x, end.y, { steps: 25 });
      await page.waitForTimeout(settle);
      await page.mouse.move(end.x + 2, end.y + 2, { steps: 2 });
      await page.waitForTimeout(150);
    } finally {
      await page.mouse.up();
    }
    await page.waitForTimeout(settle);
  };
  return "griddoDrag installed";
}
