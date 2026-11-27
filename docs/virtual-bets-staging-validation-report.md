# Throwaway PostgreSQL validation — partial isolated checks

Date: 2026-11-28
Branch: feat/virtual-bets-staging

## Isolation boundaries
This run did not connect to or modify Goldbet9-Staging (qoasttmttjiwjvmznoir). Render services, main and feat/sim-api-staging were not changed. public.transfer_virtual_coins was not called or exposed.

## Provisioning and cost
Connected organization: nataliecarter0710-hash's Org (qqflcpiucjmybbvdgeeo), Free plan. One existing project was listed. Supabase quoted the throwaway project's cost at $0/month. The isolated project goldbet9-schema-test-throwaway was created in ap-south-1 (Mumbai), project ref ouocegahvxrqusnmctmy.

## Checks actually performed
A disposable test schema was created and then dropped:
- [x] Round table basic fields/status CHECK and unique (game_code, round_code) probe.
- [x] Bet table FK, positive-stake CHECK, status CHECK and per-user idempotency uniqueness.
- [x] Fake transaction probes for duplicate round, invalid round status, bad FK, duplicate user idempotency key, and zero stake rejection; transaction rolled back.
- [x] Test schema dropped after probes.
- [x] Test project paused after checks.

These are limited constraint probes, not a full implementation of the reconciled design. The schema was a minimal test harness based on the documentation, not a migration of a complete production-ready schema.

## NOT RUN / NOT VERIFIED
- [ ] All seven bet statuses and snapshot-field semantics end-to-end
- [ ] Full round lifecycle transition graph and REVIEW/CANCELLED paths
- [ ] Invalid transition rejection via graph enforcement (no transition trigger/function tested)
- [ ] Result immutability and audited version correction
- [ ] Same-key/same-payload retry semantics versus changed-payload conflict (only unique-key rejection was probed)
- [ ] Concurrent duplicate behavior
- [ ] RLS tests across anonymous, own user, cross-user, hierarchy/admin, elevated/service roles; scaffold creation was not included in the actual probes
- [ ] Complete grants/policy review
- [ ] Full cleanup/deletion of project

## Cleanup
The disposable test schema was dropped and the throwaway project was paused. A delete-project action was not available in the connected tool set, so the project has NOT been deleted. Pausing was confirmed successful. No further SQL was run after pausing.

## Rules under test
Use the reconciled rules in docs/simulation-persistence-architecture-plan.md and docs/virtual-bets-staging-schema-review.md as the specification. Fake data only. No existing Goldbet9 database or data was used.

This report distinguishes completed limited constraint probes from tests not run; it does not claim full validation.


## Repeatable test harness added
A branch-only repeatable test specification/checklist has been added at `docs/virtual-bets-staging-repeatable-test-harness.md` (commit f3cad22f0071b84a0a554635aeb01cc673b796e1). It defines full round graph checks, invalid transitions, REVIEW-based result correction and append-only history, retry reuse/conflict semantics, concurrent duplicate-write tests, and RLS/grant tests across roles. It remains a test plan; no runtime tests were executed in this commit.


## Database-free executable contract model added
Added `tests/virtual-bets-staging-contract-tests.py` with standard-library unittest checks and `tests/README-virtual-bets-staging-contract-tests.md` describing execution and limitations. The script models contract behaviors only; it is not a real PostgreSQL, RLS, grants, or database-concurrency test. It has not yet been executed in this work session. Real database tests remain NOT RUN.
