#!/usr/bin/env bash
# Copy themes from T3 back into this repo (run after tweaking a theme in T3).
# ./scripts/pull.sh            pulls every theme that already has a folder in themes/
# ./scripts/pull.sh my-theme   pulls that theme, creating themes/my-theme/ if it's new
# <id>.json in T3's themes folder becomes themes/<id>/theme.json, and
# <id>.(jpg|png|webp), if present, becomes themes/<id>/background.(jpg|png|webp).
set -euo pipefail
SRC="${T3_THEMES_DIR:-$HOME/.t3/userdata/themes}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/themes"
if [ $# -gt 0 ]; then ids=("$@"); else ids=(); for d in "$DEST"/*/; do ids+=("$(basename "$d")"); done; fi
for id in "${ids[@]}"; do
  [ -f "$SRC/$id.json" ] || { echo "no theme named $id in $SRC" >&2; exit 1; }
  mkdir -p "$DEST/$id"
  cp "$SRC/$id.json" "$DEST/$id/theme.json"
  for ext in jpg png webp; do
    if [ -f "$SRC/$id.$ext" ]; then cp "$SRC/$id.$ext" "$DEST/$id/background.$ext"; fi
  done
  echo "pulled $id"
done
