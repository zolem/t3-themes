// Take the repo's screenshots of themes in the demo copy of T3 Code. See demo.mjs for where
// the demo data lives and how private details are kept out.
//
//   npm run shoot                      every theme
//   npm run shoot -- workshop lcars    some themes
//   npm run shoot -- --reseed          rebuild the demo data first
//
// Each theme gets new-thread.png, thread.png and panels.png in themes/<id>/screenshots/.
// To screenshot a theme that isn't in the repo yet, or other views, use dev.mjs.

import fs from "node:fs";
import path from "node:path";
import { applyTheme, demoDir, demoServer, openApp, repo, resolveTheme } from "./demo.mjs";

const args = process.argv.slice(2);
const reseed = args.includes("--reseed");
const themeIds = args.filter((a) => !a.startsWith("--"));
const allThemes = fs
  .readdirSync(path.join(repo, "themes"))
  .filter((id) => fs.existsSync(path.join(repo, "themes", id, "theme.json")));
const ids = themeIds.length ? themeIds : allThemes;
for (const id of ids) if (!allThemes.includes(id)) throw new Error(`No theme named ${id} in themes/`);

const SHOTS = [
  ["new-thread.png", "new"],
  ["thread.png", "thread"],
  ["panels.png", "panels"],
];

const server = await demoServer({ reseed });
let app;
try {
  app = await openApp(server);
  for (const id of ids) {
    const theme = resolveTheme(id);
    applyTheme(theme);
    await app.page.emulateMedia({ colorScheme: theme.appearance === "light" ? "light" : "dark" });
    const outDir = path.join(repo, "themes", id, "screenshots");
    for (const [file, view] of SHOTS) {
      await app.views[view]();
      await app.shot(path.join(outDir, file));
    }
    // Leave the panels closed for the next theme's new-thread screen.
    await app.views.thread();
    console.log(`${id}: saved ${SHOTS.map(([f]) => f).join(", ")}`);
  }
} catch (err) {
  // Save what the page looked like for debugging. It stays in the demo folder, outside the repo.
  const failure = path.join(demoDir, "failure.png");
  await app?.page.screenshot({ path: failure }).catch(() => {});
  if (app) console.error(`Page at failure: ${failure}`);
  throw err;
} finally {
  await app?.browser.close();
  server.stop();
}
