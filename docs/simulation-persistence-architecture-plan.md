# Simulation Persistence Architecture Plan

## Safety scope
Documentation/schema planning only. No operational bet placement, debit, payout, settlement or execution routines. Do not apply to staging/production. No Render, main or feat/sim-api-staging changes. public.transfer_virtual_coins is excluded.

## Audit context
platform_users and coin_ledger use UUID identity; platform_users balance and ledger amount are numeric(18,2). virtual_coin_ledger belongs to a separate tenant/Auth identity and bigint units. No dedicated rounds/bets tables were found. Reconcile identity/unit systems before any implementation.

## Proposed rounds schema (conceptual)
Fields: id UUID, game_code, round_code, status, opens_at/closes_at/closed_at, created/updated times, result_payload JSONB, result_version integer, result_recorded_at, result source/version metadata and audit identity. Unique (game_code, round_code); indexes by game/status/time and status/deadline.
Statuses: CREATED, OPEN, CLOSED, RESULT_RECORDED, REVIEW, COMPLETE, CANCELLED.

Allowed transitions only: CREATED->OPEN or CANCELLED; OPEN->CLOSED or CANCELLED; CLOSED->RESULT_RECORDED, REVIEW or CANCELLED; RESULT_RECORDED->REVIEW or COMPLETE; REVIEW->RESULT_RECORDED only via reviewed, audited version correction, or CANCELLED where permitted. COMPLETE and CANCELLED are terminal. Enforce this as a transition graph, not just a CHECK constraint.

### Result immutability/versioning
Recorded result payload/source metadata are immutable for a version. Corrections require REVIEW and a strictly increasing version, retaining prior versions in append-only audit history with actor, timestamp, reason and old/new version identifiers. Ordinary updates cannot overwrite results; COMPLETE cannot ordinarily reopen. These are requirements, not implemented procedures.

## Proposed bets records
Fields: id UUID, round_id FK, platform_user_id FK, game_code, selection_code, selection_snapshot JSONB, stake NUMERIC(18,2)>0, status, payout_rule_snapshot JSONB, result_snapshot JSONB, simulation-only payout/return fields, idempotency_key, timestamps, and optional ledger_entry_id only after reconciliation.
Unified statuses: PENDING, ACCEPTED_SIMULATION, CANCELLED, RESULT_RECORDED, WON_SIMULATION, LOST_SIMULATION, VOID_SIMULATION. These are descriptive simulation/history labels only; no execution semantics are implied. Bet transitions must be separately specified and tested.

Snapshot semantics: selection_snapshot records selection context; payout_rule_snapshot records historical rule/odds context (not instructions); result_snapshot records the result/version used for historical classification; simulated return/payout fields are non-operational and must never mutate balances.

## Idempotency
Unique scope is (platform_user_id, idempotency_key). Same-user retry with same key/request resolves to the existing record; materially different payload using the same key is a conflict. Keys may coincide between different users. Unique constraints/concurrency behavior require actual tests.

## Referential integrity
Draft FKs use ON DELETE RESTRICT; retain referenced records. Round/bet game-code consistency is a cross-row invariant requiring separately designed enforcement; simple CHECK constraints cannot enforce it. Test FKs/delete behavior in disposable PG.

## RLS/grants requirements
- Default-deny; enable RLS and assess FORCE RLS compatibility.
- No broad anon/authenticated grants. RLS does not replace grants or server-side checks.
- SELECT bets only for the user's own trusted platform identity; round visibility separately scoped.
- Client INSERT denied by default. Any future reviewed simulation-only submission path must validate trusted identity, user status, round state, matching game, snapshots and idempotency, and prevent client-supplied privileged result/ledger fields.
- Client UPDATE and DELETE denied by default, including changes to stake, status, result, payout, version, ownership or timestamps.
- Elevated access narrowly granted; hierarchy derived from trusted relationships, never a client role string.
- Separate policies per table and command; test anonymous, user, cross-user, hierarchy/admin as relevant, and elevated/service paths.
- Policies, grants, validation and integrity constraints all require separate review.

## Non-operational API boundaries
Read-only catalog, round status/history; simulation record submission only after separate review; fixture-only result records; health-only service. No operational settlement/result routes.

## Test plan
Disposable PG only: DDL, FKs and ON DELETE RESTRICT, stake/precision checks, status graph, result immutability/versioning, idempotency retries/conflicts, concurrent duplicate writes, RLS/grants across roles, indexes and rollback. Tests not run are not claimed as passed.

## Sequencing and status
Inventory/identity reconciliation, draft, disposable validation, read-only/simulation history and security review. No staging deployment/migration without separate review. No DB connected or migration applied; no operational implementation; transfer function never called.
