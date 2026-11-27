# Pre-Launch Readiness Checklist (`feat/virtual-bets-staging`)

Scope: Simulation and synthetic sample data only. No real wagering, real funds, balance debits, or payouts.
Protected assets (must remain untouched): `Index.htm`, `Goldbet9-Staging` (`qoasttmttjiwjvmznoir`), paused throwaway Supabase projects, Render services, `main`, `feat/sim-api-staging`, and `public.transfer_virtual_coins`.

## Phase A review results (28 Nov 2026; source/static and fixture simulation only)

- [x] Feed JSON parses; `mode` is `SYNTHETIC_SAMPLE_ONLY`; 28 records.
- [x] Required record fields checked: game, round, id, status, roundState, selection, rule, result, time, review.
- [x] All 7 defined bet statuses and all 7 defined round states are represented; `REVIEW` is a round state, not a bet status.
- [x] Snapshot fields (selection, rule, result) are present for each record; review histories are arrays of strings. Four records have review histories, with 10 notes total.
- [x] Feed loader source audit: one fetch to the branch-specific raw GitHub synthetic JSON feed; no XHR or database/API integration identified.
- [x] Bug fix: loader previously silently fell back without telling the viewer and only checked the mode marker plus records array. It now displays an accessible status message for loading, validated feed success, and fallback, and validates non-empty records, required fields, allowed status/state values, and review-array contents before accepting the feed.
- [x] Source-level fallback paths reviewed for feed success, non-OK/offline, JSON parse error, validation error, and empty records; the latter was found to be accepted and fixed to reject empty feed records. Scenario logic was checked in a small non-browser simulation against valid, non-synthetic, malformed, and empty fixtures. This is not browser/runtime testing.
- [x] Audit found no reference to `public.transfer_virtual_coins`, Supabase, XHR, or live database endpoints in the UI/feed. UI-only `innerHTML` rendering uses the escaping helper for record values. No real wagering or balance mutation action is present.
- [ ] Browser/runtime tests of feed success, offline failure, invalid/non-synthetic response, and visible status/fallback remain pending. No physical-device or browser test is claimed.

## Status summary (28 Nov 2026)

- **Phase A feed/UI:** static source review and small fixture simulation checked the valid-feed, offline/non-OK, invalid/non-synthetic, malformed, and empty-feed paths. A fix rejects empty feeds so they fall back. Browser/runtime behavior remains untested.
- **Historical isolated security probes:** a report documents anon SELECT denial and authenticated direct INSERT/UPDATE/DELETE denial, plus simultaneous same-key/same-payload reuse and changed-payload conflict rejection. These probes used a separate disposable project that was subsequently dropped/paused. This report is historical evidence, not a fresh test, and no throwaway project is to be resumed or modified now.
- **Not verified yet:** cross-user read isolation; independent anon write-denial probes; per-user key isolation; broader multi-user and repeated/overlapping concurrency testing; and production security/grants or operational paths.
- **Phone spot-check:** user reports having performed folded and unfolded phone checks, but detailed findings have not been supplied here; this checklist does not claim specific visual outcomes.

## 1. Phone and Foldable Visual Verification
- [ ] Record the user's folded-view findings (overflow/clipping, layout, badges).
- [ ] Record the user's unfolded-view findings (overflow/clipping, layout, badges).
- [ ] Record search, `Bet status`, `Round state`, and counter behavior.
- [ ] Record snapshots and `REVIEW` version-history readability.
- [ ] Record contrast and simulation, age, regional, and responsible-use notice visibility.
- [ ] If any issue is found, fix only `simulation-lobby-history.html` when explicitly requested; keep `Index.htm` untouched.

## 2. Read-Only / Simulation Backend and API Wiring
- [x] Source review: data source is the synthetic feed (`simulation-feed.json`) or embedded synthetic fallback; feed has a synthetic-mode marker and records array.
- [x] Source path and simulated fixtures reviewed for fallback conditions; browser/runtime confirmation remains pending.
- [x] Source-scope review confirms this prototype is separate from live balance/ledger operations; `public.transfer_virtual_coins` has not been called or exposed in this work.
- [x] Keep `Goldbet9-Staging`, Render services, `main`, and `feat/sim-api-staging` disconnected.

