import { compareRequiredColumns, inspectSimulationSchema } from '../db/schemaInspection.js';

/**
 * Safe, read-only metadata report. Returns column names/types and missing expected
 * columns only; never returns row data, connection details, secrets, or balances.
 */
export async function getSchemaReport() {
  const rows = await inspectSimulationSchema();
  return {
    mode: 'read-only-schema-diagnostic',
    schema: 'public',
    tables: rows.map(({ table_name, column_name, data_type, udt_name, is_nullable }) => ({
      table: table_name,
      column: column_name,
      dataType: data_type,
      underlyingType: udt_name,
      nullable: is_nullable === 'YES',
    })),
    mappingIssues: compareRequiredColumns(rows),
    writesEnabled: false,
  };
}
