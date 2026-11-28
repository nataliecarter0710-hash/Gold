# Pre-Launch Readiness Checklist (`feat/virtual-bets-staging`)

Scope: Simulation and synthetic sample data only. No real wagering, real funds, balance debits, or payouts.
Protected assets (must remain untouched): `Index.htm`, `Goldbet9-Staging` (`qoasttmttjiwjvmznoir`), paused throwaway Supabase projects, Render services, `main`, `feat/sim-api-staging`, and `public.transfer_virtual_coins`.

## Phase A review results (28 Nov 2026; source/static and fixture simulation only)

- [x] Feed JSON parses; `mode` is `SYNTHETIC_SAMPLE_ONLY`; 28 records.
- [x] Required record fields checked: game, round, id, status, roundState, selection, rule, result, time, review.
- [x] All 7 defined bet statuses and all 7 defined round states are represented; `REVIEW` is a round state, not a bet status.
- [x] Snapshot fields (selection, rule, result) are present for each record; review histories are arrays of strings. Four records have review histories, with 10 notes total.
- [x] Feed loader source audit: one fetch to the branch-specific raw GitHub synthetic JSON feed; no XHR or database/API integration identified.
- [x] Bug fix: loader displays accessible status messages for loading, validated-feed success, and fallback; it validates non-empty records, required fields, allowed status/state values, and review-array contents.
- [x] Source-level fallback paths reviewed for feed success, non-OK/offline, JSON parse error, validation error, and empty records. Scenario logic was checked in a small non-browser simulation. This is not browser/runtime testing.
- [x] Audit found no reference to `public.transfer_virtual_coins`, Supabase, XHR, or live database endpoints in the UI/feed. UI-only `innerHTML` rendering uses the escaping helper for record values. No real wagering or balance mutation action is present.
- [ ] Browser/runtime tests of feed success, offline failure, invalid/non-synthetic response, and visible status/fallback remain pending. **Attempted in this work session but not run:** a Chromium executable is present, but the browser automation/source staging could not be completed; network retrieval of the repository's raw source failed. No browser observations are claimed.
- [ ] Search, Bet-status filter, Round-state filter, counter, snapshot display, REVIEW history, and notice visibility are not browser-verified in this pass.

## Status summary (28 Nov 2026)

- **Phase A feed/UI:** static source review and small fixture simulation checked valid-feed, offline/non-OK, invalid/non-synthetic, malformed, and empty-feed paths. Browser runtime remains unverified.
- **Browser test attempt:** no actual browser-level assertions or visual observations were completed. The requested mocked-response scenarios (valid synthetic feed, offline/failure, invalid/non-synthetic, and empty records) remain pending. No browser results should be inferred from source inspection.
- **Physical Android:** folded/unfolded phone verification is separate and not performed as part of this browser test attempt; do not treat desktop/browser availability as phone verification.
- **Historical isolated security probes:** a report documents anon SELECT denial and authenticated direct INSERT/UPDATE/DELETE denial, plus simultaneous same-key/same-payload reuse and changed-payload conflict rejection. These probes used a separate disposable project that was subsequently dropped/paused. This report is historical evidence, not a fresh test, and no throwaway project is to be resumed or modified now.
- **Not verified yet:** cross-user read isolation; independent anon write-denial probes; per-user key isolation; broader multi-user and repeated/overlapping concurrency testing; and production security/grants or operational paths.
- **Phone spot-check (user screenshots):** folded portrait and unfolded catalog layout observations recorded, plus lower-history-section screenshot observations below. Search/filter interactions, REVIEW history details, and full-page scrolling remain unverified.



