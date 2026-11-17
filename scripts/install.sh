#!/usr/bin/env bash
# Copy themes from this repo into T3. Pass names to install only some: ./scripts/install.sh workshop
set -euo pipefail
DEST="${T3_THEMES_DIR:-$HOME/.t3/userdata/themes}"
SRC="$(cd "$(dirname "$0")/.." && pwd)/themes"
mkdir -p "$DEST"
if [ $# -gt 0 ]; then files=(); for n in "$@"; do files+=("$SRC/$n.json"); done; else files=("$SRC"/*.json); fi
for f in "${files[@]}"; do
  cp "$f" "$DEST/"
  echo "installed $(basename "$f" .json)"
done
echo "Restart T3 or reselect the theme to pick up changes."
