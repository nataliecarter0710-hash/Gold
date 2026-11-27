# Virtual-bets schema proposal (REVIEW ONLY)

Not applied. This proposal does not implement bet placement, debit, payout or settlement routines. Do not apply to Goldbet9-Staging without separate review and authorization. Assumes audited platform_users(id UUID); coin_ledger linkage is optional and must be reconciled.

Use docs/simulation-persistence-architecture-plan.md as the source of truth for field design and integrity requirements. Unified bet status names: PENDING, ACCEPTED_SIMULATION, CANCELLED, RESULT_RECORDED, WON_SIMULATION, LOST_SIMULATION, VOID_SIMULATION.

Snapshots required conceptually: selection_snapshot, payout_rule_snapshot, result_snapshot. Simulated payout/return metadata must be clearly non-operational.

Idempotency scope: UNIQUE(platform_user_id, idempotency_key). Same request/key is intended as idempotent retry; materially changed payload is conflict. Test this, including concurrency.

Round transitions and result immutability/versioning are specified in the architecture plan; CHECK constraints alone do not enforce graphs or immutability.

## RLS and grants requirements
- Default-deny; enable RLS and assess FORCE RLS compatibility.
- Avoid broad client-role grants.
- SELECT bet rows only for the trusted platform identity's own records; round visibility is separately scoped.
- Client INSERT/UPDATE/DELETE denied by default. Any later reviewed simulation submission path must validate trusted identity, user status, round state, game consistency, snapshots and key scope, and prohibit client-supplied privileged result/ledger fields.
- No direct client updates or deletion.
- Elevated access narrowly granted; hierarchy based on trusted relationship data, not client role strings.
- Separate policies per table and command; test anonymous, user, cross-user, hierarchy/admin and elevated access as applicable.
- RLS is not a substitute for grants, validation or constraints.

Test all schema, FK, status, result versioning, idempotency, concurrency and access rules only on a disposable PostgreSQL instance. No staging migration and no operational debit, payout or settlement code.
