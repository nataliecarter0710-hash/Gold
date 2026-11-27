import 'dotenv/config';
import { inspectSimulationSchema } from '../src/db/schemaInspection.js';

try {
  const rows = await inspectSimulationSchema();
  if (rows.length === 0) {
    console.error('No expected public tables/columns found. Check DATABASE_URL and schema/table names.');
    process.exitCode = 1;
  } else {
    console.log('Read-only information_schema.columns results (verify against DB_SCHEMA in src/services/roundEngine.js):');
    console.table(rows);
    const found = new Set(rows.map((row) => row.table_name));
    for (const table of ['game_sessions', 'virtual_coin_ledger', 'round_settlements']) {
      if (!found.has(table)) console.warn(`MISSING TABLE: public.${table}`);
    }
    console.log('No DDL or application data was changed.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
