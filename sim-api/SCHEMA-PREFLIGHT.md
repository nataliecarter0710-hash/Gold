# Schema and secret preflight

This document records what commit `a03d1cbc5f24b396da0730cf233945e4f1cafe75` added under `sim-api/`. No live Goldbet9-Staging connection or schema output was available during this review, so deployed columns and constraints remain **unverified**. Do not enable write calls until the checklist below is complete.

## Commit/file security inspection

Inspected all 11 files in the commit: `.env.example`, `.gitignore`, `README.md`, `package.json`, `scripts/check-schema.js`, `sql/schema-idempotency-check.sql`, `src/db/schemaInspection.js`, `src/db/supabaseAdmin.js`, `src/routes/rounds.js`, `src/server.js`, and `src/services/roundEngine.js`.

- No actual Supabase key, bearer token, database password/URL credential, or other live secret was found in the committed content. `.env.example` contains blank credential variables and the non-secret placeholder `https://YOUR_PROJECT_REF.supabase.co`.
- No `.env` file was added by this commit. `sim-api/.gitignore` ignores `.env` and `.env.*` while allowing `.env.example`.
- This check covers the files in the specified commit, not a scan of all repository history or external Render settings. If a secret was ever committed elsewhere, rotate it even if later removed.

## Names referenced by the backend

### Application tables / mapped columns

The new round engine directly accesses these three tables. Every listed column is a **proposed mapping** in `src/services/roundEngine.js`, not confirmed live schema:

| Table | Columns referenced or expected by the code |
| --- | --- |
| `public.game_sessions` | `id`, `tenant_id`, `user_id`, `game_id`, `status`, `stake_amount` |
| `public.virtual_coin_ledger` | `id`, `tenant_id`, `user_id`, `round_id`, `amount`, `entry_type`, `idempotency_key`, `created_at` (the last three include fields documented in the schema contract; writes/readback directly use `tenant_id`, `user_id`, `round_id`, `amount`, `entry_type`, `idempotency_key`) |
| `public.round_settlements` | `id`, `round_id`, `user_id`, `payout_amount`, `created_at` (the code writes/filters `round_id`, `user_id`, `payout_amount`; the others are documented expected fields) |

Additional database metadata used by inspection SQL/scripts: `information_schema.columns`, `information_schema.table_constraints`, `information_schema.key_column_usage`, `pg_catalog.pg_indexes` / `pg_indexes`, `pg_catalog.pg_proc`, and `pg_catalog.pg_namespace`. These are PostgreSQL catalog views/tables, not application tables.

### Known project objects mentioned but not used by application operations

- RPC: `public.transfer_virtual_coins` is mentioned in comments/docs and is **not called** by the service.
- `coin_ledger` and `game_catalog` are not referenced in the committed backend operations or mappings. The schema inventory script includes them (and the other supplied known table names) for comparison only.
- Supplied known application table names listed in the inventory query: `tenants`, `profiles`, `tenant_memberships`, `platform_users`, `virtual_coin_ledger`, `coin_ledger`, `game_catalog`, `game_sessions`, `round_settlements`, `activity_audit`. The prompt says 11 tables but enumerates 10 names; the missing table name was not supplied, so this query does not guess it. Add it to the inspection query after confirming its name.

## Assumptions / potential mismatches to resolve

1. Exact table columns and types are unknown. Verify every mapping above, including UUID versus other ID types, `amount` integer/numeric type, nullability, defaults, and generated IDs/timestamps.
2. Round creation assumes `game_sessions` accepts `tenant_id`, `user_id`, `game_id`, `status='in_progress'`, and `stake_amount`. Confirm actual status enum/check values and whether creation also requires fields such as session metadata, currency/unit, or timestamps.
3. Ledger insert assumes `virtual_coin_ledger` has `tenant_id`, `user_id`, `round_id`, `amount`, `entry_type`, and `idempotency_key`; amount sign convention and allowed `entry_type` values (`round_stake`, `round_payout`) must be verified. No `coin_ledger` writes are performed.
4. Settlement assumes `round_settlements(round_id,user_id,payout_amount)` is a valid insert and that those IDs identify the same round/user. Confirm whether it also requires tenant/game/result fields or whether payout is named differently.
5. Idempotency is not guaranteed by application checks alone. Confirm unique coverage exactly for `virtual_coin_ledger(idempotency_key)` and `round_settlements(round_id,user_id)`. Review existing rows/indexes before any schema change; do not add constraints blindly.
6. Settlement uses separate Supabase REST operations (ledger insert, settlement insert, status update), not one transaction. A partial failure is possible; the code comments already call out this limitation. Do not use for concurrent/high-stakes behavior; this is virtual-only educational simulation.
7. The API accepts tenant/user UUIDs from the caller and uses one server bearer token; confirm this is suitable for the private staging test environment. Do not expose the server secret or shared API token to browser code.
8. The service does not check or call `public.transfer_virtual_coins`. Keep that RPC server-side and out of client mutation flows; inspect its signature/privileges separately if the service design ever changes.

## Before any live round, ledger, or settlement call

1. Select the `Goldbet9-Staging` project explicitly and run `scripts/check-schema-columns.sql` in read-only mode. Save its output for review. The SQL performs only metadata `SELECT`s; it does not change schema or application rows.
2. Compare actual columns, types, nullability, defaults, constraints, and indexes with `DB_SCHEMA` and all assumptions above. Update the service mappings only on `feat/sim-api-staging` if the deployed schema differs.
3. Confirm required unique constraints for ledger idempotency and settlement uniqueness, and verify any foreign keys/tenant scoping. Do not run a migration or alter existing data as part of this check.
4. Confirm the valid session status values and ledger entry types/sign convention. Confirm the payout and stake representation is integer virtual coins only.
5. Use a dedicated test tenant, test learner, and game record, with authorization to test. Record current rows/balances before the test and verify only expected staging virtual-coin records afterward.
6. Configure secrets only in local ignored `.env` or the new Render Web Service's secret environment variables; never commit them. Do not edit or redeploy existing static Render sites.
7. Test a single round, repeat the same ledger idempotency key and settlement request to verify deduplication, and verify final records. Stop if schema output differs from assumptions or any unexpected row/balance change occurs.
