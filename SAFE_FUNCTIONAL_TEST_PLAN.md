# Goldbet9 Safe Functional Test Plan

## Scope
This recovery branch is an isolated, non-wagering preview. It must not accept wagers, move funds/credits, authenticate customers, or calculate/execute payouts or gambling settlement.

## Functional areas to make testable
- Lobby: 24-item catalogue, categories, search, favorites, preview modal, keyboard/mobile navigation.
- Admin/reporting demo: synthetic, clearly labelled data only; filterable tables and exportable CSV of synthetic activity.
- Round-history demo: synthetic sample round statuses and timestamps; no outcome selection, odds, stake, payout or settlement engine.
- Operational dashboard: preview health, feature status, data-source labels, and test checklist.
- Accessibility: keyboard operation, responsive layouts, accessible labels, focus handling and reduced-motion support.
- Quality: automated static checks, CI, branch-isolated deployment, visual testing when browser test infrastructure is available.

## Proposed milestones
1. Audit current recovery code, backups and original main branch read-only.
2. Improve catalogue and lobby behavior; test the 24-game list and mobile navigation.
3. Add a clearly labelled synthetic reporting dashboard (sample activity rows only), filters, summaries and CSV export of synthetic data.
4. Add synthetic round-history/status views and admin UI navigation; no betting or settlement functionality.
5. Extend automated checks and document known limitations.
6. Validate deployment and report actual status; do not claim visual testing unless performed.

## Release guardrails
- Never modify original main or original production service.
- Keep this recovery branch and its preview service isolated.
- No financial transactions, wagering, real users, real account balances, payout calculation, settlement engine or outcome steering.
- Do not describe legal compliance as verified.
