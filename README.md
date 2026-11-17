# T3 Code themes

Custom themes for [T3 Code](https://github.com/pingdotgg/t3code) that restyle the whole app, not just its colors.

| Theme | Id | Look |
| --- | --- | --- |
| LCARS | `lcars` | Starfleet LCARS console: elbow frames, pill buttons, numbered panels |
| Workshop | `workshop` | Holographic garage workshop: 3D-tilted side walls, arc-reactor status, voice waveform composer |
| Luna XP | `windows-xp` | Early-2000s desktop look: blue title bars, glossy buttons, light theme |

## Install

### Ask your agent

Copy this prompt into a coding agent (in T3 or a terminal). Change the first line to the theme id you want, or leave it as `all` to get every theme and pick one later.

```text
Theme: all

Install T3 Code themes from https://github.com/zolem/t3-themes.
1. If ~/t3-themes exists, run `git -C ~/t3-themes pull`. Otherwise run `git clone https://github.com/zolem/t3-themes.git ~/t3-themes`.
2. If "Theme" above is `all`, run `~/t3-themes/scripts/install.sh`. Otherwise run `~/t3-themes/scripts/install.sh <id>` with that id. The ids are listed in the table in ~/t3-themes/README.md.
3. If you have T3's `t3_theme_set` tool and I named one theme, switch to it with `{ "themeId": "<id>" }`. Otherwise tell me which themes were installed and that I can pick one in T3's appearance settings.
4. Follow ~/t3-themes/.claude/skills/t3-themes/SKILL.md for anything else, such as editing a theme or saving changes back.
```

### By hand

```sh
git clone https://github.com/zolem/t3-themes.git
cd t3-themes
./scripts/install.sh            # all themes
./scripts/install.sh workshop   # just one
```

Themes are copied into `~/.t3/userdata/themes/`. Pick one in T3's appearance settings.

## Save changes made in T3

After editing a theme in T3 (or asking an agent to), copy it back into the repo and commit:

```sh
./scripts/pull.sh workshop   # or no id to pull every theme in T3
git add themes && git commit -m "Tune workshop"
```

Both scripts also copy a theme's background image (`<id>.jpg`, `.png` or `.webp`) if it has one.

## Agent skill

`.claude/skills/t3-themes/SKILL.md` teaches coding agents (Claude Code, or any agent running in T3) how to install, switch, edit, create and save these themes, including the CSS limits below.

## Theme file format

Each file in `themes/` is a JSON object with `name`, `appearance` (`dark` or `light`), `canvas`, `accent`, `colors` and an optional `css` string (up to 50k characters).

Notes for the `css` field:

- Rules containing a backslash are dropped. Use raw characters (for example a real non-breaking space) instead of escapes like `\A` or `\00a0`.
- The right panel's browser is a native view, so CSS transforms can't move it. Workshop flattens its tilt while a browser tab is open.
