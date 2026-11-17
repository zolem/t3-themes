// Shared code for the demo copy of T3 Code that shoot.mjs and dev.mjs use.
//
// The demo copy keeps all its data in ~/.t3-themes-demo (override with T3_THEMES_DEMO_DIR),
// never in ~/.t3, and it stays there between runs. The first run seeds a fake project and a
// few threads by running real agent turns (a small model by default; override with
// SEED_PROVIDER and SEED_MODEL). Later runs reuse that data.
//
// Keeping private details out:
// - The demo server sees "Demo Mac" as this machine's name, and its terminals load a demo
//   zsh config with a neutral prompt instead of your ~/.zshrc.
// - Before saving a screenshot, the page is scrubbed of this machine's name, your username
//   and your home folder, then checked for them again. If any is still visible, or the
//   terminal didn't load the demo shell config, the screenshot is not saved.

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repo = path.resolve(here, "../..");
export const demoDir = process.env.T3_THEMES_DEMO_DIR ?? path.join(os.homedir(), ".t3-themes-demo");
export const home = path.join(demoDir, "home");
export const themesDir = path.join(home, "userdata", "themes");
const project = path.join(demoDir, "acme-weather");
const zdotdir = path.join(demoDir, "zsh");
const fakeBin = path.join(demoDir, "bin");
const shellMarker = path.join(zdotdir, "loaded");
const serverFile = path.join(demoDir, "server.json");
export const seedProvider = process.env.SEED_PROVIDER ?? "claudeAgent";
export const seedModel = process.env.SEED_MODEL ?? "claude-haiku-5-5";
const t3Bin = process.env.T3_BIN ?? "t3";
export const VIEWPORT = { width: 1600, height: 1000 };
const IMAGE_EXTS = ["jpg", "png", "webp"];

// Threads to seed, oldest first. The first one is the thread shown in screenshots. The last
// one is where dev.mjs sends test turns, so the shown thread never changes.
export const SEED_THREADS = [
  {
    title: "Add Celsius toggle",
    message:
      "Add a showCelsius option to describe() in src/forecast.ts so it can print temperatures in Celsius instead of Fahrenheit. Keep Fahrenheit as the default. Then show me a short usage example in a code block. Keep it short.",
  },
  {
    title: "Write tests for toFahrenheit",
    message:
      "Add src/forecast.test.ts with three vitest tests for toFahrenheit: freezing, boiling and a negative value. Don't run them. Reply in two sentences.",
  },
  {
    title: "Explain the forecast module",
    message: "In a few bullet points, explain what src/forecast.ts does. Don't change any files.",
  },
];
export const SHOWN_THREAD = SEED_THREADS[0].title;
export const TEST_THREAD = SEED_THREADS[2].title;

const env = {
  ...process.env,
  T3CODE_HOME: home,
  PATH: `${fakeBin}:${process.env.PATH}`,
  SHELL: "/bin/zsh",
  ZDOTDIR: zdotdir,
};

