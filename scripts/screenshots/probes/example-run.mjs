// An example for `npm run dev -- run <theme> probes/example-run.mjs`. Copy it and change it.
// It gets the Playwright page plus the dev tool's helpers: views.<name>() opens a view,
// fakeState("Failed") shows the shown thread's sidebar row in a state, and shot("name")
// saves a privacy-checked screenshot. Whatever it returns is printed.
export default async ({ page, views, shot }) => {
  await views.thread();

  // Hover a sidebar row to show its hover state and tooltip.
  await page.locator("[data-thread-item]").first().hover();
  await page.waitForTimeout(800);
  await shot("hover-row");

  // Scroll the conversation to the top.
  await page.locator(".messages-timeline-scroll").evaluate((el) => (el.scrollTop = 0));
  await page.waitForTimeout(500);
  await shot("scrolled-top");

  // Measure the main regions, for example to check that their tops line up.
  return page.evaluate(() =>
    Object.fromEntries(
      ['[data-slot="sidebar-inner"]', "[data-chat-header]", '[data-workspace-area="conversation"]'].map((sel) => {
        const r = document.querySelector(sel)?.getBoundingClientRect();
        return [sel, r && { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }];
      }),
    ),
  );
};
