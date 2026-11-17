#!/usr/bin/env bash
# Copy the themes T3 is using now into this repo (run after tweaking a theme in T3).
set -euo pipefail
SRC="${T3_THEMES_DIR:-$HOME/.t3/userdata/themes}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/themes"
for f in "$SRC"/*.json; do
  cp "$f" "$DEST/"
  echo "pulled $(basename "$f")"
done
