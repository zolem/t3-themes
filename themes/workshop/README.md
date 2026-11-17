# Workshop

A holographic garage workshop: 3D-tilted side walls, an arc-reactor status light and a voice-waveform composer.

- Id: `workshop`
- Appearance: dark

![A thread](screenshots/thread.png)

![A thread with the terminal and right panel open](screenshots/panels.png)

![The new-thread screen](screenshots/new-thread.png)

## Install

### Ask your agent

Copy this prompt into a coding agent (in T3 or a terminal):

```text
Install the Workshop theme for T3 Code.
1. Download https://raw.githubusercontent.com/zolem/t3-themes/main/themes/workshop/theme.json and save it as ~/.t3/userdata/themes/workshop.json. Create the folder if it doesn't exist.
2. If you have T3's `t3_theme_set` tool, switch to it with { "themeId": "workshop" }. Otherwise tell me to pick "Workshop" in T3's appearance settings.
```

### By hand

```sh
mkdir -p ~/.t3/userdata/themes
curl -fsSL https://raw.githubusercontent.com/zolem/t3-themes/main/themes/workshop/theme.json -o ~/.t3/userdata/themes/workshop.json
```

Then pick **Workshop** in T3's appearance settings. If it was already selected, reselect it to load the new file.

To go back, pick any built-in theme.

## Notes

- The right panel's browser is a native view that CSS can't move, so the side-wall tilt flattens while a browser tab is open.