## 3. Full RLS, Idempotency, and Concurrency Verification
- [ ] Verify cross-user read isolation with restricted roles (User A cannot read User B's records and vice versa).
- [x] Historical isolated probe documented: anon SELECT on protected records was denied. Not a current re-test.
- [ ] Verify anon write-denial independently for INSERT/UPDATE/DELETE.
- [x] Historical isolated probes documented: authenticated direct INSERT, UPDATE, and DELETE were denied. Not a current re-test.
- [x] Historical isolated probes documented: same-user/key/same-payload concurrent calls reused the same ID/row, and same-key/changed-payload contenders produced a conflict with only the winning payload stored. Not a current re-test.
- [ ] Verify new-key behavior and per-user key isolation.
- [ ] Plan and run broader multi-user and repeated/overlapping concurrency checks beyond the initial simultaneous probes before treating security verification as complete.

## 4. Safe next verification pass (plan only; no tests executed by this checklist update)

1. Use only an already-approved, isolated test harness or offline/local fixture runner on this branch. Do not create, unpause, or modify any Supabase project, and do not connect this pass to Goldbet9-Staging.
2. First confirm the harness is synthetic-only, uses restricted test roles and fixture identities, has no credentials for protected environments, and cannot call financial/ledger functions.
3. Run read-only checks: validate feed schema and synthetic marker; exercise the UI's fallback using mocked/offline/invalid feed responses; confirm no live-data or balance-mutation route is present.
4. For database-bound tests, proceed only if an isolated harness already exists and is explicitly permitted. Test access controls and idempotency with synthetic identities, test keys, and payloads: cross-user isolation, anon denial, direct-write denial, new keys, same key/same payload, same key/changed payload, and per-user key isolation.
5. Run overlap tests with a bounded, documented number of synthetic contenders and repeated rounds, recording outcomes and errors. These are tests—not a stress/load certification.
6. Remove only test artifacts created by this pass from that permitted local/isolated harness, verify cleanup, and document what was and was not run. Do not touch any paused throwaway project.
7. Keep `Index.htm`, Goldbet9-Staging, Render, `main`, and `feat/sim-api-staging` unchanged.

## 5. Release and Compliance Notices
- [ ] Record/confirm clear simulation labels on lobby and history screens.
- [ ] Record/confirm age, regional, and responsible-use notices are present and legible.
- [ ] Verify protected assets remain untouched until an explicit promotion step is approved.


## Non-blocking UI/account-flow defect log (28 Nov 2026)

Observed in the Render-hosted app during viewing (recorded as a defect only; Render/auth/database resources were not modified):
- **Self-service password change missing:** user and admin account interfaces do not expose a Change Password control.
- **Authorized hierarchy reset missing:** upline roles lack a Reset Password control for their downline accounts.

This is a non-blocking planning note, not an implementation or security verification. Future implementation expectations:
1. **Change Password (self-service):** provide a clearly labeled control in user and admin account/profile settings; require the signed-in account's authentication and appropriate password confirmation/re-authentication, enforce password policy, and show success/failure feedback without revealing sensitive details.
2. **Reset Password (hierarchy):** only authorized upline roles may reset passwords for accounts directly or indirectly beneath them, according to the configured hierarchy and explicit role scope. Enforce permission server-side, not only by hiding UI controls. Prevent cross-tenant, unrelated-branch, self-escalation, and Super Admin/peer resets unless expressly allowed by policy. Log actor, target, timestamp and outcome without recording passwords or reset secrets.
3. Prefer a secure reset flow (such as a reset link or controlled temporary credential flow requiring immediate change) rather than displaying or storing a target user's existing/new password in plain text. Confirm identity, rate-limit actions, and invalidate or manage sessions according to policy.
4. **Future test plan:** synthetic fixtures for User/Admin self-change, permitted upline-to-downline reset, denied peer/other-tenant/out-of-branch attempts, role changes, rate limiting, and audit logging. No such tests were run as part of this defect recording.

Status: logged for a future implementation pass; does not block Phase A synthetic feed review. No Render, auth, database, live account, or production resource was changed.
