import pg from 'pg';

/**
 * Read-only schema inspection helper. Requires DATABASE_URL and a PostgreSQL role
 * permitted to read information_schema; it never executes DDL or data mutations.
 */
export async function inspectTableColumns(tableNames, { schema = 'public' } = {}) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for information_schema inspection. No schema changes were made.');
  }
  if (!Array.isArray(tableNames) || tableNames.length === 0 || tableNames.some((name) => typeof name !== 'string')) {
    throw new TypeError('tableNames must be a non-empty array of table names.');
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL_REJECT_UNAUTHORIZED === 'false'
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
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

export async function inspectSimulationSchema() {
  return inspectTableColumns(['game_sessions', 'virtual_coin_ledger', 'round_settlements']);
}
