# PostgreSQL Integration Test Report (throwaway)

Date: 2026-11-28
Branch: feat/virtual-bets-staging
Target: goldbet9-concurrency-security-test (new disposable project; ref baoyxamkstqpkmalbyon; Mumbai)
Cost: $0/month quoted and confirmed; Free organization
Organization pre-check: Free plan; one active project (Goldbet9-Staging), three previously paused throwaways; no previously paused project was resumed or modified.

## Tests in this follow-up (fake fixtures only)
- [x] Schema installed successfully in new isolated project.
- [x] Anon SELECT from protected bets table denied: PostgreSQL permission error 42501.
- [x] Authenticated direct INSERT denied: permission error 42501.
- [x] Authenticated direct UPDATE denied: permission error 42501.
- [x] Authenticated direct DELETE denied: permission error 42501.
- [x] Concurrent identical resolver calls (launched concurrently) returned the same bet ID; owner-side verification showed one row for that key.
- [x] Concurrent conflicting payload calls for same user/key: one succeeded and one raised SQLSTATE 22023 idempotency payload conflict; owner-side verification showed only one row and the stored payload matched the winning call.
- [x] Another pair of concurrent identical calls returned the same bet ID; owner-side verification showed one row for the key.
- [x] Owner-side count verification: one row per tested key; conflicting-key payload stored was stake 5, one contender rejected.

## Limitations
- [ ] Anon write-denial probes were not separately observed as tool errors in this run; schema revokes all anon access, but not marked as independently verified.
- [ ] Concurrency was tested through simultaneous tool calls, not a stress test or repeated load test.
- [ ] Production security, grants, hierarchy, cross-row game-code invariant, and operational pathways remain untested.
- [ ] This disposable schema is a test harness, not production-ready implementation.

## Cleanup and boundaries
- [x] Schema test_validation dropped with CASCADE.
- [x] Newly created project successfully paused.
- [x] Goldbet9-Staging (qoasttmttjiwjvmznoir), both earlier paused throwaways, prior follow-up throwaway, Render, main, and feat/sim-api-staging untouched.
- [x] public.transfer_virtual_coins not called or exposed.
- Fake-only test data; no real wagering, balances, ledger operations, or financial payouts.
