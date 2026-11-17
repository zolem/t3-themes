#!/usr/bin/env bash
# Copy themes T3 is using now into this repo (run after tweaking a theme in T3).
# Pass ids to pull only some: ./scripts/pull.sh workshop
# Copies each theme's JSON file and its background image (<id>.jpg/.png/.webp), if it has one.
set -euo pipefail
SRC="${T3_THEMES_DIR:-$HOME/.t3/userdata/themes}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/themes"
if [ $# -gt 0 ]; then ids=("$@"); else ids=(); for f in "$SRC"/*.json; do ids+=("$(basename "$f" .json)"); done; fi
for id in "${ids[@]}"; do
  [ -f "$SRC/$id.json" ] || { echo "no theme named $id in $SRC" >&2; exit 1; }
  for f in "$SRC/$id".json "$SRC/$id".jpg "$SRC/$id".png "$SRC/$id".webp; do
    [ -f "$f" ] && cp "$f" "$DEST/"
  done
  echo "pulled $id"
done
