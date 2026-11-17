#!/usr/bin/env python3
"""Check theme files before committing them.

  ./scripts/check.py                       every theme in themes/
  ./scripts/check.py themes/my-theme/theme.json other.json

Fails on problems T3 would reject or silently drop. Warns when a theme's css is over
50,000 characters, because T3 Code v0.1.10 and nightlies before 20261117.4825 reject it.
"""
import glob
import json
import os
import sys

MAX_CSS = 100_000
OLD_MAX_CSS = 50_000

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
paths = sys.argv[1:] or sorted(glob.glob(os.path.join(root, "themes", "*", "theme.json")))
failed = False
for path in paths:
    try:
        theme = json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError) as err:
        print(f"{path}: can't read it ({err})")
        failed = True
        continue
    css = theme.get("css", "")
    problems = [
        message
        for message, bad in [
            ("missing name", not theme.get("name")),
            ("appearance must be dark or light", theme.get("appearance") not in ("dark", "light")),
            (f"css is {len(css):,} characters (max {MAX_CSS:,})", len(css) > MAX_CSS),
            ("css contains a backslash, so T3 drops that rule", "\\" in css),
            ("css uses @import", "@import" in css),
            ("css uses image-set()", "image-set(" in css),
        ]
        if bad
    ]
    warnings = []
    if OLD_MAX_CSS < len(css) <= MAX_CSS:
        warnings.append(
            f"css is {len(css):,} characters, so it needs T3 Code nightly 20261117.4825 or later; say so in the theme's README"
        )
    failed = failed or bool(problems)
    status = "; ".join(problems) if problems else f"ok ({len(css):,} characters of css)"
    print(f"{os.path.relpath(path, root)}: {status}")
    for warning in warnings:
        print(f"  warning: {warning}")
sys.exit(1 if failed else 0)
