---
name: build-t3-theme
description: Design and build a new T3 Code theme that transforms the whole app (layout, frames, state effects), not just its colors, then ship it into this repo. Use when someone wants a new theme based on a game, film, OS, console or other look, wants to pitch or mock up theme ideas, or wants to rework an existing theme's structure. For installing, switching or small color tweaks, use the t3-themes skill instead.
---

# Build a T3 theme

The themes in this repo don't recolor T3. They turn it into another interface: LCARS has elbow frames that follow the selected task, Workshop tilts the side panes into a 3D room, and Azeroth turns the sidebar into a quest log and shows a "Quest Complete" banner when a turn ends. Aim for that level of change.

This skill is the process that produced those themes, plus the mistakes that cost the most round trips. Read [reference.md](reference.md) before you write any CSS. It lists the selectors, techniques and limits.

The t3-themes skill (`.claude/skills/t3-themes/SKILL.md`) covers the repo layout, the install and pull scripts, and the file format. This skill assumes you know it.

## Rules

- **Transform, don't recolor.** Map every part of T3 onto something from the source look. A palette swap on the stock layout was rejected outright.
- **Invent, don't copy.** Existing themes show how far to go, not what to build. Don't reuse LCARS elbows or Workshop tilts in a new theme. Find the source's own structure.
- **Research the real layout, not just the colors.** Luna XP got the colors right on the first try, but the sidebar still "looked too modern", because the spacing, grouping and row style weren't XP's. Ask for reference images, and calibrate colors from the references' pixels instead of from memory.
- **Mock up only what T3 can do.** Before drawing anything, read the guide (`t3_theme_read`) and [reference.md](reference.md). The first LCARS mockup had to be thrown away because half of it wasn't possible.
- **Prototype first, then wait for a go-ahead.** Don't publish a theme to the user's own T3 while you're still designing it. Their app switches the moment you call `t3_theme_set` or `t3 theme set`. Build in the demo copy (see Step 3).
- **Everything you pitched gets built or called out.** If the mockup shows an effect, the real theme must have it, or you must say up front that it's missing. Azeroth shipped without its pitched level-up effect, and the user had to ask where it was.
- **Original art only.** Draw frames, icons and backgrounds yourself in CSS and SVG. Use no logos, game art, screenshots, textures or licensed fonts. A licensed font can be listed first in the stack in case the user has it installed, but never embed it. Describe the theme generically in its README ("a fantasy MMO game screen"), and avoid trademarked names in ids and titles.
- **Say what you couldn't check.** End every round by saying what you verified, what you couldn't (native browser view, macOS traffic lights, untriggered states), and exactly what the user should look at.
- **Ask before spending or publishing.** Seeding the demo runs real agent turns. Image generators can spend the user's credits. Only commit, push, open a PR or merge when the user asks.

## Step 1: Pitch

1. Read `t3_theme_read` (no arguments) for the guide and the current theme. Skim one or two themes in `themes/` to see how far they go.
2. Ask for reference images if the user hasn't sent any. Ask which era, edition or variant they mean if the source has several.
3. Write a mapping table with columns for T3 part, what it becomes, and how it's built. Cover every part of T3:
   - **Sidebar:** project headers, thread rows (selected, working, needs input, failed, done, settled), drafts, search and footer.
   - **Chat header:** breadcrumb and title.
   - **Conversation:** user messages, assistant messages, work log rows, code blocks and the "working" row.
   - **Composer:** input, placeholder, send, stop, model picker and attachments.
   - **Right panel:** tab bar, browser, diff and files.
   - **Terminal drawer.**
   - **Menus, tooltips, dialogs and settings.**
4. **Pitch state effects. Users love them.** What happens when a thread is working, needs approval, fails, or finishes while you watch? Examples: Azeroth's cast bar, low-health edges and Quest Complete banner; LCARS's red alert blink and sweep; Workshop's arc-reactor counts.
5. Rate every idea **Works**, **Needs a test**, **Decorative only** or **Not possible**, and list the limits plainly. See "Hard limits" in [reference.md](reference.md).
6. Ask the open questions: dark only or both appearances, how much motion, and which variant of the source.

## Step 2: Mockup

1. Build one self-contained HTML page of the whole app in the new look. It must have the sidebar with several thread states, a conversation with both message roles and a work log, the composer, **the right panel open on a browser or diff, and the terminal drawer open**. Omitting the right panel was a past complaint.
2. Use the real T3 structure: the same regions, proportions and kinds of rows. Don't invent T3 features such as progress bars or headline summaries that it doesn't have.
3. Animate the state effects so the user can see them.
4. Check the page yourself with `html_preview` (only you see it), then show it to the user with `html_render`. If you're showing several concepts, build each as a fragment, preview it alone, then join them.
5. Iterate until the user says go. If they say it's "too cartoony", "too glossy" or "doesn't look like my images", go back to the references: crop and zoom them, sample real pixel colors, and match frame colors, bevels, where gold or glow actually appears, and corner shapes.

