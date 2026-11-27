# Throwaway PostgreSQL validation — provisioning blocked

Date: 2026-11-28
Branch: feat/virtual-bets-staging

## Isolation boundaries
This run did not connect to or modify Goldbet9-Staging (qoasttmttjiwjvmznoir). Render services, main and feat/sim-api-staging were not changed. public.transfer_virtual_coins was not called or exposed.

## Outcome
The requested runtime validation could not begin because no disposable PostgreSQL server/target was available in the execution environment. Earlier environment checks found no psql, postgres, docker or podman. A separate Supabase throwaway project could be provisioned, but doing so requires choosing an organization and checking/confirming any cost. No project was created and no SQL was applied.

## Requested test results
All runtime tests below are BLOCKED / NOT RUN, not failed and not passed:
- [ ] Apply reconciled rounds/bets structure to throwaway database
- [ ] Fake-data checks for all seven bet status labels and snapshot fields (selection_snapshot, payout_rule_snapshot, result_snapshot and simulation-only fields)
- [ ] Round happy path CREATED -> OPEN -> CLOSED -> RESULT_RECORDED -> COMPLETE
- [ ] REVIEW and CANCELLED paths
- [ ] Invalid transition rejection
- [ ] Result immutability and version corrections
- [ ] Idempotency key reuse for same user/same payload
- [ ] Same key/different payload conflict
- [ ] Concurrent duplicate behavior
- [ ] RLS role tests (anonymous, own user, cross-user, privileged/elevated roles as applicable)
- [ ] Rollback and disposable target cleanup

## Rules under test
Use the reconciled rules in docs/simulation-persistence-architecture-plan.md and docs/virtual-bets-staging-schema-review.md as the test specification. Fake data only. Any test target must be distinct from Goldbet9-Staging and must not contain copied user data or secrets.

## Cleanup
No test database was created, so there was no database to reset or delete. Cleanup is therefore not applicable.

## Next prerequisite
To provision a separate disposable Supabase/PostgreSQL target safely, the user must specify which Supabase organization to use. Before creation, obtain and disclose the cost quote and require explicit agreement if it is non-zero. Do not use the prohibited Goldbet9-Staging project or its branches for this test.

This report is honest status documentation: it records blocked provisioning, not completed PostgreSQL validation.
