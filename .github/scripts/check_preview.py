#!/usr/bin/env python3
"""Small dependency-free checks for the isolated Goldbet9 visual preview."""
from pathlib import Path
import re
import sys

html = Path("index.html").read_text(encoding="utf-8")
checks = {
    "24 game catalog entries": len(re.findall(r'\["[^"]+","[^"]+","(?:Cards|Table|Wheel|Special)"\]', html)) == 24,
    "underage footer notice": "Underage gaming is not allowed" in html,
    "preview-only label": "PREVIEW ONLY" in html,
    "wagering and settlement disabled messaging": "wagering and settlement are disabled" in html.lower(),
    "modal dialog semantics": 'role="dialog"' in html and 'aria-modal="true"' in html,
    "keyboard Escape close": "e.key==='Escape'" in html,
    "favorite persistence": "goldbet9-favorites" in html,
    "skip navigation link": 'href="#main-content"' in html,
    "reduced motion preference": "prefers-reduced-motion:reduce" in html,
}
failed = False
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + " - " + name)
    failed |= not ok
if failed:
    sys.exit(1)
print(f"\nAll {len(checks)} checks passed.")