// Run the t3 CLI against the demo copy. It runs from the demo project so a git worktree
// around the caller can't redirect it to another data folder.
export const t3 = (cmdArgs, opts = {}) =>
  execFileSync(t3Bin, cmdArgs, {
    env,
    cwd: fs.existsSync(project) ? project : os.tmpdir(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });

// The t3 command's version, such as "0.1.11-nightly.20261117.4838", or null if it isn't installed.
export function t3Version() {
  try {
    return execFileSync(t3Bin, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .trim()
      .replace(/^t3\s+v?/, "");
  } catch {
    return null;
  }
}

export const T3_MISSING =
  "The t3 command isn't installed. In T3 Code's desktop app, open Settings, find the row that says " +
  "\"Run T3 Code's CLI as `t3` from any terminal\" (search settings for \"CLI\"), click Install, then open a new terminal. " +
  "If t3 is installed somewhere else, set T3_BIN to its path.";

// --- private values that must never show up in a screenshot ------------------
function privateValues() {
  const values = new Set([os.userInfo().username, os.homedir(), os.hostname().replace(/\.local$/, "")]);
  try {
    values.add(execFileSync("/usr/sbin/scutil", ["--get", "ComputerName"], { encoding: "utf8" }).trim());
  } catch {}
  return [...values].filter((v) => v && v.length >= 3);
}
export const secrets = privateValues();

// --- demo environment ----------------------------------------------------------
export const isSeeded = () => fs.existsSync(path.join(demoDir, "seeded"));

function freshDemo() {
  fs.rmSync(demoDir, { recursive: true, force: true });
  fs.mkdirSync(home, { recursive: true });
  fs.cpSync(path.join(here, "demo-project"), project, { recursive: true });
  const git = (...a) =>
    execFileSync("git", ["-c", "user.name=Demo", "-c", "user.email=demo@example.com", ...a], { cwd: project });
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-qm", "Initial commit");
}

// Rewritten on every start, so changes here apply to an existing demo copy too.
function writeShellAndBin() {
  fs.mkdirSync(zdotdir, { recursive: true });
  fs.mkdirSync(fakeBin, { recursive: true });
  // T3 rebuilds PATH from a login shell, and macOS's /etc/zprofile puts system folders first,
  // so put the fake scutil back in front after it runs.
  const pathLine = `export PATH="${fakeBin}:$PATH"\n`;
  fs.writeFileSync(path.join(zdotdir, ".zshenv"), `export HISTFILE="${zdotdir}/.zsh_history"\n` + pathLine);
  fs.writeFileSync(path.join(zdotdir, ".zprofile"), pathLine);
  fs.writeFileSync(
    path.join(zdotdir, ".zshrc"),
    [
      "# Demo shell for T3 theme screenshots. Your own ~/.zshrc is not loaded.",
      "PROMPT='demo@acme-weather %1~ %# '",
      "RPROMPT=''",
      `export PATH="${fakeBin}:$PATH"`,
      `touch "${shellMarker}"`,
      "",
    ].join("\n"),
  );
  // T3 reads the machine name with scutil; answer "Demo Mac" and pass everything else through.
  const scutil = path.join(fakeBin, "scutil");
  fs.writeFileSync(
    scutil,
    [
      "#!/bin/sh",
      'case "$1 $2" in',
      '  "--get ComputerName"|"--get LocalHostName") echo "Demo Mac" ;;',
      '  *) exec /usr/sbin/scutil "$@" ;;',
      "esac",
      "",
    ].join("\n"),
  );
  fs.chmodSync(scutil, 0o755);
  fs.rmSync(shellMarker, { force: true });
}

function seed() {
  console.log("Seeding demo threads (runs real agent turns with %s / %s)…", seedProvider, seedModel);
  t3(["project", "add", "--title", "acme-weather", project]);
  for (const t of [...SEED_THREADS].reverse()) {
    console.log(`  thread: ${t.title}`);
    t3(["thread", "start", "--wait", "--title", t.title, "--provider", seedProvider, "--model", seedModel, ".", t.message], {
      timeout: 300_000,
    });
  }
  fs.writeFileSync(path.join(demoDir, "seeded"), new Date().toISOString());
}

// --- server ------------------------------------------------------------------
function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function startServer() {
  const port = await freePort();
  const child = spawn(t3Bin, ["serve", "--port", String(port), "--host", "127.0.0.1", project], {
    env,
    cwd: project,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  const pairingUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`T3 server didn't start:\n${log}`)), 60_000);
    const onData = (d) => {
      log += d;
      const m = log.match(/Pairing URL: (\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => reject(new Error(`T3 server exited (${code}):\n${log}`)));
  });
  return { child, base: `http://127.0.0.1:${port}`, pairingUrl };
}

// Run the t3 CLI in the background against the demo copy.
export const t3Background = (cmdArgs) => {
  const child = spawn(t3Bin, cmdArgs, { env, cwd: fs.existsSync(project) ? project : os.tmpdir(), stdio: "ignore" });
  child.on("error", () => {});
  return child;
};

// The server started by `npm run demo`, if it's still running.
async function runningServer() {
  let info;
  try {
    info = JSON.parse(fs.readFileSync(serverFile, "utf8"));
    process.kill(info.pid, 0);
    await fetch(info.base, { signal: AbortSignal.timeout(3000) });
  } catch {
    return null;
  }
  const out = t3(["pair", "--base-dir", home, "--ttl", "5m", "--label", "theme-dev"]);
  const m = out.match(/Pairing URL: (\S+)/);
  return m ? { base: info.base, pairingUrl: m[1] } : null;
}

// Get a demo server: the one `npm run demo` is running, or a new one that stop() shuts down.
// With keep, the new server is recorded so later commands reuse it.
export async function demoServer({ reseed = false, keep = false } = {}) {
  if (!t3Version()) throw new Error(T3_MISSING);
  const running = await runningServer();
  if (running && (keep || reseed))
    throw new Error(`The demo copy is already running at ${running.base}. Stop it first (Ctrl-C where npm run demo runs).`);
  if (running) return { ...running, stop: () => {} };
  if (reseed || !isSeeded()) freshDemo();
  writeShellAndBin();
  const server = await startServer();
  const stop = () => {
    server.child.kill();
    if (keep) fs.rmSync(serverFile, { force: true });
  };
  try {
    if (!isSeeded()) seed();
  } catch (err) {
    stop();
    throw err;
  }
  if (keep) fs.writeFileSync(serverFile, JSON.stringify({ pid: server.child.pid, base: server.base }));
  return { child: server.child, base: server.base, pairingUrl: server.pairingUrl, stop };
}

// --- themes ------------------------------------------------------------------
// A theme argument is a repo theme id (`azeroth`) or a path to a theme JSON file anywhere.
// A background image sits beside the file as background.<ext> (repo layout) or <name>.<ext>.
export function resolveTheme(arg, idOverride) {
  const byId = path.join(repo, "themes", arg, "theme.json");
  const file = fs.existsSync(byId) ? byId : path.resolve(arg);
  if (!fs.existsSync(file)) throw new Error(`No theme named ${arg} in themes/, and no file at ${file}`);
  const dir = path.dirname(file);
  const base = path.basename(file, ".json");
  const id = idOverride ?? (base === "theme" ? path.basename(dir) : base);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`"${id}" isn't a valid theme id; pass --id my-theme`);
  const { appearance } = JSON.parse(fs.readFileSync(file, "utf8"));
  let background = null;
  for (const name of ["background", base])
    for (const ext of IMAGE_EXTS) {
      const p = path.join(dir, `${name}.${ext}`);
      if (!background && fs.existsSync(p)) background = { path: p, ext };
    }
  return { id, file, appearance, background };
}

