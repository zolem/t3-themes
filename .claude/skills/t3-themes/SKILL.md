---
name: t3-themes
description: Install, switch, edit, create and save T3 Code themes kept in this repo. Use when the user wants to use one of these themes in T3, tweak a theme's colors or CSS, make a new theme, or save changes made in T3 back into the repo.
---

# T3 themes

This repo holds custom T3 Code themes. T3 reads themes from its themes directory (`~/.t3/userdata/themes/`, override with `T3_THEMES_DIR`). The repo's `themes/` folder is the source of truth; the scripts copy between the two.

| Path | What it is |
| --- | --- |
| `themes/<id>.json` | A theme. The file name is the theme id. |
| `themes/<id>.jpg` / `.png` / `.webp` | Optional background image for that theme. |
| `scripts/install.sh [id...]` | Copy themes from the repo into T3. No ids means all. |
| `scripts/pull.sh [id...]` | Copy themes from T3 back into the repo. No ids means all. |

## Use a theme

1. `./scripts/install.sh <id>` (or no id for all of them).
2. Switch to it:
   - As an agent in T3: call `t3_theme_set` with `{ "themeId": "<id>" }`.
   - By hand: pick it in T3's appearance settings.
3. If the theme was already selected, reselect it (or call `t3_theme_set` again) to load the new file.

To go back to a stock look, switch to a built-in theme: `t3-chat`, `grove`, `ocean`, `ember` or `iris`.

## Edit a theme

Live edits through T3 are the fastest loop, because the change shows at once:

1. Call `t3_theme_read` with `{ "themeId": "<id>" }`. It returns the theme file and the restyling guide (color roles and stable CSS selectors). Read the guide before changing CSS.
2. Change the theme object, then call `t3_theme_set` with `{ "themeId": "<id>", "theme": <the full theme object> }`. Using the same id updates the theme and switches to it.
3. You can't see the result. Make one small change at a time and ask the user how it looks.
4. When the user is happy, save it (next section).

You can also edit `themes/<id>.json` in the repo directly, then run `./scripts/install.sh <id>` and reselect the theme. Don't mix the two: if a theme was edited in T3, pull it first or the install will overwrite those edits.

## Save changes into the repo

T3 writes edited and new themes to its themes directory, not to this repo. To keep them:

1. `./scripts/pull.sh <id>`. Pass ids so you don't pull unrelated themes the user has installed. With no ids it pulls every theme in T3's directory.
2. Check the result before committing (see Checks below) and look at `git diff themes/`.
3. Commit: `git add themes && git commit -m "Tune <theme name>"`. Only commit or push when the user asks.

## Make a new theme

1. Pick a short kebab-case id. It becomes the file name and the id in T3.
2. Start from the guide (`t3_theme_read`) or copy an existing theme in `themes/`.
3. Publish it with `t3_theme_set` (`themeId` plus `theme`), iterate with the user, then `./scripts/pull.sh <id>`.
4. Add a row to the theme table in `README.md` with the name, id and a one-line description of the look.

## Theme file format

A JSON object:

- `name` (required): display name.
- `appearance` (required): `dark` or `light`.
- `canvas`, `accent`: hex colors that T3 derives a full palette from.
- `colors`: overrides for single color roles (`surface`, `sidebar`, `terminalBackground` and so on; `t3_theme_read` lists them all). Prefer colors over CSS.
- `variants.light` / `variants.dark`: role overrides for the other appearance.
- `css`: extra CSS applied after the app's styles, up to 50,000 characters.
- `version`: optional, currently `1`.

## CSS rules that bite

- A rule containing a backslash is dropped. Use raw characters (a real non-breaking space, not `\00a0`; a real newline, not `\A`). JSON escapes like `\n` in the file are fine; this is about the CSS after JSON decoding.
- No `@import`, no `image-set()`, and `url()` only with `data:` or `#id`. For a background image, put `<id>.jpg` (or `.png`, `.webp`, up to 16 MB) beside the theme file and use `var(--theme-background-image)`. Don't inline images into `css`.
- Use only the stable selectors the guide lists (`data-slot`, `data-*` attributes and a few named classes). Other class names change between releases.
- If a rule has no effect, the app's own rule is probably more specific. Add `!important`.
- CSS can't reach terminal text, the file tree or diff internals. Use color roles for those.
- The right panel's browser is a native view, so CSS transforms can't move it. Workshop flattens its tilt while a browser tab is open for this reason.
- Themes apply to T3 on web and desktop, not mobile.

## Checks

Run before committing a theme:

```sh
python3 - themes/*.json <<'PY'
import json, sys
for path in sys.argv[1:]:
    t = json.load(open(path))
    css = t.get("css", "")
    problems = [m for m, bad in [
        ("missing name", "name" not in t),
        ("appearance must be dark or light", t.get("appearance") not in ("dark", "light")),
        (f"css is {len(css)} chars (max 50000)", len(css) > 50000),
        ("css contains a backslash", "\\" in css),
        ("css uses @import", "@import" in css),
    ] if bad]
    print(path, "ok" if not problems else "; ".join(problems))
PY
```
