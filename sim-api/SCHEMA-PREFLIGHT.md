# Schema and secret preflight

## Current mappings and uncertainty

`src/db/schemaMapping.js` is the sole proposed mapping contract used by the engine and read-only schema checker. Exact live definitions were not supplied or queried, so the names remain **unverified assumptions** until the read-only preflight is run.

| Table | Proposed mapped columns | Usage |
|---|---|---|
| `public.game_sessions` | `id`, `tenant_id`, `user_id`, `game_id`, `status`, `stake_amount` | create/load/update round |
| `public.virtual_coin_ledger` | `id`, `tenant_id`, `user_id`, `round_id`, `amount`, `entry_type`, `idempotency_key`, `created_at` | insert and dedupe virtual coin entries |
| `public.round_settlements` | `id`, `round_id`, `user_id`, `payout_amount`, `created_at` | settlement insert/readback |

`coin_ledger` and `game_catalog` are not used in mutations; only `virtual_coin_ledger` is selected by this implementation. Known RPC `public.transfer_virtual_coins` is not called and is not exposed as a route. Project inventory supplied 10 application table names despite the note saying 11; this code does not guess the omitted name.

## Pre-write checklist

1. Run `scripts/check-schema-columns.sql` against the explicitly selected Goldbet9-Staging project. Or use a least-privilege read-only connection and `npm run schema:check`; the script only reads `information_schema.columns`.
2. Compare actual columns and types with `src/db/schemaMapping.js`. Confirm IDs, amount integer/precision, nullability, defaults/generated fields, and whether inserts need extra required columns.
3. Confirm `game_sessions.status` allows `in_progress` and `settled`; confirm how `stake_amount` relates to a separate stake ledger event.
4. Confirm virtual-coin sign convention and allowed `entry_type` values. Required unique index/constraint: `virtual_coin_ledger(idempotency_key)`.
5. Required settlement uniqueness: `round_settlements(round_id,user_id)`. Check FKs and tenant/user relationships. No DDL is supplied or run by this service.
6. Use disposable staging-only tenant/user/game IDs. Keep server secrets and `SIM_API_TOKEN` in environment settings, not repository or browser code.
7. Test a single round and exact repeat of ledger key and settlement payload. Verify one logical ledger row, one settlement, settled status. Remember REST requests are non-transactional.
8. Never invoke `public.transfer_virtual_coins` via a public client route; the service deliberately leaves it unused.
