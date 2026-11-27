-- Read-only schema, constraint, and index check for Goldbet9-Staging.
-- Does NOT modify data/schema or invoke public.transfer_virtual_coins.

WITH target_tables AS (
  SELECT unnest(ARRAY[
    'game_sessions',
    'coin_ledger',
    'virtual_coin_ledger',
    'round_settlements'
  ]) AS table_name
)
SELECT
  'column' AS metadata_kind,
  c.table_name,
  LPAD(c.ordinal_position::text, 4, '0') AS sort_order,
  c.column_name AS object_name,
  c.data_type
    || ' | nullable=' || c.is_nullable
    || COALESCE(' | default=' || c.column_default, '') AS details
FROM information_schema.columns AS c
INNER JOIN target_tables AS t
  ON t.table_name = c.table_name
WHERE c.table_schema = 'public'

UNION ALL

SELECT
  'constraint' AS metadata_kind,
  rel.relname AS table_name,
  con.contype::text AS sort_order,
  con.conname AS object_name,
  pg_get_constraintdef(con.oid) AS details
FROM pg_constraint AS con
INNER JOIN pg_class AS rel
  ON rel.oid = con.conrelid
INNER JOIN pg_namespace AS nsp
  ON nsp.oid = rel.relnamespace
INNER JOIN target_tables AS t
  ON t.table_name = rel.relname
WHERE nsp.nspname = 'public'

UNION ALL

SELECT
  'index' AS metadata_kind,
  idx.tablename AS table_name,
  idx.indexname AS sort_order,
  idx.indexname AS object_name,
  idx.indexdef AS details
FROM pg_indexes AS idx
INNER JOIN target_tables AS t
  ON t.table_name = idx.tablename
WHERE idx.schemaname = 'public'

ORDER BY
  table_name,
  metadata_kind,
  sort_order,
  object_name;
