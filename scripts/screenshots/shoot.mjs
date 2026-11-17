// Screenshot themes in a separate demo copy of T3 Code filled with fake data.
//
//   npm run shoot                      every theme
//   npm run shoot -- workshop lcars    some themes
//   npm run shoot -- --reseed          rebuild the demo data first
//   npm run demo                       start the demo copy and print a link to open it yourself
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
const repo = path.resolve(here, "../..");
const demoDir = process.env.T3_THEMES_DEMO_DIR ?? path.join(os.homedir(), ".t3-themes-demo");
const home = path.join(demoDir, "home");
const project = path.join(demoDir, "acme-weather");
const zdotdir = path.join(demoDir, "zsh");
const fakeBin = path.join(demoDir, "bin");
const shellMarker = path.join(zdotdir, "loaded");
const seedProvider = process.env.SEED_PROVIDER ?? "claudeAgent";
const seedModel = process.env.SEED_MODEL ?? "claude-haiku-5-5";
const t3 = process.env.T3_BIN ?? "t3";
const VIEWPORT = { width: 1600, height: 1000 };

// Threads to seed, oldest first. The first one is the thread shown in screenshots.
const SEED_THREADS = [
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
const SHOWN_THREAD = SEED_THREADS[0].title;

const args = process.argv.slice(2);
const serveOnly = args.includes("--serve");
const reseed = args.includes("--reseed");
const themeIds = args.filter((a) => !a.startsWith("--"));
const allThemes = fs
  .readdirSync(path.join(repo, "themes"))
  .filter((id) => fs.existsSync(path.join(repo, "themes", id, "theme.json")));
const ids = themeIds.length ? themeIds : allThemes;
for (const id of ids) if (!allThemes.includes(id)) throw new Error(`No theme named ${id} in themes/`);

const env = {
  ...process.env,
  T3CODE_HOME: home,
  PATH: `${fakeBin}:${process.env.PATH}`,
  SHELL: "/bin/zsh",
  ZDOTDIR: zdotdir,
};
const run = (cmdArgs, opts = {}) =>
  execFileSync(t3, cmdArgs, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });

// --- private values that must never show up in a screenshot ------------------
function privateValues() {
  const values = new Set([os.userInfo().username, os.homedir(), os.hostname().replace(/\.local$/, "")]);
  try {
    values.add(execFileSync("/usr/sbin/scutil", ["--get", "ComputerName"], { encoding: "utf8" }).trim());
  } catch {}
  return [...values].filter((v) => v && v.length >= 3);
}
const secrets = privateValues();