**User-supplied visual observations (screenshots; 28 Nov 2026):**
- Folded/portrait: catalog cards appear stacked vertically; simulation-only badge, simulation notice, lobby panel and catalog are visible. No obvious horizontal overflow or clipping in the screenshot's captured area.
- Unfolded/wider: catalog is arranged in three columns; notice and lobby panel span the wider content area. No obvious horizontal overflow or clipping in the captured area.
- Overflow/clipping/wrapping: no obvious issue visible in the supplied screenshots, but this is limited to the captured viewport and not a full scroll test. Catalog labels/tags appear contained in their cards in the visible area.
- Lower history area: screenshot shows “Synthetic feed loaded and validated.”, Search records field, Bet status selector (default “All bet statuses”), Round state selector (default “All round states”), and “28 of 28 sample records shown.” Controls were visible but not interacted with.
- First visible history card: Teen Patti (sample) • TP-S-1042; selection “Player A (fictional)”; payout rule “Illustrative rule: sample payout 2×”; result “Player A • sample result”; badge “WON_SIMULATION / COMPLETE”.
- Later screenshots show Dragon Tiger (sample) • DT-S-2088 with selection “Dragon (fictional)”, rule “Illustrative rule: sample payout 1.95×”, result “Result withheld during review”, badge “PENDING / REVIEW”, and REVIEW history entries v1 (19:40, initial sample result flagged for review) and v2 (19:44, record retained; no simulated settlement action).
- A Seven Up Down (sample) card shows selection “Up (fictional)”, rule “Snapshot v1: illustrative payout 1.9×”, result “Result held for review • sample only”, badge “PENDING / REVIEW”, and three REVIEW history entries (v1 09:30 metadata mismatch; v2 09:34 display-label correction confirmed; v3 09:38 audit-trail example finalized). The text explicitly says record remains pending and round remains REVIEW.
- The combined badge presentation visibly pairs bet-status labels with round-state labels, including “PENDING / REVIEW”; filters have separate headings. Actual filter interaction remains untested.
- Notice: simulation-only badge and simulation/fictional-data, age, regional/legal and responsible-use text are visible in the captured screenshots. No broader contrast/readability assessment recorded.

## 1. Phone and Foldable Visual Verification
- [x] Folded-view observation recorded from user screenshots: portrait layout shows catalog cards stacked vertically; the simulation-only badge, notice, lobby panel, and sample catalog are visible. No obvious horizontal overflow/clipping in the captured area; this is limited to the screenshots.
- [x] Unfolded-view observation recorded from user screenshots: wider layout shows catalog cards arranged in three columns; notice and lobby panel span the content width. No obvious horizontal overflow/clipping in the captured area; this is limited to the screenshots.
- [x] Lower-section controls and initial counter recorded from screenshot: Search records, Bet status (All bet statuses), Round state (All round states), and 28 of 28 sample records shown. Interactions/change behavior remain untested.
- [x] First history-card snapshots recorded from screenshot: Teen Patti (sample), TP-S-1042; selection “Player A (fictional)”; payout rule “Illustrative rule: sample payout 2×”; result “Player A • sample result”; badge “WON_SIMULATION / COMPLETE”. Second card header shows Dragon Tiger (sample), DT-S-2088, badge “PENDING / REVIEW”; lower details/history are cut off and remain unverified.
- [x] Screenshot observation: simulation-only label and simulation/fictional-data, age, regional/legal and responsible-use notice are visible in the captured lobby view. Contrast/readability beyond the captured screens is not independently assessed.
- [x] User screenshots show REVIEW history entries for Dragon Tiger and Seven Up Down, with REVIEW presented as round state alongside PENDING bet status. This is a visual observation only.
- [ ] Search/filter interaction and counter updates after filtering remain unverified.
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


## Additional lower-history Fold 8 observations (user screenshots; 28 Nov 2026)

