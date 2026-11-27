import 'dotenv/config';
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { getSchemaReport } from './diagnostics/schema-report.js';

// Diagnostic-only process. Intentionally does not import operational round routes,
// the Supabase admin client, or any ledger/transfer/settlement implementation.
const app = express();
const port = Number(process.env.PORT || 3000);
const diagnosticToken = process.env.DIAGNOSTIC_TOKEN || '';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
app.disable('x-powered-by');
app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'goldbet9-schema-diagnostic', mode: 'read-only' }));
app.get('/api/diagnostics/schema', async (req, res) => {
  if (!diagnosticToken) return res.status(503).json({ error: { code: 'DIAGNOSTICS_DISABLED', message: 'Schema diagnostics are not configured.' } });
  const supplied = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  const expectedBuffer = Buffer.from(diagnosticToken);
  const suppliedBuffer = Buffer.from(supplied);
  const authorized = expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
  if (!authorized) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'A valid diagnostic bearer token is required.' } });
  try {
    return res.status(200).json(await getSchemaReport());
  } catch {
    // Never return database connection errors/details from a diagnostic endpoint.
    return res.status(503).json({ error: { code: 'SCHEMA_UNAVAILABLE', message: 'Read-only schema inspection is unavailable.' } });
  }
});
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }));
app.listen(port, '0.0.0.0', () => console.log(`Read-only diagnostic service listening on ${port}`));
