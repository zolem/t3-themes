// Develop a theme against the demo copy of T3 Code, so you can see your work without
// touching your own T3. See demo.mjs for where the demo data lives and how private
// details are kept out.
//
//   npm run setup                                   check what's needed and create the demo copy (once)
//   npm run demo [-- <theme>]                       start the demo copy and keep it running
//   npm run dev -- shot <theme> [views...]           screenshot views of a theme
//   npm run dev -- turn <theme>                      screenshot a real agent turn as it runs
//   npm run dev -- eval <theme> <script.js> [view]   run a script in the page and print what it returns
//   npm run dev -- run <theme> <script.mjs>          run a Playwright script for anything else (hover, scroll, resize…)
//
// <theme> is a repo theme id (azeroth) or a path to a theme JSON file anywhere. A background
// image beside the file (background.jpg, or <name>.jpg, .png or .webp) goes with it.
//
// Options:
//   --id <id>            theme id to publish under (default: the folder name for theme.json,
//                        otherwise the file name)
//   --out <dir>          where screenshots go (default ~/.t3-themes-demo/shots/<id>)
//   --state <State>      for shot: show the shown thread's sidebar row in this state, such
//                        as Working, Approval, Input, Failed or Done
//   --width, --height    viewport size (default 1600x1000)
//   --scale <n>          device scale factor (default 1; shoot.mjs uses 2)
//   --reseed             rebuild the demo data first (runs real agent turns)
//
// Views: new, thread, panels, menu, settings. With no views, shot takes new, thread and panels.
//
// Commands reuse the server `npm run demo` is running, which is faster. Otherwise each one
// starts its own and stops it at the end.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  SEED_THREADS,
  T3_MISSING,
  TEST_THREAD,
  applyTheme,
  demoDir,
  demoServer,
  findThreadId,
  home,
  isSeeded,
  openApp,
  resolveTheme,
  seedModel,
  seedProvider,
  t3Background,
  t3Version,
} from "./demo.mjs";

const USAGE = `Usage:
  npm run setup
  npm run demo [-- <theme>]
  npm run dev -- shot <theme> [views...] [--state <State>] [--out <dir>]
  npm run dev -- turn <theme> [--out <dir>]
  npm run dev -- eval <theme> <script.js> [view]
  npm run dev -- run <theme> <script.mjs>
Options: --id <id>, --width <px>, --height <px>, --scale <n>, --reseed`;

// --- arguments -----------------------------------------------------------------
const VALUE_FLAGS = ["--id", "--out", "--state", "--width", "--height", "--scale"];
const opts = {};
const positional = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VALUE_FLAGS.includes(a)) opts[a.slice(2)] = argv[++i];
  else if (a === "--reseed") opts.reseed = true;
  else if (a === "--help" || a === "-h") (console.log(USAGE), process.exit(0));
  else if (a.startsWith("--")) fail(`Unknown option ${a}`);
  else positional.push(a);
}
const [command, themeArg, ...rest] = positional;

function fail(message) {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(1);
}

const viewport = { width: Number(opts.width ?? 1600), height: Number(opts.height ?? 1000) };
const scale = Number(opts.scale ?? 1);
const theme = themeArg ? resolveTheme(themeArg, opts.id) : null;
const outDir = path.resolve(opts.out ?? path.join(demoDir, "shots", theme?.id ?? "demo"));

const VIEWS = ["new", "thread", "panels", "menu", "settings"];
const checkView = (name) => VIEWS.includes(name) || fail(`Unknown view "${name}". Views: ${VIEWS.join(", ")}`);

// --- commands --------------------------------------------------------------------
// T3 versions that added theme features. A nightly is "<base>-nightly.<date>.<build>".
const FEATURES = [
  ["Themes with CSS", { base: [0, 1, 10], build: 4669 }],
  ["Background image files", { base: [0, 1, 10], build: 4800 }],
  ["css up to 100,000 characters (50,000 before)", { base: [0, 1, 11], build: 4825 }],
];

function supports(version, { base, build }) {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-nightly\.\d+\.(\d+))?/);
  if (!m) return null;
  const have = m.slice(1, 4).map(Number);
  for (let i = 0; i < 3; i++) if (have[i] !== base[i]) return have[i] > base[i];
  return m[4] === undefined || Number(m[4]) >= build;
}

// Check everything the dev tool needs, install the browser, and create the demo copy.
async function setup() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 18) throw new Error(`Node 18 or later is needed; this is ${process.version}.`);
  console.log(`ok  Node ${process.version}`);

  const version = t3Version();
  if (!version) throw new Error(T3_MISSING);
  console.log(`ok  t3 ${version}`);
  for (const [feature, since] of FEATURES) {
    const ok = supports(version, since);
    console.log(`${ok ? "ok " : ok === null ? "?  " : "no "} ${feature}`);
  }
  if (supports(version, FEATURES[0][1]) === false)
    throw new Error("This T3 Code can't use theme CSS. Update T3 Code to v0.1.10 or later, then run setup again.");

  const { chromium } = await import("playwright");
  if (!fs.existsSync(chromium.executablePath())) {
    console.log("Installing Playwright's Chromium…");
    execFileSync("npx", ["playwright", "install", "chromium"], { stdio: "inherit" });
  }
  console.log("ok  Playwright Chromium");

  if (isSeeded() && !opts.reseed) {
    console.log(`ok  Demo copy in ${demoDir}`);
  } else {
    console.log(`Creating the demo copy in ${demoDir}.`);
    console.log(`This runs ${SEED_THREADS.length} short agent turns with ${seedProvider} / ${seedModel}, which costs a few cents.`);
    try {
      const server = await demoServer({ reseed: opts.reseed });
      server.stop();
    } catch (err) {
      throw new Error(
        `${err.message}\n\nCreating the demo data failed. If that provider or model isn't set up in your T3, ` +
          "set SEED_PROVIDER to a provider instance id and SEED_MODEL to a model slug you can use, then run setup again.",
      );
    }
    console.log(`ok  Demo copy in ${demoDir}`);
  }
  console.log("\nReady. Try: npm run dev -- shot azeroth");
}