- [x] Dragon Tiger card details visible: selection “Dragon (fictional)”; payout rule “Illustrative rule: sample payout 1.95×”; result “Result withheld during review”; badge “PENDING / REVIEW”.
- [x] Dragon Tiger REVIEW history visible: v1 • 19:40 • Initial sample result flagged for review; v2 • 19:44 • Record retained; no simulated settlement action.
- [x] Seven Up Down card details visible: selection “Up (fictional)”; rule “Snapshot v1: illustrative payout 1.9×”; result “Result held for review • sample only”; badge “PENDING / REVIEW”.
- [x] Seven Up Down REVIEW history visible: v1 • 09:30 • sample result metadata did not match displayed record; v2 • 09:34 • second-pass review confirmed display-label correction; v3 • 09:38 • audit trail example finalized; record remains pending and round remains REVIEW.
- [x] Other visible cards in screenshots demonstrate snapshot layout: Muflis Teen Patti (selection “Muflis Player B (fictional)”, payout 2×, “Awaiting sample outcome”, ACCEPTED_SIMULATION / OPEN); Football Studio (selection “Home (fictional)”, payout 1.95×, result area partly below viewport); Bollywood Casino (selection “Film title slot 3 (fictional)”, payout 3×, “Slot 3 • sample result”); 32 Cards A (selection “High-card group (fictional)”, payout 2×, “Alternate group • sample result”); Andar Bahar 2 (selection “Bahar side (fictional)”, payout 1.9×, cancelled-before-result sample); Andar Bahar (selection “Andar side (fictional)”, illustrative 1.9×; “Not yet recorded • round remains open”); Poker One Day (pair of fictional cards; illustrative payout schedule 4×; awaiting sample round opening); Lucky 7 (selection “Seven (fictional)”, payout 5×; result pending after sample betting window closed); Sic Bo (selection “Small (fictional)”, payout 1×; round cancelled); Baccarat (selection “Player (fictional)”, payout 1×; “Player • sample result”); Race 20 (selection “Runner 2 (fictional)”, payout 3×; cancelled sample); Roulette (selection “Red (fictional)”, payout 2×; result “Black • sample result”).
- [x] Screenshots show the history cards' snapshot blocks and REVIEW history text fitting within card boundaries in the captured views. No obvious horizontal side-scrolling or clipping of card content was observed in those captures; screenshots are not a full-page overflow audit.
- [x] The page status text “Synthetic feed loaded and validated.” and counter “28 of 28 sample records shown” were observed. Search and filters were shown at defaults (“All bet statuses” and “All round states”), but were not operated; behavior and counter changes remain unverified.
- [x] Some screenshots include the Android volume overlay over the right side of filter controls; this is a phone OS overlay, not evidence of page clipping.
- [ ] Full-page scroll/overflow audit, interaction tests for search and both filters, and any counter changes remain unverified.


## Fold 8 filter/search interaction observations (user screenshots; 28 Nov 2026)

- [x] Search field was focused on the phone and the on-screen keyboard appeared. No search term/result was shown in the captured screenshot; the counter still displayed “28 of 28 sample records shown”. Filtering behavior after typing remains unverified.
- [x] Bet-status selector was opened. The screenshot shows “All bet statuses” and an option labelled “PENDING”. No option selection or resulting card/counter change was captured; filtering behavior remains unverified.
- [x] Round-state selector was opened. The screenshot shows “All round states” and an option labelled “CREATED”. No option selection or resulting card/counter change was captured; filtering behavior remains unverified.
- [x] The opened Android selection overlays appear as tall grey panels over the page in the captured views. This is recorded as observed overlay appearance, not a confirmed page overflow defect.
- [ ] Search-result narrowing, combined search/status/state filtering, empty-match behavior, and counter updates after selections remain unverified. The screenshots do not prove these interactions work.



## Fold 8 live search interaction observation (user screenshot; 28 Nov 2026)

