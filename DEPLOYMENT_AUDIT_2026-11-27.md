# Goldbet9 deployment audit — 27 November 2026

## Scope
Read-only inspection of the GitHub branches and Render service/deployment records. This audit does not certify legal compliance or operational security and does not enable wagering, transaction, account, or settlement features.

## Render services recovered
- goldbet9-lobby-preview — static site; branch goldbet9-lobby-preview-20261127; deploy commit 1a5325b949f2b51094bcaf42af274fcfa96ce47b; Render reports deploy status live.
- Goldbet9-training-recovery — static site; branch goldbet9-training-recovery; most recent recorded live commit b8a1d337a3f1cf72570ca5d1a4b5c415c1e1ec54 (preview-popup button feedback).
- Gold9 — static site; branch main; most recent recorded live commit 2294a11361ee51a172c812f51942760c073a57fe.

## Findings
1. The isolated lobby preview is a simple HTML/CSS page with 24 cards, mostly emoji artwork. It is not the developed Training Recovery lobby.
2. Training Recovery has a more elaborate HTML/CSS/JavaScript lobby and preview pages for synthetic reporting and operations checks. The report data is synthetic and locally displayed; it is not connected to real accounts or transactions.
3. Main's latest deployment is tied to a rename to capitalized `Index.htm`. Render static hosting commonly expects a lowercase `index.html` entry file. This is a likely publishing/entry-point issue, but was not changed because the file may contain functionality beyond the safe isolated-preview scope.
4. The deployment status reported by Render as `live` confirms a deploy record, not independent verification of the rendered public page.
5. No production readiness, legal compliance, or live backend security certification is claimed.

## Recommended safe next steps
- Keep the isolated preview branch separate from potentially operational gameplay code.
- Verify the actual public page and its visible content against the commit/version.
- Keep mock reporting and operations pages clearly labelled and disconnected from real data.
- Resolve the main-branch entry-point issue only after confirming that the published file is a safe, isolated preview.
