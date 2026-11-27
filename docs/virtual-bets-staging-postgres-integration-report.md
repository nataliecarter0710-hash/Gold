# PostgreSQL Integration Test Report (throwaway)

Date: 2026-11-28
Branch: feat/virtual-bets-staging
Target: goldbet9-rounds-bets-integration-test (new disposable project; ref sngrsnvwbucsljwtykpa; Mumbai)
Cost: $0/month quoted and confirmed

## PASS
- [x] Valid lifecycle sequence tested through SQL trigger: CREATED -> OPEN -> CLOSED -> RESULT_RECORDED -> COMPLETE.
- [x] Invalid skipped transition rejected by trigger.
- [x] Direct result replacement rejected.
- [x] REVIEW correction to version 2 accepted and version history retained.
- [x] Documented seven bet-status labels accepted by CHECK constraint.
- [x] Snapshot values checked for preservation.
- [x] Unique per-user idempotency key constraint rejects duplicate key inserts.
- [x] Two concurrent SQL calls attempting same user/key with competing payloads: one insert succeeded and the other was rejected by the unique constraint (one logical row).

## FAIL / NOT PROVEN
- [ ] Retry reuse vs payload conflict semantics: only uniqueness rejection was proven; there is no implemented retry resolver that returns the original row and compares payloads.
- [ ] RLS isolation: test role query returned two rows for the A fixture in the attempted context, so isolation was NOT proven (and should be treated as a failed/inconclusive probe, not a pass).
- [ ] Grants and anon/authenticated matrix not comprehensively tested.
- [ ] Concurrent duplicate payload retry resolution beyond database uniqueness was not tested.
- [ ] Cross-row game-code invariant and delete-restrict behavior were not fully tested.

## Cleanup
Test schema `test_validation` was dropped. Project was paused successfully. Project was not deleted because no deletion action was used/available in this run.

## Safety
Only the newly provisioned disposable project was used. Goldbet9-Staging, the previously paused throwaway, Render, main, and feat/sim-api-staging were untouched. public.transfer_virtual_coins was not called or exposed. Synthetic fixtures only. No balances/ledger or operational settlement routines were used.