// Publish a theme to the demo copy and switch it on. Its background image goes beside it,
// and a stale one from an earlier version is removed.
export function applyTheme(theme) {
  fs.mkdirSync(themesDir, { recursive: true });
  for (const ext of IMAGE_EXTS) fs.rmSync(path.join(themesDir, `${theme.id}.${ext}`), { force: true });
  if (theme.background) fs.copyFileSync(theme.background.path, path.join(themesDir, `${theme.id}.${theme.background.ext}`));
  t3(["theme", "set", theme.file, "--id", theme.id]);
}

// --- page scrubbing ----------------------------------------------------------
// Runs in the page: replace private values in text and attributes, now and as the page changes.
function scrubInPage(values) {
  const replacement = (v) => (v.startsWith("/") ? "/Users/demo" : v.includes(" ") ? "Demo Mac" : "demo");
  const pairs = values.sort((a, b) => b.length - a.length).map((v) => [v, replacement(v)]);
  const fix = (s) => pairs.reduce((acc, [v, r]) => acc.split(v).join(r), s);
  const visit = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const next = fix(n.nodeValue);
      if (next !== n.nodeValue) n.nodeValue = next;
    }
    const els = root.querySelectorAll ? root.querySelectorAll("[title],[aria-label],[placeholder],[alt]") : [];
    for (const el of els)
      for (const a of ["title", "aria-label", "placeholder", "alt"]) {
        const v = el.getAttribute(a);
        if (v && fix(v) !== v) el.setAttribute(a, fix(v));
      }
  };
  const start = () => {
    visit(document.body);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "characterData") visit(m.target.parentNode ?? document.body);
        for (const n of m.addedNodes) visit(n.nodeType === 3 ? n.parentNode : n);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
}

export async function assertClean(page) {
  const text = await page.evaluate(() => {
    const attrs = [...document.querySelectorAll("[title],[aria-label],[placeholder],[alt]")].flatMap((el) =>
      ["title", "aria-label", "placeholder", "alt"].map((a) => el.getAttribute(a) ?? ""),
    );
    return [document.body.innerText, document.title, ...attrs].join("\n");
  });
  const leaks = secrets.filter((s) => text.includes(s));
  if (leaks.length) throw new Error(`Private value still on the page (${leaks.length} found); not saving screenshot.`);
}

// The terminal is drawn on a canvas, so the text check above can't see it. Instead, make
// sure its shell loaded the demo config (neutral prompt), not the user's own.
async function assertDemoShell() {
  for (let i = 0; i < 50 && !fs.existsSync(shellMarker); i++) await new Promise((r) => setTimeout(r, 200));
  if (!fs.existsSync(shellMarker))
    throw new Error("The terminal didn't load the demo shell config, so it may show your real prompt. Not saving.");
}

// --- thread lookup -----------------------------------------------------------
function environmentId() {
  return fs.readFileSync(path.join(home, "userdata", "environment-id"), "utf8").trim();
}

export function findThreadId(title) {
  const out = t3(["thread", "list", "--project", project, "--json"]);
  const found = [];
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") {
      if (o.title === title && typeof o.threadId === "string") found.push(o.threadId);
      Object.values(o).forEach(walk);
    }
  };
  walk(JSON.parse(out));
  if (!found.length) throw new Error(`No demo thread titled "${title}". Try --reseed.`);
  return found[0];
}

