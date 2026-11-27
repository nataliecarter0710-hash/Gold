import pg from 'pg';
import { REQUIRED_SCHEMA_COLUMNS } from './schemaMapping.js';

/** Read-only metadata inspection. Use a least-privilege read-only DATABASE_URL. */
export async function inspectTableColumns(tableNames = Object.keys(REQUIRED_SCHEMA_COLUMNS), { schema = 'public' } = {}) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for information_schema inspection. No schema changes were made.');
  if (!Array.isArray(tableNames) || !tableNames.length || tableNames.some((name) => typeof name !== 'string')) {
    throw new TypeError('tableNames must be a non-empty array of table names.');
  }
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL_REJECT_UNAUTHORIZED === 'false' ? { rejectUnauthorized: false } : { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = ANY($2::text[])
       ORDER BY table_name, ordinal_position`,
      [schema, tableNames],
    );
    return result.rows;
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
  // Includes all four diagnostic-scope tables, from the shared mapping contract.
  return inspectTableColumns(Object.keys(REQUIRED_SCHEMA_COLUMNS));
}
