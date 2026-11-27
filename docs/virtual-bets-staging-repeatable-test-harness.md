# Repeatable reconciled rounds/bets test harness

**Branch:** `feat/virtual-bets-staging`  
**Status:** Test design and checklist only; no runtime execution in this commit.

## Safety and prerequisites
- Run only against a freshly provisioned, disposable PostgreSQL database with fake identities and fixtures.
- Never target Goldbet9-Staging (`qoasttmttjiwjvmznoir`), the paused throwaway (`ouocegahvxrqusnmctmy`), Render, main, or feat/sim-api-staging.
- Never call or expose `public.transfer_virtual_coins`. No balance debit, operational payout, settlement, or bet-placement integration.
- Use a test-only schema, test-only role/identity setup, and transactions or disposable reset. Clean up after test runs.
- Test harness must be reviewed and adapted to the actual implementation; this document is not itself a migration.

## Harness convention
Use PostgreSQL's native assertions in a transaction-oriented test runner (pgTAP is preferred if available). Each case must report PASS/FAIL with a stable test ID. Fixture values must be synthetic. Tests should assert both the expected successful behavior and the rejected behavior. For concurrency cases, use two independent sessions and record both outcomes.

## Round transition graph
Allowed edges only:
- CREATED -> OPEN or CANCELLED
- OPEN -> CLOSED or CANCELLED
- CLOSED -> RESULT_RECORDED, REVIEW or CANCELLED
- RESULT_RECORDED -> REVIEW or COMPLETE
- REVIEW -> RESULT_RECORDED (reviewed, audited correction) or CANCELLED where permitted
- COMPLETE and CANCELLED are terminal

### Test cases
- [ ] R01: CREATED -> OPEN succeeds.
- [ ] R02: OPEN -> CLOSED succeeds.
- [ ] R03: CLOSED -> RESULT_RECORDED succeeds.
- [ ] R04: RESULT_RECORDED -> COMPLETE succeeds.
- [ ] R05: CREATED -> CANCELLED succeeds.
- [ ] R06: OPEN -> CANCELLED succeeds.
- [ ] R07: CLOSED -> REVIEW succeeds.
- [ ] R08: RESULT_RECORDED -> REVIEW succeeds.
- [ ] R09: REVIEW -> CANCELLED succeeds only if policy permits.
- [ ] R10: every unlisted edge is rejected, including skipping stages, backwards movement outside REVIEW, reopening COMPLETE, and reopening CANCELLED.
- [ ] R11: rejected transitions leave the row and audit trail unchanged.
- [ ] R12: duplicate round code within the same game is rejected; same code in a different game is allowed.

## Result immutability and version correction
- [ ] V01: first result record on a CLOSED round creates version 1 with payload, source/metadata, timestamp and actor captured.
- [ ] V02: ordinary update attempts to alter result payload, source metadata, version, recorded timestamp or actor are rejected.
- [ ] V03: direct correction outside REVIEW is rejected.
- [ ] V04: entering REVIEW and applying a reviewed correction requires a reason and actor, increments version strictly (e.g. 1 -> 2), and preserves version 1 in append-only history.
- [ ] V05: correction audit contains previous/new version identifiers, actor, timestamp and reason.
- [ ] V06: version regression, skipping/duplicating a version, empty correction reason and audit-history mutation/deletion are rejected.
- [ ] V07: completion prevents ordinary reopening or result replacement.

## Idempotency and payload conflict
Scope is unique per `(platform_user_id, idempotency_key)`.
- [ ] I01: first fake request creates one record.
- [ ] I02: retry with the same user, key and normalized payload returns/references the original record and does not create another row.
- [ ] I03: same user/key with materially changed round, selection, stake, snapshots or relevant request fields returns a conflict and leaves the original untouched.
- [ ] I04: another user may use the same key without collision.
- [ ] I05: null/blank/malformed keys are rejected as specified.
- [ ] I06: retry behavior does not mutate balance/ledger or invoke settlement/debit/payout logic.

## Concurrent duplicate write test
Run two independent database sessions with the same user, idempotency key and payload, synchronized so both attempt insert at nearly the same time:
- [ ] C01: exactly one logical record is created.
- [ ] C02: both callers resolve to the same record or the losing caller receives the documented retry-safe response.
- [ ] C03: no duplicate record and no partial side effects occur.
Repeat with same key but different payload:
- [ ] C04: exactly one request wins; the other receives conflict.
- [ ] C05: no lost update, silent payload overwrite or duplicate side effect.
Use a barrier/synchronization mechanism in the test runner; sequential tests alone do not prove race safety.

## RLS and grants matrix
Create two fake user identities (A and B), one fake subordinate relationship where relevant, and synthetic admin/elevated roles only in the test DB. Verify grants as well as RLS. Tests should execute under the actual database roles and auth context, not as the table owner alone.
- [ ] S01: anonymous role cannot read protected bet rows or write protected tables.
- [ ] S02: authenticated A can read only A's rows.
- [ ] S03: A cannot read B's rows, including via filters, direct ID lookup, joins or views.
- [ ] S04: user cannot INSERT/UPDATE/DELETE directly unless an explicitly reviewed, narrowly scoped path exists; test attempts to alter stake, status, ownership, result, payout metadata and timestamps.
- [ ] S05: identity is derived from trusted server/database identity mapping, not a client-supplied user ID or role string.
- [ ] S06: round visibility rules are tested separately from bet visibility.
- [ ] S07: hierarchy access for agent/admin roles follows trusted relationship records, and A cannot invent or alter hierarchy to access B.
- [ ] S08: elevated/service access is limited to intended operations; test both authorized and unauthorized paths.
- [ ] S09: grants are least-privilege; RLS enabled (and FORCE RLS considered), policies are command-specific and default-deny.
- [ ] S10: tests are repeated with table owner/bypass context only as a diagnostic, never counted as proof of RLS enforcement.

## Additional invariants
- [ ] X01: positive stake and numeric precision constraints.
- [ ] X02: FK and ON DELETE RESTRICT behavior.
- [ ] X03: round/bet game-code consistency is enforced by the designed mechanism, or documented as not yet enforced.
- [ ] X04: all seven descriptive bet statuses are accepted only where intended: PENDING, ACCEPTED_SIMULATION, CANCELLED, RESULT_RECORDED, WON_SIMULATION, LOST_SIMULATION, VOID_SIMULATION.
- [ ] X05: selection, payout-rule and result snapshots preserve historical context; simulation metadata is clearly non-operational and cannot affect balances.
- [ ] X06: tests verify no ledger/balance writes and no operational settlement routines are called.

## Repeatable run procedure
1. Confirm target database is disposable, isolated, empty of real data, and not any prohibited project.
2. Record database identifier and isolation evidence in the run log (do not record secrets).
3. Apply only the reviewed test schema/setup to the test database.
4. Run tests in sections R, V, I, C, S and X; save output and failure details.
5. Run cleanup/reset; verify test schema and fixtures are removed.
6. Pause/delete the disposable database if supported and approved; record exact cleanup result.
7. Update the validation report with actual results. Do not mark tests passed unless execution output supports it.

## Run log template
- Date/time:
- Test target (non-secret identifier):
- Harness commit:
- Test runner/version:
- Result: PASS / FAIL / BLOCKED
- Tests passed / failed / not run:
- Failure details:
- Cleanup verified:
- Safety boundary verification:

## Current state
This checklist is a repeatable test specification, not evidence that tests have run. Result-version procedures, transition enforcement, retry semantics, concurrency handling and RLS/grants remain unverified until executed against a newly approved disposable PostgreSQL target.
