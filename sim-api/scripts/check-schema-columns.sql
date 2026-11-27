-- READ-ONLY metadata inspection for Goldbet9-Staging; no DDL or application
-- data changes are performed. The column assumptions in the app are unverified.
-- Review the output before considering any operational database integration.

-- Columns/types/defaults for the four-table diagnostic scope.
SELECT table_schema, table_name, ordinal_position, column_name, data_type,
       udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('game_sessions', 'coin_ledger', 'virtual_coin_ledger', 'round_settlements')
ORDER BY table_name, ordinal_position;

-- Constraints and participating columns for the same four tables.
SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
       string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_catalog = kcu.constraint_catalog
 AND tc.constraint_schema = kcu.constraint_schema
 AND tc.constraint_name = kcu.constraint_name
 AND tc.table_name = kcu.table_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('game_sessions', 'coin_ledger', 'virtual_coin_ledger', 'round_settlements')
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY', 'CHECK')
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Index definitions for the same four tables (including any unique idempotency
-- or settlement indexes). This query reads PostgreSQL catalog metadata only.
SELECT schemaname, tablename, indexname, indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('game_sessions', 'coin_ledger', 'virtual_coin_ledger', 'round_settlements')
ORDER BY tablename, indexname;