## Step 3: Build it in the demo copy

Never build against the user's live T3. Use the repo's demo copy instead. It has fake data, lives in its own folder (`~/.t3-themes-demo`) and doesn't touch `~/.t3`.

The repo's Playwright dev tool (`scripts/screenshots/dev.mjs`, run as `npm run dev`) drives the demo copy. It signs in, applies your theme, opens views, fakes states, and saves privacy-checked screenshots. Use it instead of writing your own browser script. The README's "Working on a theme" section has every option. Run all of these from `scripts/screenshots/`.

1. **Set up once.** Run `npm install && npm run setup`.
   - Setup checks Node and the `t3` command and lists which theme features this T3 supports. It installs Playwright's Chromium and creates the demo copy.
   - Creating the demo runs three short agent turns (a few cents), so tell the user before the first run.
   - If `t3` is missing, setup says how to install it from T3's settings. Relay that to the user; don't hunt for the binary yourself.
   - If the default seed model isn't available, ask the user which provider and model to use, then set `SEED_PROVIDER` and `SEED_MODEL`.
   - If their T3 is too old for a feature the theme needs, tell them to update.
2. **Keep the demo running.** Run `npm run demo -- <theme file>` in the background, so later commands reuse its server and the user can open the sign-in link it prints to watch. Redact the token if you log that output.
3. **Spend the character budget on effects, not on tidy code.** Nobody reads a theme's CSS. People only see what it does, so every character should go toward something on screen.
   - Write compact CSS from the start. Use no comments, short custom property names (`--g`, not `--frame-gap`), and no whitespace you don't need.
   - Define each repeated value, color or SVG data URI once in a custom property and reuse it.
   - Put the few values the user is likely to tune at the top as variables, such as a tilt angle or a frame gap, so one change moves one thing.
   - A small build script fills the SVG data URIs into the CSS, adds the `colors` map and writes the theme JSON. It must fail if the CSS contains a backslash.
   - Keep these in a scratch folder, not in the repo, unless the user asks. Put the background image beside the built file as `<name>.jpg` (or `background.jpg` if the file is `theme.json`). The dev tool copies it into the demo.
4. **Look at your own work.**
   - Run `npm run dev -- shot <theme file> [views...]`. This publishes the file to the demo only and saves screenshots to `~/.t3-themes-demo/shots/<id>/`.
   - The views are `new`, `thread`, `panels` (terminal and right panel open), `menu` and `settings`.
   - For anything else, write a small Playwright script and run it with `npm run dev -- run <theme> <script.mjs>`. Examples include hovering for a tooltip, scrolling, resizing the sidebar to ~320px, maximizing the right panel, or measuring boxes. Its default export gets `{ page, views, fakeState, shot }`. Copy `probes/example-run.mjs` to start. Keep these scripts in your scratch folder.
   - Shrink screenshots before reading them, for example with `sips -Z 800` on macOS.
5. **Survey before styling.** Run `npm run dev -- eval <theme> probes/survey.js <view>` in every view. It lists every `data-*` hook with counts and boxes. Use [reference.md](reference.md) for the known hooks, but confirm them, because T3 changes. Write your own probe scripts for measurements (`getBoundingClientRect`, `getComputedStyle`). A probe is the body of an async function that ends with `return`.
6. **Build in passes.** Do structure and frames first, then each region, then the state effects, then motion. Screenshot after every pass and fix what you see before moving on.
7. **Check every state.**
   - Run `npm run dev -- shot <theme> thread --state Approval` (or `Working`, `Input`, `Failed`, `Done`) to see sidebar and page-wide state styles.
   - Run `npm run dev -- turn <theme>` to send one real turn to a spare demo thread. It screenshots the working state and then 0.1 s to 4 s after the turn ends, which catches one-shot effects.
8. **Run the polish checklist** below before showing anything.

## Step 4: Hand it to the user

1. **Gap list.** Compare the build to the approved mockup, item by item, and send the list: built, partly built, not possible. Then do everything still possible. Don't hand over a theme that quietly drops pitched features.
2. **Install it with the user's go-ahead.** Run `./scripts/pull.sh` if the theme came from T3, or copy your build into `themes/<id>/`. Then run `./scripts/install.sh <id>` and `t3_theme_set { "themeId": "<id>" }`. Always give the way back: the previous theme id, or `t3-code` for stock.
3. **Tell them what only the desktop app can show:**
   - the native browser view in the right panel
   - room for the macOS traffic lights
   - their own sidebar width and row style (these come from their client settings)
   - any state you couldn't trigger

