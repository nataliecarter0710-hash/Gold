-- READ-ONLY schema inventory for Goldbet9-Staging.
-- Run in Supabase SQL Editor before enabling API writes. These SELECTs inspect
-- metadata only; they do not insert/update/delete data or change schema.
-- The supplied staging inventory named these tables; verify results rather than
-- assuming this list is exhaustive (the project inventory mentioned 11 tables).

SELECT table_schema, table_name, ordinal_position, column_name, data_type,
       udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'tenants',
    'profiles',
    'tenant_memberships',
    'platform_users',
    'virtual_coin_ledger',
    'coin_ledger',
    'game_catalog',
    'game_sessions',
    'round_settlements',
    'activity_audit'
  )
ORDER BY table_name, ordinal_position;

-- Show constraints/indexes relevant to round and ledger idempotency.
-- The current code assumes unique virtual_coin_ledger(idempotency_key) and
-- unique round_settlements(round_id, user_id); confirm actual definitions.
SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
       string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_catalog = kcu.constraint_catalog
 AND tc.constraint_schema = kcu.constraint_schema
 AND tc.constraint_name = kcu.constraint_name
 AND tc.table_name = kcu.table_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('game_sessions', 'virtual_coin_ledger', 'round_settlements')
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('game_sessions', 'virtual_coin_ledger', 'round_settlements')
ORDER BY tablename, indexname;

-- Read-only existence/signature check for the known RPC. The service deliberately
-- does not call it. Do not grant execution or invoke it as part of this preflight.
SELECT n.nspname AS routine_schema,
       p.proname AS routine_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       pg_catalog.pg_get_function_result(p.oid) AS result_type,
       p.prosecdef AS security_definer
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'transfer_virtual_coins'
ORDER BY identity_arguments;
