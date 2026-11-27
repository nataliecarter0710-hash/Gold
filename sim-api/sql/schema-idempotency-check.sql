-- READ-ONLY preflight for Goldbet9-Staging. Run in Supabase SQL Editor to inspect,
-- not migrate. It reports columns and unique constraints/indexes relevant to the
-- service. Compare output to DB_SCHEMA in src/services/roundEngine.js before any
-- write test. This script makes no changes to existing data or schema.

SELECT table_schema, table_name, ordinal_position, column_name, data_type,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('game_sessions', 'virtual_coin_ledger', 'round_settlements')
ORDER BY table_name, ordinal_position;

SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
       string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_catalog = kcu.constraint_catalog
 AND tc.constraint_schema = kcu.constraint_schema
 AND tc.constraint_name = kcu.constraint_name
 AND tc.table_name = kcu.table_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('game_sessions', 'virtual_coin_ledger', 'round_settlements')
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Idempotency requirement checks. Expected unique coverage:
--   virtual_coin_ledger(idempotency_key)
--   round_settlements(round_id, user_id)
-- Confirm these columns exist and that unique constraints cover the exact fields.
SELECT indexrelid::regclass AS index_name, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('virtual_coin_ledger', 'round_settlements')
ORDER BY tablename, indexname;
