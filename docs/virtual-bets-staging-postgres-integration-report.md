# PostgreSQL Integration Test Report (throwaway)

Date: 2026-11-28
Branch: feat/virtual-bets-staging
Target: goldbet9-rounds-bets-integration-test (new disposable project; ref sngrsnvwbucsljwtykpa; Mumbai)
Cost: $0/month quoted and confirmed

## Prior limited results
- [x] Valid lifecycle sequence tested: CREATED -> OPEN -> CLOSED -> RESULT_RECORDED -> COMPLETE.
- [x] Invalid skipped transition rejected.
- [x] Direct result replacement rejected.
- [x] REVIEW correction to version 2 accepted and history retained.
- [x] Seven documented bet status labels accepted.
- [x] Snapshot values checked.
- [x] Unique per-user key constraint rejected duplicate insertion.
- [x] Competing concurrent inserts yielded one row due to uniqueness constraint.

## Follow-up artifacts added (not live-tested)
- Concrete test-only policies and role assertion protocol in `tests/sql/virtual-bets-staging-test-schema.sql` and `docs/virtual-bets-staging-rls-idempotency-design.md`.
- Resolver design reuses the original record when the same identity/key/payload arrives, and rejects changed payload.
- Role-switching assertions cover restricted roles, A/B isolation, and direct-write denial.

## Follow-up status: NOT RUN
- [ ] RLS role switching using restricted authenticated/anon contexts; cross-user isolation and direct-write denial are not verified.
- [ ] Same-payload retry resolver reuse and changed-payload conflict are not verified on PostgreSQL.
- [ ] Concurrent resolver-level behavior is not proven; previous concurrency probe only tested unique-key insertion.
- [ ] Production security, grants, hierarchy, cross-row game-code invariant, and operational pathways are not tested.

## Cleanup and boundaries
The prior test schema was dropped and the disposable project was paused. This follow-up did NOT unpause or modify any Supabase project. Goldbet9-Staging, both throwaway projects, Render, main, and feat/sim-api-staging were untouched. public.transfer_virtual_coins was not called or exposed. Fake-only artifacts; no operational balance, ledger, payout, bet placement or settlement.