async function serve() {
  const server = await demoServer({ reseed: opts.reseed, keep: true });
  if (theme) applyTheme(theme);
  console.log(`Demo T3 is running with data in ${demoDir}`);
  console.log(`Open this once to sign in: ${server.pairingUrl}`);
  console.log(`Apply a theme with: npm run dev -- shot <theme>, or: t3 theme set --base-dir ${home} <file> --id <id>`);
  console.log("Press Ctrl-C to stop.");
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => (server.stop(), process.exit(0)));
  server.child.on("exit", () => process.exit(0));
}

// Start a server if needed, apply the theme, open the app, run fn, and clean up.
async function withApp(fn) {
  const server = await demoServer({ reseed: opts.reseed });
  let app;
  try {
    applyTheme(theme);
    app = await openApp(server, { viewport, scale });
    await app.page.emulateMedia({ colorScheme: theme.appearance === "light" ? "light" : "dark" });
    await fn(app);
  } catch (err) {
    const failure = path.join(demoDir, "failure.png");
    await app?.page.screenshot({ path: failure }).catch(() => {});
    if (app) console.error(`Page at failure: ${failure}`);
    throw err;
  } finally {
    await app?.browser.close();
    server.stop();
  }
}

async function shot() {
  const names = rest.length ? rest : ["new", "thread", "panels"];
  names.forEach(checkView);
  await withApp(async (app) => {
    for (const name of names) {
      await app.views[name]();
      if (opts.state) {
        await app.fakeState(opts.state);
        await app.page.waitForTimeout(600);
      }
      const file = path.join(outDir, `${name}${opts.state ? `-${opts.state.toLowerCase()}` : ""}.png`);
      await app.shot(file);
      console.log(file);
    }
  });
}

// Send a real turn to a demo thread that isn't the one in the repo screenshots, and take
// screenshots while it works and after it finishes, to catch working states and one-shot
// effects. Costs one short agent turn.
async function turn() {
  await withApp(async (app) => {
    const { page } = app;
    await app.openThread(TEST_THREAD);
    await page.waitForTimeout(1500);
    t3Background(["thread", "send", findThreadId(TEST_THREAD), "Run the shell command `sleep 6`, then reply with just the word: ok"]);
    const working = '[data-timeline-row-kind="working"], [data-timeline-row-kind="work-live"]';
    await page.waitForSelector(working, { timeout: 60_000 });
    const started = Date.now();
    let n = 0;
    const take = async (label) => {
      const file = path.join(outDir, `turn-${String(++n).padStart(2, "0")}-${label}.png`);
      await app.shot(file);
      console.log(file);
    };
    for (const at of [100, 1000, 3000]) {
      await page.waitForTimeout(Math.max(0, at - (Date.now() - started)));
      await take(`working-${at}ms`);
    }
    await page.waitForSelector(working, { state: "detached", timeout: 120_000 });
    const done = Date.now();
    for (const at of [120, 500, 1300, 2600, 4200]) {
      await page.waitForTimeout(Math.max(0, at - (Date.now() - done)));
      await take(`done-${at}ms`);
    }
  });
}

// Run a script in the page and print what it returns. The file is the body of an async
// function, so it can await and should end with `return <value>`.
async function evaluate() {
  const [script, view = "thread"] = rest;
  if (!script) fail("eval needs a script file.");
  checkView(view);
  const body = fs.readFileSync(path.resolve(script), "utf8");
  await withApp(async (app) => {
    await app.views[view]();
    const result = await app.page.evaluate(`(async () => {\n${body}\n})()`);
    console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
  });
}

// Run a Playwright script with the theme applied, for anything the views don't cover:
// hovering for tooltips, scrolling, resizing the sidebar, maximizing a panel. The file's
// default export gets the Playwright page and the dev tool's helpers:
//
//   export default async ({ page, views, shot, fakeState }) => {
//     await views.thread();
//     await page.hover('[data-thread-item]');
//     await shot("row-hover");          // saved as <out>/row-hover.png
//   };
async function runScript() {
  const [script] = rest;
  if (!script) fail("run needs a script file.");
  const { pathToFileURL } = await import("node:url");
  const { default: fn } = await import(pathToFileURL(path.resolve(script)).href);
  if (typeof fn !== "function") fail(`${script} needs a default export that is an async function.`);
  await withApp(async (app) => {
    const shot = async (name) => {
      const file = path.join(outDir, `${name}.png`);
      await app.shot(file);
      console.log(file);
      return file;
    };
    const result = await fn({ page: app.page, views: app.views, fakeState: app.fakeState, shot, outDir, theme });
    if (result !== undefined) console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
  });
}

const commands = { setup, serve, shot, turn, eval: evaluate, run: runScript };
if (!commands[command]) fail(command ? `Unknown command "${command}".` : "Missing a command.");
if (!["setup", "serve"].includes(command) && !theme) fail(`${command} needs a theme id or file.`);
try {
  await commands[command]();
} catch (err) {
  console.error(`\n${err.message}`);
  process.exit(1);
}