- [x] Search field was populated with the text `Dragon tiger`.
- [x] Visible counter changed from the initial 28 of 28 to **2 of 28 sample records shown** in the screenshot.
- [x] The top of a matching Dragon Tiger (sample) card is visible below the controls; its header shows `DT-S-2088` and `PENDING / REVIEW`.
- [x] This screenshot is direct user-supplied visual evidence of search narrowing and counter updating for this query. It does not establish the exact identity/content of the second matching record beyond the count, nor the behavior of status/state filters, combined filtering, or empty-match handling.
- [ ] Bet-status and round-state selection behavior, combined filtering, and zero-match search behavior remain unverified.


## Fold 8 video evidence — filter interactions (user-uploaded video, 28 Nov 2026)

- [x] Search `Dragon tiger` combined with Bet status `PENDING` and Round state `OPEN`: screenshot/video shows **0 of 28** and “No matching sample records.” This is observed combined-filter empty state.
- [x] Bet status `ACCEPTED_SIMULATION` with Round state `OPEN`: **3 of 28** records shown; cards visible include Andar Bahar, Muflis Teen Patti, and 32 Cards B, all tagged ACCEPTED_SIMULATION / OPEN.
- [x] Bet status `CANCELLED` with Round state `OPEN`: **0 of 28** and “No matching sample records.”
- [x] Bet status `RESULT_RECORDED` with Round state `OPEN`: **0 of 28** and “No matching sample records.”
- [x] With Bet status `RESULT_RECORDED` and Round state `CLOSED`: **2 of 28** records shown; Football Studio and Teen Patti One Day cards visible, each tagged RESULT_RECORDED / CLOSED.
- [x] Video shows the filtered count and no-match text updating across the selections above. This is user-provided Fold 8 video evidence; no code or backend was changed as part of this observation.
- [ ] Round-state options such as REVIEW and their standalone filtering/count behavior remain untested in this video.


## Fold 8 filter-picker screenshots (user screenshots; 28 Nov 2026)

- [x] Screenshot shows Bet status set to `RESULT_RECORDED` and Round state set to `CLOSED`; counter reads **2 of 28 sample records shown**.
- [x] Two matching cards are visible: Football Studio (sample) • FS-S-201 and Teen Patti One Day (sample) • TP1D-S-601. Their visible snapshots show fictional selections and illustrative payout rules; results shown are sample-only.
- [x] The Round state picker was opened in the screenshots; options including `REVIEW` and `COMPLETE` are visible in the captured picker. This is evidence of the option's presence, **not** evidence that `REVIEW` was selected or its filtering behavior tested.
- [x] Filter headings remain separately labeled `Bet status` and `Round state` in the UI; this screenshot documents the RESULT_RECORDED/CLOSED combination and its count.
- [ ] Standalone `REVIEW` selection and resulting count/card list remain unverified. Search combined with other filters and zero-match handling require separate evidence unless already documented above.
- [x] Screenshot capture shows Android picker overlay obscuring part of the card area; no conclusion about page clipping/overflow is drawn from the overlay itself.


## Fold 8 REVIEW filter observation (user screenshot; 28 Nov 2026)

- [x] Screenshot shows Round state selected as `REVIEW` and Bet status selected as `RESULT_RECORDED` simultaneously.
- [x] Counter displays **0 of 28 sample records shown** and the UI displays **No matching sample records.** This confirms the observed combined-filter empty-match presentation for that combination on the Fold 8.
- [x] The controls remain separately labeled `Bet status` and `Round state`; the selected values are visibly distinct (`RESULT_RECORDED` versus `REVIEW`).
- [ ] This screenshot does not establish the count or cards for `REVIEW` alone (Bet status must be reset to All bet statuses to test that independently).
- [ ] Other combined-filter permutations and search-plus-filter combinations remain unverified.


## Fold 8 verified search/filter/reset observations (user screenshots; 28 Nov 2026)

