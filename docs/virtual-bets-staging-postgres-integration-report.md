# PostgreSQL Integration Test Report (throwaway)

Date: 2026-11-28
Branch: feat/virtual-bets-staging
Target: goldbet9-rls-idempotency-test (new disposable project; ref nol jgglwsbgnezclubfs; Mumbai) 
Cost: $0/month quoted, confirmed, and created

## Prior limited results
- [x] Valid lifecycle sequence tested: CREATED -> OPEN -> CLOSED -> RESULT_RECORDED -> COMPLETE.
- [x] Invalid skipped transition rejected.
- [x] Direct result replacement rejected.
- [x] REVIEW correction to version 2 accepted and history retained.
- [x] Seven documented bet status labels accepted.
- [x] Snapshot values checked.
- [x] Unique per-user key constraint rejected duplicate insertion.
- [x] Competing concurrent inserts yielded one row due to uniqueness constraint.

## Follow-up live tests (fake fixtures only)
- [x] Disposable test schema applied successfully in a newly created $0 project.
- [x] Restricted authenticated role A query for user B's bet rows returned zero rows.
- [x] Authenticated A invoked the resolver; a same-key/same-payload retry was exercised. Owner-side verification showed one row for A/key (not two) and payload remained unchanged.
- [x] Authenticated B independently used the same idempotency key; owner-side verification showed two rows total across A and B, confirming per-user key scope in this probe.
- [x] Changed-payload reuse was attempted inside a SQL exception-catching probe for SQLSTATE 22023; stored original payload was subsequently verified unchanged.
- [ ] Full restricted-role test matrix is not complete: the tool response did not provide reliable output for the explicit A-visible-total count; B-row exclusion was observed directly.
- [ ] Anonymous SELECT/write denial and authenticated direct INSERT/UPDATE/DELETE denial were not conclusively exercised/observed.
- [ ] Resolver concurrency behavior is not proven.
- [ ] Production security, grants, hierarchy, cross-row game-code invariant, and operational pathways are not tested.

## Cleanup and boundaries
- [x] Test schema `test_validation` dropped with CASCADE.
- [x] Newly created project paused successfully.
- [x] Goldbet9-Staging, both earlier paused projects, Render, main, and feat/sim-api-staging were untouched.
- [x] `public.transfer_virtual_coins` was not called or exposed.
- Fake-only test fixtures; no operational balance, ledger, payout, bet placement or settlement.
- Note: the tool surfaced limited results for some role-probe statements, so those are recorded as unverified rather than assumed passing.