// --- browser -------------------------------------------------------------------
// Sign a headless browser in to the demo server. Returns the page and helpers for views.
export async function openApp(server, { viewport = VIEWPORT, scale = 2 } = {}) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale });
  await context.addInitScript(scrubInPage, secrets);
  const page = await context.newPage();
  await page.goto(server.pairingUrl);
  await page.waitForURL((u) => !u.pathname.startsWith("/pair"), { timeout: 30_000 });
  const startUrl = page.url();
  const threadUrl = (title) => `${server.base}/${environmentId()}/${encodeURIComponent(findThreadId(title))}`;
  const toggle = (name) => page.getByRole("button", { name, exact: true });
  const isOn = async (name) => (await toggle(name).getAttribute("aria-pressed")) === "true";
  const setPanel = async (name, on) => {
    if ((await isOn(name)) !== on) await toggle(name).click();
  };
  const settle = (ms = 2500) => page.waitForTimeout(ms);

  // Open a thread by URL, since T3 may have moved it into the sidebar's collapsed "Settled"
  // group, and un-settle it so it sits in the main list.
  const openThread = async (title = SHOWN_THREAD) => {
    await page.goto(threadUrl(title));
    await page.waitForSelector('[data-message-role="assistant"]', { timeout: 30_000 });
    const unsettle = page.getByText("Un-settle", { exact: true });
    if (await unsettle.isVisible().catch(() => false)) {
      await unsettle.click();
      await page.waitForTimeout(1000);
    }
  };

  // Each view leaves the page ready to screenshot. Views that open panels close them again
  // at the start of the next view.
  const views = {
    // The new-thread screen.
    async new() {
      await page.goto(startUrl);
      await page.waitForSelector("[data-thread-item]", { timeout: 30_000 });
      await settle();
    },
    // A thread with an agent reply, edits, a code block and the details panel.
    async thread() {
      await openThread();
      await setPanel("Toggle thread details panel", true);
      await setPanel("Toggle terminal drawer", false);
      await setPanel("Toggle right panel", false);
      await settle();
    },
    // The same thread with every panel open: sidebar, terminal drawer and right panel (T3
    // hides the details card while the right panel is open). In the right panel, open the
    // diff, then the changed file, which also shows the file tree.
    async panels() {
      await views.thread();
      await setPanel("Toggle terminal drawer", true);
      await setPanel("Toggle right panel", true);
      const diff = page.getByText("Diff", { exact: true });
      if (await diff.isVisible().catch(() => false)) await diff.click();
      await page.getByText("src/forecast.ts", { exact: true }).last().click({ timeout: 10_000 }).catch(() => {});
      await assertDemoShell();
      await page.locator("[data-thread-terminal-drawer]").click();
      await page.keyboard.type("clear && git status --short\n");
      await settle(3000);
    },
    // The thread with the model picker menu open.
    async menu() {
      await views.thread();
      await page.locator("[data-chat-provider-model-picker] button, button[data-chat-provider-model-picker]").first().click();
      await page.waitForSelector('[data-slot="menu-popup"], [data-slot="popover-popup"]', { timeout: 10_000 });
      await settle(800);
    },
    // The settings page.
    async settings() {
      await page.goto(`${server.base}/settings`);
      await page.waitForSelector("[data-settings-page-scroll]", { timeout: 30_000 });
      await settle();
    },
  };

  // Pretend the shown thread's sidebar row is in a state, such as "Approval" or "Failed".
  // T3 only exposes a row's status as a word in an aria-label, so add it there. T3 may
  // re-render the row later and drop it, so screenshot right away.
  const fakeState = (state, title = SHOWN_THREAD) =>
    page.evaluate(
      ({ state, title }) => {
        const row = [...document.querySelectorAll("[data-thread-item]")].find((el) => el.textContent.includes(title));
        const target = row?.querySelector("[aria-label]") ?? row;
        if (!target) throw new Error(`No sidebar row for "${title}"`);
        const label = (target.getAttribute("aria-label") ?? title).replace(/, (Working|Connecting|Waiting|Approval|Input|Request|Limited|Failed|Woke|Done|Completed)\b/g, "");
        target.setAttribute("aria-label", label.includes(title) ? label.replace(title, `${title}, ${state}`) : `${label}, ${state}`);
      },
      { state, title },
    );

  // Screenshot after checking the page for private values.
  const shot = async (file) => {
    await assertClean(page);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file });
  };

  return { browser, page, views, openThread, fakeState, shot, threadUrl };
}
