# Goldbet9 Staging — Simulation Persistence Architecture Plan

## Scope and safety boundary
This branch is a planning-only isolated branch. It does not modify Supabase, Render, main, or feat/sim-api-staging. It does not expose or invoke public.transfer_virtual_coins. No operational wagering, coin debit, payout, or settlement execution is implemented in this plan.

## Audit foundation (existing)
- platform_users: UUID ID, username unique, role, parent_id, virtual_balance numeric(18,2), exposure, active flag; non-negative balance/exposure checks and role constraint.
- coin_ledger: UUID, from/to platform-user FKs, positive amount, entry_type constraint (MINT, TRANSFER, BET_LOCK, WIN_PAYOUT, REFUND, ADJUSTMENT), nullable text round_id, unique idempotency_key.
- round_settlements: round_id text PK, game_code, winner_outcome text, settled_at timestamp; minimal result record only.
- game_sessions: tenant/game lifecycle, not individual bet history.
- virtual_coin_ledger: separate tenant/Auth-user identity and bigint delta; do not mix without an identity and unit reconciliation.
- No dedicated bets or round lifecycle table was found in the audit.

## Proposed data model (specification only)
### rounds (new, proposed)
- id UUID primary key
- game_code text references/validates against game catalogue
- round_code text unique (stable external/display identifier)
- status text constrained to lifecycle labels such as CREATED, OPEN, CLOSED, RESULT_RECORDED, REVIEW, COMPLETE, CANCELLED
- opens_at, closes_at, created_at, closed_at timestamps
- result_payload JSONB (immutable result snapshot once recorded)
- result_source/version metadata
- created_by/recorded_by audit identity where appropriate
- uniqueness for game_code + round_code
- indexes: game/status/deadline and created time
- RLS and access policy review required before migration

### bets (new, proposed; historical/simulation records only until reviewed)
- id UUID PK
- round_id UUID FK rounds
- platform_user_id UUID FK platform_users
- game_code text
- selection_code text and selection_snapshot JSONB
- stake NUMERIC(18,2), constrained positive
- status constrained to PENDING, ACCEPTED_SIMULATION, CANCELLED, RESULT_RECORDED, WON_SIMULATION, LOST_SIMULATION, VOID_SIMULATION
- payout_rule_snapshot JSONB (historical snapshot only)
- simulated_outcome/payout fields explicitly marked non-operational
- idempotency_key text, unique within an appropriate scope
- created_at, updated_at, finalized_at
- indexes for round, user + time, status, and unique idempotency scope
- RLS and access policy review required before migration

## Integrity and transaction design principles (not executable wagering instructions)
- Never rely on client-side balance or timer checks as authoritative.
- Any future balance-changing feature must be designed as one atomic, server-authorized database transaction, with concurrency protection, input validation, authorization, duplicate-request protection, and a durable audit record.
- A failed operation must leave no partial state; retry behavior must be explicitly tested.
- A result record must be immutable/versioned, and any correction must be an auditable event rather than silent overwrite.
- Existing coin_ledger idempotency_key is unique. Its round_id is text and presently lacks an FK to a round table. A future schema proposal should reconcile that linkage and key scope without breaking existing records.
- Keep platform_users and auth.users identities distinct until a deliberate mapping is audited. Do not migrate or mix virtual_coin_ledger records casually.
- public.transfer_virtual_coins remains blocked from application use and is not a component of this architecture.

## API/service boundaries for a non-operational simulation
- Read-only catalog and round status endpoints.
- Simulation record submission endpoint that creates clearly labelled test/history records, without balance debit or payout.
- User history and round history endpoints with authorization and tenant/role scope.
- Result-recording interface for test fixtures only; no production result or settlement route.
- Health endpoint only for deployment readiness; no secrets or live DB wiring in this branch.

## Test plan
1. Unit tests: schema/model validation, enum/status validation, numeric precision, idempotency collision behavior for simulation records.
2. Authorization tests: user cannot read another user's history; admin-like permissions must be explicit and tested.
3. Persistence tests against a disposable local PostgreSQL instance with synthetic data, never Goldbet9-Staging.
4. Failure tests: invalid IDs, malformed selection snapshots, duplicate keys, missing references, concurrent record attempts, rollback behavior.
5. Migration tests: apply to disposable database, verify constraints/indexes/RLS/policies, then test rollback on disposable data.
6. Static safety checks: assert no references to public.transfer_virtual_coins in executable code; no operational debit/payout routes; no secrets.
7. CI: tests and lint only; no Render deployment and no staging DB connection.

## Migration sequencing (proposal)
- Phase A: produce a schema inventory and identity/units reconciliation.
- Phase B: draft rounds/bets migration in a disposable database only.
- Phase C: add read-only history and simulation endpoints.
- Phase D: security review and test evidence.
- Phase E: no staging deployment or migration until a separate explicit review/authorization and safe scope are established.

## Not done
No SQL migration applied; no live database connected; no data changed; no GitHub main or feat/sim-api-staging changes; no Render changes; no transfer function called.
