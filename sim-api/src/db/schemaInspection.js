import pg from 'pg';
import { DIAGNOSTIC_TABLES, REQUIRED_SCHEMA_COLUMNS } from './schemaMapping.js';

const APPROVED = new Set(DIAGNOSTIC_TABLES);
const WRITE_PRIVILEGES = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];

export async function inspectTableColumns(tableNames = DIAGNOSTIC_TABLES, { schema = 'public' } = {}) {
  if (process.env.DIAGNOSTIC_DB_ENABLED !== 'true') throw new Error('Diagnostic database inspection is disabled.');
  const connectionString = process.env.DIAGNOSTIC_READONLY_DATABASE_URL;
  if (!connectionString) throw new Error('A dedicated diagnostic read-only connection is required.');
  if (schema !== 'public' || !Array.isArray(tableNames) || !tableNames.length
    || tableNames.some((name) => typeof name !== 'string' || !APPROVED.has(name))
    || new Set(tableNames).size !== tableNames.length) {
    throw new Error('Only approved diagnostic tables in the public schema may be inspected.');
  }
  let parsed;
  try {
    parsed = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error();
    const username = decodeURIComponent(parsed.username || '');
    if (!username || /^(postgres|service_role|supabase_admin|admin|root)$/i.test(username)) throw new Error();
  } catch {
    throw new Error('Diagnostic connection configuration is invalid.');
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const safety = await client.query(`SELECT current_user AS role_name,
      current_setting('transaction_read_only') AS transaction_read_only,
      r.rolcanlogin, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolbypassrls, r.rolinherit,
      NOT EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member = r.oid) AS no_memberships,
      has_database_privilege(current_user, current_database(), 'CREATE') AS db_create,
      has_database_privilege(current_user, current_database(), 'TEMP') AS db_temp,
      has_schema_privilege(current_user, $1, 'CREATE') AS schema_create,
      COALESCE(bool_or(has_table_privilege(current_user, format('%I.%I', $1, t), p)), false) AS table_write,
      COALESCE(bool_and(has_table_privilege(current_user, format('%I.%I', $1, t), 'SELECT')), false) AS target_select,
      EXISTS (SELECT 1 FROM information_schema.tables x WHERE x.table_schema=$1
        AND x.table_name NOT IN (SELECT unnest($2::text[]))
        AND (has_table_privilege(current_user, format('%I.%I', x.table_schema, x.table_name), 'SELECT')
          OR has_table_privilege(current_user, format('%I.%I', x.table_schema, x.table_name), 'INSERT')
          OR has_table_privilege(current_user, format('%I.%I', x.table_schema, x.table_name), 'UPDATE')
          OR has_table_privilege(current_user, format('%I.%I', x.table_schema, x.table_name), 'DELETE')
          OR has_table_privilege(current_user, format('%I.%I', x.table_schema, x.table_name), 'TRUNCATE'))) AS other_table_access,
      EXISTS (SELECT 1 FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace
        WHERE n.nspname=$1 AND has_function_privilege(current_user, f.oid, 'EXECUTE')) AS function_execute
      FROM pg_roles r CROSS JOIN unnest($2::text[]) AS t CROSS JOIN unnest($3::text[]) AS p
      WHERE r.rolname=current_user
      GROUP BY r.oid, r.rolname, r.rolcanlogin, r.rolsuper, r.rolcreaterole, r.rolcreatedb,
        r.rolbypassrls, r.rolinherit, current_setting('transaction_read_only')`,
      [schema, tableNames, WRITE_PRIVILEGES]);
    const v = safety.rows[0];
    if (!v || v.role_name !== decodeURIComponent(parsed.username)
      || v.transaction_read_only !== 'on' || v.rolcanlogin !== true
      || v.rolsuper !== false || v.rolcreaterole !== false || v.rolcreatedb !== false
      || v.rolbypassrls !== false || v.rolinherit !== false || v.no_memberships !== true
      || v.db_create !== false || v.db_temp !== false || v.schema_create !== false
      || v.table_write !== false || v.target_select !== true
      || v.other_table_access !== false || v.function_execute !== false) {
      throw new Error('Database role or transaction failed read-only verification.');
    }
    const result = await client.query(`SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns WHERE table_schema=$1 AND table_name=ANY($2::text[])
      ORDER BY table_name, ordinal_position`, [schema, tableNames]);
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
export async function inspectSimulationSchema() { return inspectTableColumns(DIAGNOSTIC_TABLES); }
