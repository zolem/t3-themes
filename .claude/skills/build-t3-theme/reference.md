# T3 theme CSS reference

These are the hooks, techniques and limits found while building LCARS, Workshop, Luna XP and Azeroth. T3 changes between releases, so check every hook against a DOM survey of the current build before relying on it. When this file and `t3_theme_read` disagree, the guide wins.

## Hard limits

- **No backslashes.** T3 drops any CSS rule that contains a backslash. That includes `\A`, `\00a0` and `\201C` in `content:`. It cost Workshop five screenshot round trips, because the rule disappears silently.
  - Type the raw character instead, such as a real non-breaking space.
  - For line breaks, give the element a fixed narrow width and let the text wrap.
  - JSON escapes in `theme.json` are fine. What matters is the CSS after JSON decoding.
  - If you retype CSS into a tool call, raw non-breaking spaces can turn into plain spaces. Diff against your source file afterwards.
- **No file loading.** You can't use `@import` or `image-set()`, and `url()` takes only `data:` or `#id`. `local()` fonts are allowed.
- **Size.** `css` holds up to 100,000 characters on T3 Code nightly 20261117.4825 or later, and 50,000 on v0.1.10 and older nightlies. Aim for 50,000 so the theme works on stable T3, and if it needs more, say which version it needs in its README. `./scripts/check.py` warns about this.
  - Ways to save space: write no comments, use short custom property names, define each shared data URI once in a custom property, and drop `!important` where the rule already wins. LCARS went from 43k to 24k by dropping an embedded font for a `local()` alias.
  - Don't inline images. A background goes in its own file, `<id>.jpg`, `.png` or `.webp` (up to 16 MB), and you show it with `var(--theme-background-image)`.
  - Small SVG data URIs for frames, icons and grain are fine. Define each one once in a custom property and reuse it.
- **Unreachable parts.** CSS can't reach terminal text, the file tree or diff internals, so use the color roles for those. You can't style scrollbars inside pages shown in the browser tab.
- **Native browser view.** The right panel's browser is a native view drawn over the box of `[data-browser-surface-slot]`. CSS can't transform, clip, overlay or move it. Anything that shifts that box (margins, transforms on ancestors) makes the browser misalign or cover other controls.
- **No live data.** CSS can't show the time, a username or anything else not already in the DOM. A clock is decoration (Luna XP's says "12:00 PM").
- **Desktop and web only.** The mobile app doesn't use themes.

## Selectors

### Stable (listed in the guide)

`[data-slot="sidebar"]`, `[data-slot="sidebar-inner"]`, `[data-thread-item]`, `[data-slot="project-monogram"]`, `[data-chat-header]`, `[data-workspace-area="conversation"]`, `.messages-timeline-scroll`, `[data-timeline-row-kind]`, `[data-message-role="user"|"assistant"]`, `[data-user-message-bubble]`, `.chat-markdown`, `.chat-markdown-codeblock`, `[data-chat-composer-form]`, `[data-slot="composer-host"]`, `.composer-tiptap`, `[data-thread-details-card]`, `[data-thread-terminal-drawer]`, `[data-settings-page-scroll]`, and the `data-slot` values `button`, `input`, `switch`, `select-trigger`, `dialog-popup`, `popover-popup`, `menu-popup`, `tooltip-popup`, `scroll-area-scrollbar` and `scroll-area-thumb`. Icons are `svg.lucide`.

### Found by survey

These aren't promised to stay, but the shipped themes depend on them. Prefer `data-*` attributes, `data-testid`, `aria-*` and roles, and never use Tailwind class names.

