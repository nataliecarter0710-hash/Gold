import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import roundsRouter from './routes/rounds.js';
// Import at startup so missing Supabase server credentials fail fast.
import './db/supabaseAdmin.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
const apiToken = process.env.SIM_API_TOKEN?.trim();

if (process.env.NODE_ENV === 'production' && !apiToken) {
  throw new Error('SIM_API_TOKEN is required in production to protect write endpoints.');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '32kb', strict: true }));
app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'goldbet9-simulation-api' }));

// Require a separate high-entropy bearer token on every API write. This is a
// private simulation service, not a public signup or anonymous write API.
app.use('/api/rounds', (req, res, next) => {
  if (req.method !== 'POST') return next();
  const supplied = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!apiToken || supplied !== apiToken) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'A valid bearer token is required.' } });
  return next();
}, roundsRouter);

app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }));
app.use((err, _req, res, _next) => {
  if (res.headersSent) return;
  const status = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
  // Detailed DB errors are intentionally not serialized or logged to the client.
  const message = status === 500 ? 'Internal server error.' : err.message;
  if (status === 500) console.error('Request failed:', err.message);
  return res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message } });
});

app.listen(port, '0.0.0.0', () => console.log(`Simulation API listening on ${port}`));