// --- demo environment ----------------------------------------------------------
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
  run(["project", "add", "--title", "acme-weather", project]);
  for (const t of [...SEED_THREADS].reverse()) {
    console.log(`  thread: ${t.title}`);
    run(
      ["thread", "start", "--wait", "--title", t.title, "--provider", seedProvider, "--model", seedModel, ".", t.message],
      { cwd: project, timeout: 300_000 },
    );
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
  const child = spawn(t3, ["serve", "--port", String(port), "--host", "127.0.0.1", project], {
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

async function assertClean(page) {
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

function findThreadId(title) {
  const out = run(["thread", "list", "--project", project, "--json"]);
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

// --- main --------------------------------------------------------------------
if (reseed || !fs.existsSync(path.join(demoDir, "seeded"))) freshDemo();
writeShellAndBin();
const server = await startServer();
const stop = () => server.child.kill();

if (serveOnly) {
  try {
    if (!fs.existsSync(path.join(demoDir, "seeded"))) seed();
  } catch (err) {
    stop();
    throw err;
  }
  console.log(`Demo T3 is running with data in ${demoDir}`);
  console.log(`Open this once to sign in: ${server.pairingUrl}`);
  console.log(`Switch themes with: T3CODE_HOME=${home} t3 theme set <repo>/themes/<id>/theme.json --id <id>`);
  console.log("Press Ctrl-C to stop.");
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => (stop(), process.exit(0)));
  server.child.on("exit", () => process.exit(0));
} else {
  const { chromium } = await import("playwright");
  let browser;
  let page;
  try {
    if (!fs.existsSync(path.join(demoDir, "seeded"))) seed();

    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    await context.addInitScript(scrubInPage, secrets);
    page = await context.newPage();
    await page.goto(server.pairingUrl);
    await page.waitForURL((u) => !u.pathname.startsWith("/pair"), { timeout: 30_000 });
    const startUrl = page.url();
    const threadUrl = `${server.base}/${environmentId()}/${encodeURIComponent(findThreadId(SHOWN_THREAD))}`;
    const toggle = (name) => page.getByRole("button", { name, exact: true });
    const isOn = async (name) => (await toggle(name).getAttribute("aria-pressed")) === "true";
    const setPanel = async (name, on) => {
      if ((await isOn(name)) !== on) await toggle(name).click();
    };

    for (const id of ids) {
      const themePath = path.join(repo, "themes", id, "theme.json");
      const { appearance } = JSON.parse(fs.readFileSync(themePath, "utf8"));
      run(["theme", "set", themePath, "--id", id]);
      await page.emulateMedia({ colorScheme: appearance === "light" ? "light" : "dark" });
      const outDir = path.join(repo, "themes", id, "screenshots");
      fs.mkdirSync(outDir, { recursive: true });

      // 1. New thread screen.
      await page.goto(startUrl);
      await page.waitForSelector("[data-thread-item]", { timeout: 30_000 });
      await page.waitForTimeout(2500);
      await assertClean(page);
      await page.screenshot({ path: path.join(outDir, "new-thread.png") });

      // 2. A thread with an agent reply, edits and a code block. Open it by URL, since T3
      //    may have moved it into the sidebar's collapsed "Settled" group.
      await page.goto(threadUrl);
      await page.waitForSelector('[data-message-role="assistant"]', { timeout: 30_000 });
      // T3 can settle a finished thread on its own; un-settle it so it sits in the main list.
      const unsettle = page.getByText("Un-settle", { exact: true });
      if (await unsettle.isVisible().catch(() => false)) {
        await unsettle.click();
        await page.waitForTimeout(1000);
      }
      await setPanel("Toggle thread details panel", true);
      await setPanel("Toggle terminal drawer", false);
      await setPanel("Toggle right panel", false);
      await page.waitForTimeout(2500);
      await assertClean(page);
      await page.screenshot({ path: path.join(outDir, "thread.png") });

      // 3. The same thread with every panel open: sidebar, terminal drawer and right panel
      //    (T3 hides the details card while the right panel is open). In the right panel,
      //    open the diff, then the changed file, which also shows the file tree.
      await setPanel("Toggle terminal drawer", true);
      await setPanel("Toggle right panel", true);
      const diff = page.getByText("Diff", { exact: true });
      if (await diff.isVisible().catch(() => false)) await diff.click();
      await page.getByText("src/forecast.ts", { exact: true }).last().click({ timeout: 10_000 }).catch(() => {});
      await assertDemoShell();
      const terminal = page.locator("[data-thread-terminal-drawer]");
      await terminal.click();
      await page.keyboard.type("clear && git status --short\n");
      await page.waitForTimeout(3000);
      await assertClean(page);
      await page.screenshot({ path: path.join(outDir, "panels.png") });
      await setPanel("Toggle terminal drawer", false);
      await setPanel("Toggle right panel", false);

      console.log(`${id}: saved new-thread.png, thread.png and panels.png`);
    }
  } catch (err) {
    // Save what the page looked like for debugging. It stays in the demo folder, outside the repo.
    await page?.screenshot({ path: path.join(demoDir, "failure.png") }).catch(() => {});
    if (page) console.error(`Page at failure: ${path.join(demoDir, "failure.png")}`);
    throw err;
  } finally {
    await browser?.close();
    stop();
  }
}
