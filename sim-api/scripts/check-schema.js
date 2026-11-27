import 'dotenv/config';
import { compareRequiredColumns, inspectSimulationSchema } from '../src/db/schemaInspection.js';

try {
  const rows = await inspectSimulationSchema();
  console.log('Read-only Goldbet9-Staging schema inspection:');
  console.table(rows);
  const issues = compareRequiredColumns(rows);
  if (issues.length) {
    for (const issue of issues) console.error(issue);
    console.error('Schema does not match the tentative service mappings. Do not enable API writes.');
    process.exitCode = 1;
  } else {
    console.log('Required columns exist. Verify types, constraints, status values, and unique indexes manually; no data or schema was changed.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