| Area | Hooks |
| --- | --- |
| Layout | `[data-slot="sidebar-container"\|"sidebar-wrapper"\|"sidebar-inset"\|"sidebar-content"]`, `[data-workspace-area="conversation"\|"composer"\|"panel"]`, `[data-chat-column]`, `[data-chat-canvas]`, `[data-chat-column-maximized-away="true"]`, `[data-timeline-loading]` |
| Sidebar rows | `[data-sidebar-row]` (selected: `[aria-current="page"]`); `data-testid` values `sidebar-row-card`, `sidebar-row-folder`, `sidebar-row-slim`, `sidebar-draft-row`, `sidebar-project-folder`, `sidebar-working-header`, `sidebar-settled-header`, `sidebar-pinned-header`, `sidebar-pinned-divider`; `[data-sidebar-parent="shelf:settled"]`, `[data-sidebar-parent^="shelf:working"]` |
| Header | `nav[aria-label="Thread breadcrumb"]`, its `li`, `li>button` and `li[aria-current="page"] h2` (on the new-thread screen the last item is an `h2`, not a button); `[data-slot="workspace-breadcrumb-text"]`, `[data-panel-layout-controls] [data-slot="toggle"][data-pressed]`, `[data-workspace-titlebar-controls]` |
| Conversation | `[data-timeline-row-kind="message"\|"work"\|"work-live"\|"working"\|"work-toggle"\|"turn-fold"]`, `[data-thread-find-text]` (the actual assistant text), `[data-user-message-body]`, `[data-changed-files-state]`, `[data-changed-file-row]`, `code[data-inline-code]`, `[data-language]`, `[data-v2-item-type="approval_request"]`, `[data-testid="timeline-minimap"]`, `[data-assistant-citation-viewport]` |
| Composer | `[data-chat-composer-stack]`, `[data-chat-composer-surface]`, `[data-chat-composer-main-surface]`, `[data-chat-composer-body]`, `[data-chat-composer-actions]`, `[data-chat-composer-footer]`, `[data-chat-provider-model-picker]`, `[data-placeholder]` (T3 draws its own placeholder over the editor), `[data-testid="composer-editor"]`, `button[type="submit"]`, `button[aria-label="Submit message"]`, `button[aria-label="Stop generation"\|"Stopping"]` |
| Right panel | `[data-right-panel-tabbar]`, `[data-right-panel-tab-list] [data-active-tab="true"]`, `[data-right-panel-surface-content]`, `[data-right-panel-toggle]`, `[data-browser-surface-slot]`, `[data-browser-device-toolbar]`, `[data-preview-panel-maximized]`, the resize handle `[data-workspace-area="panel"]>[role="separator"]` |
| Inputs and menus | `[data-slot="input-control"]`, `[data-slot="menu-item"\|"select-item"][data-highlighted]`, `[cmdk-item][data-selected="true"]`, `[data-checked]` |

### Thread state

Each row exposes its status only as a word in its `aria-label`, after a comma: `[data-thread-item]:has([aria-label*=", Working"])`. Keep the comma and space, or the selector matches thread titles too.

| State | Words |
| --- | --- |
| Working | `Working`, `Connecting` |
| Needs you | `Approval`, `Input`, `Request`, `Waiting` |
| Failed | `Failed`, `Limited` |
| Finished | `Done`, `Completed`, `Woke` |

- Status is only live for rows near the viewport.
- T3 shows "Done" mainly for threads that finish while you're looking at another one.
- In the open thread, the agent is working when the conversation has a `[data-timeline-row-kind="working"]` or `"work-live"` row. Drive page-wide effects from it: `:root:has([data-chat-canvas] :is([data-timeline-row-kind="working"],[data-timeline-row-kind="work-live"]))`.
- If you minify, never touch the inside of strings. A minifier that removed the space in `", Working"` broke every state rule, and one that read an apostrophe in a comment as the start of a string mangled the rest of the file.

## Techniques

### Recolor a subtree through `--contrast-*`

Tailwind's text classes read computed variables, not the color roles. `.text-muted-foreground` uses `--contrast-muted-foreground`, and `.text-secondary-label` uses `--contrast-secondary-label`. Setting a role variable such as `--secondary-label` on a container does nothing, because the value was already resolved at `:root`.

To fix contrast in one area, override the `--contrast-*` variables on the container, and on `--sidebar-icon-color` for icons:

