#!/usr/bin/env python3
"""Small dependency-free checks for the isolated Goldbet9 visual preview."""
from pathlib import Path
import re
import sys\nfrom collections import Counter

html = Path("index.html").read_text(encoding="utf-8")
ids = re.findall(r\'\\b id="([^"]+)"\', html)\nchecks = {
    "24 game catalog entries": len(re.findall(r'\["[^"]+","[^"]+","(?:Cards|Table|Wheel|Special)"\]', html)) == 24,
    "underage footer notice": "Underage gaming is not allowed" in html,
    "preview-only label": "PREVIEW ONLY" in html,
    "wagering and settlement disabled messaging": "wagering and settlement are disabled" in html.lower(),
    "modal dialog semantics": 'role="dialog"' in html and 'aria-modal="true"' in html,
    "keyboard Escape close": "e.key==='Escape'" in html,
    "favorite persistence": "goldbet9-favorites" in html,
    "skip navigation link": 'href="#main-content"' in html,
    "reduced motion preference": "prefers-reduced-motion:reduce" in html,\n    "unique static HTML IDs": all(count == 1 for count in Counter(ids).values()),\n    "favorite buttons have pressed-state support": "aria-pressed" in html,\n    "main content landmark": "<main" in html and "id=\\"main-content\\" " in html,
}
failed = False
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + " - " + name)
    failed |= not ok
if failed:
    sys.exit(1)
print(f"\nAll {len(checks)} checks passed.")
