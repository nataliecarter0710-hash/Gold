# Pre-launch Readiness Checklist — Simulation Staging

**Scope:** Synthetic sample data only. This is a readiness gate, not release approval. Real wagering, balance debits, credits, payouts, and live ledger paths must remain disabled and isolated.

## 1. Phone and foldable visual verification
- [ ] Verify phone-sized viewports and foldable device layouts both folded and unfolded, including real-device Android checks.
- [ ] Confirm no horizontal clipping or overflow in badges, filters, selection/result/payout snapshots, long labels, or REVIEW history.
- [ ] Check search/filter controls and result counter readability, usability, and empty/loading/error states.
- [ ] Confirm REVIEW version-history display is readable and clearly shows withheld/fictional information without implying settlement.
- [ ] Confirm simulation/virtual-coin, age-restriction, regional-restriction, and responsible-use notices are visible and readable.

## 2. Read-only / simulation backend and API wiring
- [ ] Verify the UI uses only the synthetic feed or a clearly isolated staging endpoint, never a production/live source.
- [ ] Confirm feed validation, loading, network-error, invalid-response, and embedded fallback behavior.
- [ ] Verify environment/configuration separation and fail-closed behavior.
- [ ] Confirm live/real coin, wallet, transfer, or ledger paths are isolated and disabled; no real balance changes, debits, credits, or payouts.
- [ ] Review route, permission, and logging behavior using synthetic test fixtures only.

## 3. Full RLS, idempotency, and concurrency verification
- [ ] Test restricted-role and cross-tenant isolation across relevant tables, views, and endpoints.
- [ ] Verify anonymous access denial and direct client write blocks where writes are restricted.
- [ ] Test idempotency: retrying an identical payload/key should reuse the expected result; changed-payload reuse should be rejected as a conflict.
- [ ] Test invalid round transitions, duplicate submissions, and reconciliation/review behavior.
- [ ] Perform broader multi-user, concurrency, and load checks beyond the initial isolated probes; record reproducible evidence and limitations.
- [ ] Obtain independent security review; source inspection or UI checks alone do not prove database protections.

## 4. Release and compliance notices / scope protection
- [ ] Verify explicit simulation/virtual-coin notices so users cannot mistake the experience for real-money wagering.
- [ ] Verify age-restriction, regional-restriction, and responsible-use notices are displayed and reviewed.
- [ ] Complete qualified jurisdiction-specific legal/compliance review; this checklist does not itself establish compliance.
- [ ] Confirm release scope, version, acceptance evidence, rollback plan, monitoring, and sign-off.
- [ ] Protect `Index.htm`, Goldbet9-Staging, Render services, `main`, and `feat/sim-api-staging`; this task must not modify or deploy to them.
- [ ] Keep this branch and work simulation-only; production/live wagering, coin, wallet, transfer, or ledger functions remain out of scope.

**Status:** Not launch-approved. All applicable checks require evidence and sign-off before a release decision.
