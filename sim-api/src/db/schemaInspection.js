import pg from 'pg';
import { DIAGNOSTIC_TABLES, REQUIRED_SCHEMA_COLUMNS } from './schemaMapping.js';

const WRITE_PRIVILEGES = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
const FORBIDDEN_ROLE_NAMES = /^(postgres|service_role|supabase_admin|admin|root)$/i;

/**
 * Requires an explicitly enabled diagnostic connection and a separately named
 * read-only credential. The database transaction is forced read-only and role
 * attributes/table privileges are checked before metadata is returned.
 */
export async function inspectTableColumns(tableNames = DIAGNOSTIC_TABLES, { schema = 'public' } = {}) {
  if (process.env.DIAGNOSTIC_DB_ENABLED !== 'true') throw new Error('Diagnostic database inspection is disabled.');
  const connectionString = process.env.DIAGNOSTIC_READONLY_DATABASE_URL;
  if (!connectionString) throw new Error('A dedicated diagnostic read-only connection is required.');
  if (!Array.isArray(tableNames) || !tableNames.length || tableNames.some((name) => typeof name !== 'string')) {
    throw new TypeError('tableNames must be a non-empty array of table names.');
  }
  let parsed;
  try {
    parsed = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('Unsupported database protocol.');
    if (FORBIDDEN_ROLE_NAMES.test(decodeURIComponent(parsed.username || ''))) {
      throw new Error('A privileged database role is not permitted for diagnostics.');
    }
  } catch (error) {
    if (error.message === 'A privileged database role is not permitted for diagnostics.') throw error;
    throw new Error('Diagnostic connection configuration is invalid.');
  }

  const client = new pg.Client({
    connectionString,
    ssl: process.env.PGSSL_REJECT_UNAUTHORIZED === 'false' ? { rejectUnauthorized: false } : { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  });
  try {
    await client.connect();
    // Start read-only atomically; any inability to enforce this aborts inspection.
    await client.query('BEGIN READ ONLY');
    const safety = await client.query(`SELECT current_user AS role_name,
      current_setting('transaction_read_only') AS transaction_read_only,
      r.rolsuper, r.rolcreaterole, r.rolcreatedb,
      COALESCE(bool_or(has_table_privilege(current_user, format('%I.%I', $1, t), p)), false) AS has_write_privilege
      FROM pg_roles r
      CROSS JOIN unnest($2::text[]) AS t
      CROSS JOIN unnest($3::text[]) AS p
      WHERE r.rolname = current_user
      GROUP BY r.rolname, r.rolsuper, r.rolcreaterole, r.rolcreatedb, current_setting('transaction_read_only')`,
      [schema, tableNames, WRITE_PRIVILEGES]);
    const verified = safety.rows[0];
    if (!verified
      || typeof verified.role_name !== 'string'
      || verified.transaction_read_only !== 'on'
      || verified.rolsuper !== false
      || verified.rolcreaterole !== false
      || verified.rolcreatedb !== false
      || verified.has_write_privilege !== false) {
      throw new Error('Database role or transaction failed read-only verification.');
    }
    const result = await client.query(
      `SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = ANY($2::text[])
       ORDER BY table_name, ordinal_position`,
      [schema, tableNames],
    );
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

export function compareRequiredColumns(rows, required = REQUIRED_SCHEMA_COLUMNS) {
  const actual = new Map();
  for (const row of rows) {
    if (!actual.has(row.table_name)) actual.set(row.table_name, new Set());
    actual.get(row.table_name).add(row.column_name);
  }
  return Object.entries(required).flatMap(([table, columns]) => {
    const found = actual.get(table);
    return [
      ...(!found ? [`Missing table: public.${table}`] : []),
      ...(found ? columns.filter((column) => !found.has(column)).map((column) => `Missing column: public.${table}.${column}`) : []),
    ];
  });
}

export async function inspectSimulationSchema() {
  return inspectTableColumns(DIAGNOSTIC_TABLES);
}
