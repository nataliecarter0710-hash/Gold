# Pre-Launch Readiness Checklist (`feat/virtual-bets-staging`)

Scope: Simulation and synthetic sample data only. No real wagering, real funds, balance debits, or payouts.
Protected assets (must remain untouched): `Index.htm`, `Goldbet9-Staging` (`qoasttmttjiwjvmznoir`), paused throwaway Supabase projects, Render services, `main`, `feat/sim-api-staging`, and `public.transfer_virtual_coins`.

## 1. Phone and Foldable Visual Verification
- [ ] Open `simulation-lobby-history.html` on mobile in both folded and unfolded states.
- [ ] Confirm zero horizontal overflow and zero text or ID clipping across round cards, status badges, and snapshot boxes.
- [ ] Verify status badges wrap cleanly and snapshot fields stack readably on narrow screens.
- [ ] Check search input, `Bet status` filter, `Round state` filter, and result count (`X of Y sample records shown`) for legibility and accurate filtering.
- [ ] Verify `REVIEW` version history displays clearly and keeps `REVIEW` as a round state rather than a bet status.
- [ ] Confirm obsidian/gold contrast and visible simulation, age-restriction, regional-restriction, and responsible-use notices.

## 2. Read-Only / Simulation Backend and API Wiring
- [ ] Keep data source strictly on the synthetic feed (`simulation-feed.json`) or an isolated simulation-only read endpoint with synthetic fixtures.
- [ ] Verify clean fallback to embedded synthetic sample records when the feed is offline, unreachable, or fails synthetic validation.
- [ ] Confirm zero calls or references to `public.transfer_virtual_coins`, live ledgers, or real balance mutation paths.
- [ ] Keep `Goldbet9-Staging`, Render services, `main`, and `feat/sim-api-staging` disconnected from this prototype.

## 3. Full RLS, Idempotency, and Concurrency Verification
- [ ] Confirm cross-user read isolation under restricted database roles (User A cannot read User B's records and vice versa).
- [ ] Confirm `anon` access is denied on protected records.
- [ ] Confirm direct client `INSERT`, `UPDATE`, and `DELETE` are blocked under restricted roles.
- [ ] Verify idempotency across new keys, same-user/same-key/same-payload reuse, same-user/same-key/changed-payload conflict rejection, and per-user key isolation.
- [ ] Plan and run broader multi-user and concurrency checks beyond initial simultaneous probes before treating security verification as complete.

## 4. Release and Compliance Notices
- [ ] Keep clear simulation/virtual-coin labels visible on lobby and history screens.
- [ ] Keep age-restriction, regional-restriction, and responsible-use notices present and legible.
- [ ] Verify `Index.htm`, `Goldbet9-Staging`, Render, `main`, and `feat/sim-api-staging` remain untouched until an explicit promotion step is approved.