## Step 5: Polish from real use

The user tests in the desktop app and reports one issue at a time, often as a screenshot with a few words or none. For each report:

1. **Read the screenshot closely.** Crop and zoom the area in question. If you're unsure which spot they mean, ask. Fixing the wrong "corner" cost a full round once.
2. **Reproduce the exact state** in the demo before claiming a fix: the same view, scroll position, panel layout, row variant and composer state. A `run` script gets you there and keeps the repro for the next round. A scrollbar fix was "done" twice because the demo was scrolled differently.
3. **Fix the whole family, not one instance.** If the stop button is unreadable, check both stop states, send, disabled submit and every other button on an accent fill.
4. **Reinstall and reselect after every fix** (`./scripts/install.sh <id>`, then `t3_theme_set`), then tell them exactly what to look at.
5. **For design choices, show two or three options and recommend one.** For status colors, elbow shapes and similar, the user likes A/B screenshots. Let them pick.

## Step 6: Ship it to the repo

1. Run `./scripts/check.py`. If `css` is over 50,000 characters, the theme needs T3 Code nightly 20261117.4825 or later. Try to get under 50,000 first (see "Size" in [reference.md](reference.md)); if you can't, say which version it needs at the top of its README.
2. Run `cd scripts/screenshots && npm run shoot -- <id>`. Look at all three screenshots before committing.
3. Write `themes/<id>/README.md`, following `themes/azeroth/README.md`:
   - the description and id
   - the appearance
   - screenshots
   - a "What changes with a thread's state" section
   - the copyable agent prompt and `curl` commands (include the background image if there is one)
   - notes on art, fonts and reduced motion
4. In the root `README.md`, add a row to the theme table and a column to the screenshot table.
5. Before anything goes public, grep the theme files for the user's username and home path.
6. Commit, push and open a PR only when asked. Use a branch for each theme or follow-up.

## Polish checklist

These came up in more than one theme. Check every one in the demo before handing a theme over.

- [ ] **macOS traffic lights.** The top ~40px of the window belongs to them in the desktop app. Start the sidebar frame below that, and line up the tops of the sidebar, conversation and right panel. The web demo has no traffic lights, so check the spacing by measuring.
- [ ] **Right panel browser.** It's a native view placed over `[data-browser-surface-slot]`. Don't transform it, put a margin on the panel, or cover the panel's resize separator (`[data-workspace-area="panel"]>[role="separator"]`). Flatten any tilt while a browser tab is open.
- [ ] **Readable text everywhere.** Check secondary text (branch, machine name, timestamps) against the theme's backgrounds. Recolor subtrees through the `--contrast-*` variables (see reference.md).
- [ ] **Buttons on accent fills.** Check the send button, both stop states, disabled submit on question prompts, and the panel toggles. The icon ink must contrast with the fill.
- [ ] **Message styles scoped by role.** Styling for assistant text must not hit user messages (Azeroth's user text once went invisible).
- [ ] **Every sidebar row variant.** Check the card, folder (the "boring sidebar" setting), slim settled rows, drafts, project folder headers, search, and pinned, working and settled headers. Test at the default width (256px) and around 320px.
- [ ] **New-thread screen.** Its breadcrumb ends in an `h2`, not a button. Its loading layer (`[data-timeline-loading]`) is opaque.
- [ ] **Maximized right panel, terminal drawer open, details card docked, settings page, menus, tooltips and dialogs.**
- [ ] **Scrollbars.** Make sure they don't cut through frames. Shorten the track with `::-webkit-scrollbar-track` margins.
- [ ] **Background showing through.** If there's a background image, find and clear every opaque layer above it.
- [ ] **Hover and selected states.** Each should change the whole shape it belongs to, connectors included.
- [ ] **Code stays monospace.** Check `code, pre, kbd, [data-language], [data-inline-code], .xterm`.
- [ ] **Reduced motion.** Put every animation behind `@media (prefers-reduced-motion: no-preference)` or turn it off under `reduce`.
- [ ] **No custom cursor.** Azeroth's cursor was removed as annoying.
- [ ] **Size and safety.** `./scripts/check.py` passes. No backslash in `css`. Aim for under 50,000 characters so the theme works on stable T3. Measure before and after minifying.

## Talking to the user

- Lead with what changed and what to look at. Keep progress notes to one line.
- When something isn't possible, say so and offer the nearest thing that is.
- When the user asks "is it faithful?", don't just change things. Explain what matches the source and what reads as modern, list the changes you'd make, and ask which ones they want.
- Use the user's own assets as given. Don't re-cut or re-synthesize what they hand you.
- Long sessions get compacted. Keep the CSS, build script and a backup of the last good `theme.json` in files, not only in the conversation.
