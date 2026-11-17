#!/usr/bin/env bash
# Copy themes from this repo into T3. Pass ids to install only some: ./scripts/install.sh workshop
# Copies each theme's JSON file and its background image (<id>.jpg/.png/.webp), if it has one.
set -euo pipefail
DEST="${T3_THEMES_DIR:-$HOME/.t3/userdata/themes}"
SRC="$(cd "$(dirname "$0")/.." && pwd)/themes"
mkdir -p "$DEST"
if [ $# -gt 0 ]; then ids=("$@"); else ids=(); for f in "$SRC"/*.json; do ids+=("$(basename "$f" .json)"); done; fi
for id in "${ids[@]}"; do
  [ -f "$SRC/$id.json" ] || { echo "no theme named $id in $SRC" >&2; exit 1; }
  for f in "$SRC/$id".json "$SRC/$id".jpg "$SRC/$id".png "$SRC/$id".webp; do
    [ -f "$f" ] && cp "$f" "$DEST/"
  done
  echo "installed $id"
done
echo "Restart T3 or reselect the theme to pick up changes."
