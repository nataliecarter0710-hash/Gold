# Disposable PostgreSQL validation report — static review and documentation reconciliation

Date: 2026-11-28. Branch: feat/virtual-bets-staging.

## Isolation
No Goldbet9-Staging connection or mutation; no Render changes; main and feat/sim-api-staging untouched; public.transfer_virtual_coins not called.

## Runtime status
No disposable PostgreSQL server/client available (psql, postgres, docker and podman absent); none provisioned. Therefore SQL execution, constraints, FK/delete behavior, status transitions, result immutability, concurrency/idempotency and RLS execution remain NOT VERIFIED.

## Reconciled documentation rules
- Bet statuses unified: PENDING, ACCEPTED_SIMULATION, CANCELLED, RESULT_RECORDED, WON_SIMULATION, LOST_SIMULATION, VOID_SIMULATION.
- Snapshots: selection_snapshot, payout_rule_snapshot, result_snapshot, plus explicitly non-operational simulation payout/return fields.
- Idempotency: UNIQUE(platform_user_id, idempotency_key); same request retry should reuse record, changed payload should conflict; untested.
- Round transition graph documented; COMPLETE and CANCELLED terminal. Results immutable per version; corrections require REVIEW, strictly increasing version and append-only audit trail.
- RLS expectations are default-deny and concrete: own-bet SELECT, separately scoped round visibility, direct client writes denied by default, no direct UPDATE/DELETE, tightly scoped elevated access, command-specific policies/grants and role-based testing. RLS enablement alone is insufficient.

## Checklist — NOT RUN
- [ ] disposable PG migration/table/index creation
- [ ] FK missing references and ON DELETE RESTRICT
- [ ] positive stake and NUMERIC checks
- [ ] statuses and transition graph enforcement
- [ ] result immutability/version correction audit
- [ ] idempotency uniqueness/retry/payload conflict
- [ ] concurrent duplicates
- [ ] RLS/grants/policies across roles
- [ ] rollback

This was documentation reconciliation only, not runtime testing or operational wager/settlement implementation.
