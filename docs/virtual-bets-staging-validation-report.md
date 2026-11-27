# Disposable PostgreSQL validation report — blocked at runtime

Date: 2026-11-28
Branch: feat/virtual-bets-staging
Source reviewed: docs/simulation-persistence-architecture-plan.md on plan/simulation-persistence-architecture

## Scope and isolation
This report is a static review only. No Goldbet9-Staging database was connected. No Render service was changed. No edits were made to main or feat/sim-api-staging. public.transfer_virtual_coins was not called.

## Runtime validation status
A disposable PostgreSQL server/client was not available in the execution environment (psql, postgres, docker and podman were not found). No separate disposable database was provisioned. Therefore actual PostgreSQL DDL execution, FK enforcement, delete behavior, CHECK/UNIQUE enforcement and concurrency tests are **not verified**.

## Static review findings
- The cited architecture plan is a specification, not executable SQL. Its rounds and bets definitions are descriptive and require a migration draft.
- Existing audited platform_users and coin_ledger use UUID identifiers; platform_users.virtual_balance and coin_ledger.amount use NUMERIC(18,2), as recorded in the prior audit.
- A draft in docs/virtual-bets-staging-schema-review.md exists on this branch, but it is not a faithful translation of the plan: it uses a different bet-status vocabulary (RECORDED, WON_SIMULATION, etc. rather than PENDING/ACCEPTED_SIMULATION/...), and omits the plan's payout_rule_snapshot and simulated outcome/payout fields. This needs reconciliation before a test.
- rounds result checks require result data for RESULT_RECORDED, REVIEW and COMPLETE; status progression is not enforced as a transition graph. The draft does not enforce result immutability/version correction rules.
- Foreign keys use ON DELETE RESTRICT in the draft; actual behavior has not been tested.
- stake > 0 and idempotency uniqueness are declared in the draft, but enforcement and concurrent behavior remain unverified until PostgreSQL tests.
- The draft uses unique(platform_user_id, idempotency_key); whether that is the correct scope is a product/security decision requiring review.
- A unique ledger_entry_id reference is included; reconciliation with existing ledger entries and their key scope remains pending.

## Test checklist — not run
- [ ] Execute migration in disposable PostgreSQL
- [ ] Confirm both tables create successfully
- [ ] Confirm FK failures for missing round/user/ledger references
- [ ] Confirm ON DELETE RESTRICT for referenced round/user/ledger rows
- [ ] Validate status constraints and lifecycle consistency constraints
- [ ] Reject zero, negative and invalid NUMERIC(18,2) stakes
- [ ] Validate uniqueness: round identifiers, user idempotency key, ledger_entry_id
- [ ] Duplicate and concurrent insert test against PostgreSQL
- [ ] Verify index and RLS definitions
- [ ] Test rollback on disposable database

## Next safe action
Reconcile the SQL draft with the architecture specification, then run this checklist only on a separately provisioned disposable PostgreSQL instance. This report does not provide or implement bet debit, payout, or settlement execution.