```css
[data-slot="sidebar-inner"]{--contrast-sidebar-foreground:#fff;--contrast-sidebar-muted-foreground:#eef3fe}
[data-thread-item]{--contrast-foreground:#0b2a78;--contrast-muted-foreground:#46598a;--contrast-secondary-label:#46598a}
```

Don't change `--primary` inside a region, because it also restyles every `bg-primary` button there.

### Winning specificity

- Theme CSS is unlayered, and Tailwind's utilities sit in `@layer utilities`, so many rules win without `!important`.
- Inline styles, `data-slot` rules and some component rules still need `!important`.
- `!important` doesn't beat a more specific `!important`. Add `:not(#x)` to gain ID-level specificity without matching anything new, for example `[data-slot="button"]:not(#xp)`.
- All four themes turn off the app's glass blur with `backdrop-filter:none!important`. Don't add your own blur to popups.
- When a rule seems to do nothing, check it in the page with `getComputedStyle` before adding more weight. The cause may be a dropped declaration. An invalid value (such as a three-value `background-position`) drops the whole declaration.

### Drawing extra parts

- **Pseudo-elements carry most of the art.** Many hosts already use `::before` or `::after`, so reset `content`, `display`, `position`, `opacity` and `visibility` with `!important`. Give decorations `pointer-events:none` so clicks still reach T3's controls.
- **Restyle, don't hide.** Keep T3's content and controls working. Draw a decorative button over a real one only if pointer events pass through to the real one.
- **Watch for clipping.** Rows have `overflow:hidden` and fixed heights, and sidebar `li`s have `content-visibility:auto`. The sidebar scroll area has a fade mask. Draw inside the padding (Workshop's avatar moved inside the message's left padding), or remove the clipping on purpose.
- **Use absolute positioning.** `sidebar-inner` wraps its content in a full-height child, so in-flow pseudo-elements get pushed off screen. Use `position:absolute` plus reserved padding. `[data-slot="sidebar-footer"]` didn't render pseudo content at all.
- **Window title bars without layout changes.** Use `border-top:28px solid transparent` and paint the bar with a background using `background-origin:border-box` (Luna XP's dialogs).

### Background images

Make the image an original drawing: generate an SVG scene, render it once with Playwright to a 2560×1600 JPEG at about quality 82 (Azeroth's is about 150 KB), and save it as `themes/<id>/background.jpg`.

Show it with `var(--theme-background-image)`, then clear every opaque layer above it. Azeroth needed `background:transparent!important` on `body`, `#root`, `[data-slot="sidebar-wrapper"]`, `[data-slot="sidebar-inset"]`, `[data-slot="sidebar-inset"]>div:has([data-chat-column])` and `[data-timeline-loading]`. To find the layers, list the large elements whose computed `backgroundColor` isn't transparent.

Animate fog, drift or particles with CSS layers on top. An element at `z-index:-1` behind `body` stays hidden. Put a fixed overlay on top with `pointer-events:none` instead.

### Connecting shapes across regions (LCARS)

CSS anchor positioning lets a connector follow the selected row. Set `anchor-name:--lsel` on `[data-sidebar-row][aria-current="page"]`. Then a `position:fixed` pseudo-element with `position-anchor:--lsel` and `left:anchor(--lsel right)` reaches across to a second anchor on the conversation frame.

- The pseudo-element must come after the anchor in tree order: `li::after` works, but `li::before` doesn't.
- Add `position-visibility:anchors-visible` so the connector hides when the row scrolls away.
- Hover filters must also apply to the connector, or the card and its connector won't match on hover.

### 3D tilt (Workshop)

- `transform: perspective(...) rotateY(...)` on the side panes. The same angle looks steeper on a wider pane, so Workshop uses 10° on the left and 7° on the right.
- Tie depth and pull-in to the pane's width: put `container-type:inline-size` on the parent, then use `calc(var(--k)*100cqw)` and `-5.5cqw` rather than pixels. Fixed pixel values break at other window widths.
- The far edge grows beyond its box, so ancestors clip it. Add bleed margins on the actual clipper, which is often an inner wrapper, not the panel.
- Stacked transforms and fine overlays blur text. Use one transform per pane, and no scanlines over text.
- Keep the right panel's tab row flat, and flatten the whole panel while a browser tab is open: `[data-workspace-area="panel"]:has([data-browser-surface-slot]){transform:none!important}`.

### State effects and motion

- **Per-row state.** Set custom properties per state (`--rc` color, `--lab` label text, `--anim`) and let one shared pseudo-element read them.
- **Live counts.** Put `counter-reset` on `[data-slot="sidebar-content"]` and `counter-increment` on rows, one counter per state, and show them with `content:counter(x)`. The element that shows the counter must come after the rows in DOM order.
- **Animating gradient parts.** Register custom properties with `@property` so `@keyframes` can animate them, for example the heights of Workshop's five waveform bars, staggered 0.15 s apart. Also set fallback values on each element.
- **Blinking alerts.** Use `@keyframes` on a custom property with `steps(1)`.
- **One-shot "turn finished" effects (Azeroth's Quest Complete).** A transition runs on state change, never on first render. Arm the effect while working with `transition:none` and the start values. When the working row disappears, the base rule's delayed transition plays once.
  - Scope it to the scroller's own contents: `.messages-timeline-scroll:has(:is([data-timeline-row-kind="working"],[data-timeline-row-kind="work-live"]))::before`. A page-wide `:root:has(...)` fires falsely when switching threads, because the old timeline lingers for a moment.
  - Don't hang it on the last message. Timeline rows are virtualized: each has its own wrapper with `contain: layout style paint`, so `:last-child` matches every row and paint containment clips the overlay.
  - `position:sticky; top:0; height:78vh; margin-bottom:-78vh` keeps the overlay on screen.
  - Cancel it for failed and rate-limited threads.
  - To learn which elements survive a thread switch, tag elements in the page (`el.__t=1`), switch threads, and check the tags. The chat column, canvas and composer persist; `.messages-timeline-scroll` remounts.
- **Reduced motion.** Put every animation behind `@media (prefers-reduced-motion: no-preference)` or cancel animations under `reduce`.

## Fonts

- Use fonts the user already has: system fonts, or `local()` in an `@font-face` alias. Set them through `--font-sans` and, if needed, `body{font-family:...!important}`.
- Use metric overrides to make a fallback fit: `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override`. Rows have fixed heights, so a larger font can clip or overlap. Check them after any size change.
- Embedding a subset font as base64 works (about 6 to 13 KB per weight for ASCII only), but it eats the CSS budget. LCARS dropped its embedded font for a `local("DIN Condensed Bold")` alias, and the user preferred it.
- Never embed a licensed font. List it first in the stack in case the user has it installed (Azeroth does this with Friz Quadrata).
- Set code back to monospace: `code, pre, kbd, [data-language], [data-inline-code], .xterm`.
- `background-clip:text` gradients render faintly. Use solid colors with layered `text-shadow`.

## Finding hooks

- **Probes.** `scripts/screenshots/probes/` has ready-made scripts for `npm run dev -- eval <theme> <probe> <view>`:
  - `survey.js` lists every `data-*` hook with counts and the box of the first one.
  - `opaque.js` lists large solid layers, which hide a background image.
  - `states.js` lists each sidebar row's aria-labels, including the status words.
- **App source.** The desktop app's bundle shows which variables and attributes exist. Find `app.asar` in the installed app (on macOS, `Contents/Resources/app.asar` inside the app bundle), extract it with `npx -y @electron/asar extract <path to app.asar> /tmp/t3asar`, then grep `apps/server/dist/client/assets/main-*.css` and `main-*.js`. Grepping the `.asar` directly is slow, so use `timeout` and simple patterns.
- **Isolated tests.** For tricky geometry or animation, build a small HTML page with the real rule text and stand-in boxes, and check it with `html_preview`. Workshop's wave and room layout were solved this way.
- **Real user settings.** The sidebar's look depends on the user's client settings. For example, the "boring sidebar" setting makes rows use `sidebar-row-folder`. Test those variants too. If you need the user's exact setup, ask them for a screenshot rather than reading their T3 data.
