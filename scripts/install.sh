#!/usr/bin/env bash
# Copy themes from this repo into T3. Pass ids to install only some: ./scripts/install.sh workshop
# themes/<id>/theme.json becomes <id>.json in T3's themes folder, and
# themes/<id>/background.(jpg|png|webp), if present, becomes <id>.(jpg|png|webp).
set -euo pipefail
DEST="${T3_THEMES_DIR:-$HOME/.t3/userdata/themes}"
SRC="$(cd "$(dirname "$0")/.." && pwd)/themes"
mkdir -p "$DEST"
if [ $# -gt 0 ]; then ids=("$@"); else ids=(); for d in "$SRC"/*/; do ids+=("$(basename "$d")"); done; fi
for id in "${ids[@]}"; do
  [ -f "$SRC/$id/theme.json" ] || { echo "no theme named $id in $SRC" >&2; exit 1; }
  cp "$SRC/$id/theme.json" "$DEST/$id.json"
  for ext in jpg png webp; do
    if [ -f "$SRC/$id/background.$ext" ]; then cp "$SRC/$id/background.$ext" "$DEST/$id.$ext"; fi
  done
  echo "installed $id"
done
echo "Restart T3 or reselect the theme to pick up changes."