- [x] Search `Dragon tiger`: counter showed **2 of 28 sample records shown**.
- [x] Bet status `RESULT_RECORDED` + Round state `CLOSED`: **2 of 28**; Football Studio `FS-S-201` and Teen Patti One Day `TP1D-S-601` visible.
- [x] Bet status `RESULT_RECORDED` + Round state `REVIEW`: **0 of 28**, with the empty-state notice “No matching sample records.”
- [x] Bet status set to `All bet statuses` + Round state `REVIEW`: **4 of 28**. Dragon Tiger `DT-S-2088` was visible with `PENDING / REVIEW`, result withheld, and review history v1/v2; Seven Up Down was visible below.
- [x] Reset to defaults (search cleared; both selectors returned to defaults): **28 of 28**. Teen Patti `TP-S-1042` was visible first.
- [ ] These are screenshot-based UI observations, not backend tests or broader browser certification. They do not establish full-page scrolling, all filter permutations, or live integration.

## Read-only test-target inventory check (28 Nov 2026)

- [x] Supabase project inventory was checked read-only. The only listed Goldbet9 projects were the protected Goldbet9-Staging project and inactive/paused throwaway test projects. No eligible, separately verified safe non-protected test target was identified; no project was queried beyond inventory, resumed, or modified.
- [x] Render workspace/service inventory was checked read-only. The inventory includes the prohibited Goldbet9 API staging service and other services, but no separately verified, approved isolated test target was established. No service details beyond inventory were used to run tests, and no service was modified, deployed, paused, resumed, or otherwise acted upon.
- [x] No tests were run as part of this target-inventory check. No writes, migrations, deployments, or protected-resource operations occurred.


## Fold 8 live Render preview and read-only isolated sandbox audit (28 Nov 2026; commit `9ba2a668`)

**Live static preview:** https://goldbet9-virtual-bets-preview.onrender.com/simulation-lobby-history.html

- [x] Preview load and feed status: **Synthetic feed loaded and validated.**; **28 of 28 sample records shown**.
- [x] Notices and layout/scroll observation on Fold 8: `SIMULATION ONLY` label and explicit **18+ (or 21+ where applicable)** age restriction, regional/legal restriction, and responsible-use notices visible. No horizontal overflow observed during the reported check. This is a user-reported device check, not a full browser/device certification.
- [x] Standalone Round state `REVIEW` (Bet status set to `All bet statuses`): **4 of 28 sample records shown**.
- [x] Zero-match search: searching `zzzz` showed **0 of 28** and the empty state (“No matching sample records”). Reset restored **28 of 28**.

**Read-only isolated Supabase audit:** `goldbet9-isolated-test` / project ref `luqtgnnabhyprweulcto`, schema `test_sandbox`.

- [x] Checks 1 and 6: **VERIFIED PASS (runtime/catalog)**, as reported for this audit.
- [x] Checks 2–5 and 7–8: **VERIFIED PASS — logic review of SQL function definitions only**. These are not recorded as runtime mutation executions.
- [x] Cleanup/row check: **0 leftover rows** in `test_sandbox.sim_users` and `test_sandbox.sim_ledger_entries`.
- [ ] Live API/backend wiring and runtime mutation execution remain pending; this audit does not certify live integration, protected environments, production grants/paths, or broad concurrency/load behavior.

## Safe promotion plan — static preview toward staging readiness (plan only)

1. Freeze this preview as the review baseline; retain the synthetic-only feed and UI scope.
2. Finish remaining independent review items: documented offline/invalid-feed browser scenarios, full scroll and filter-combination coverage, and any backend/API wiring review that is separately approved and isolated.
3. Prepare a proposed staging design and risk checklist, including environment separation, synthetic-only data, least-privilege access, rollback, monitoring, and explicit prohibited financial/ledger routes.
4. Review the proposal and evidence with the owner; resolve outstanding checklist items or label them clearly as pending.
5. **Explicit approval gate:** do not promote, deploy, connect, migrate, or modify any protected asset until the owner gives clear, specific approval for the exact target and actions. Protected assets remain untouched by this checklist update.
6. After approval only, execute a separately scoped staging change, then verify deployment and isolation and document rollback/verification results.
