import { Router } from 'express';
import { createRound, recordCoinLedgerEntry, settleRoundIdempotent } from '../services/roundEngine.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const requireBody = (body, fields) => {
  if (!isObject(body)) throw Object.assign(new TypeError('Request body must be a JSON object.'), { statusCode: 400 });
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null) throw Object.assign(new TypeError(`Missing required field: ${field}.`), { statusCode: 400 });
  }
};
const checkUuid = (value, label) => {
  if (typeof value !== 'string' || !UUID.test(value)) throw Object.assign(new TypeError(`${label} must be a UUID.`), { statusCode: 400 });
};
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post('/', asyncRoute(async (req, res) => {
  requireBody(req.body, ['tenantId', 'userId', 'gameId']);
  for (const key of ['tenantId', 'userId', 'gameId']) checkUuid(req.body[key], key);
  if (req.body.stakeAmount !== undefined && (!Number.isSafeInteger(req.body.stakeAmount) || req.body.stakeAmount < 0)) {
    throw Object.assign(new TypeError('stakeAmount must be a non-negative integer.'), { statusCode: 400 });
  }
  const round = await createRound(req.body);
  res.status(201).json({ round });
}));

router.post('/:roundId/entries', asyncRoute(async (req, res) => {
  checkUuid(req.params.roundId, 'roundId');
  requireBody(req.body, ['tenantId', 'userId', 'amount', 'entryType', 'idempotencyKey']);
  checkUuid(req.body.tenantId, 'tenantId');
  checkUuid(req.body.userId, 'userId');
  if (!Number.isSafeInteger(req.body.amount) || req.body.amount === 0) throw Object.assign(new TypeError('amount must be a non-zero integer in virtual coins.'), { statusCode: 400 });
  const result = await recordCoinLedgerEntry({ ...req.body, roundId: req.params.roundId });
  res.status(result.deduplicated ? 200 : 201).json(result);
}));

router.post('/:roundId/settle', asyncRoute(async (req, res) => {
  checkUuid(req.params.roundId, 'roundId');
  requireBody(req.body, ['tenantId', 'userId', 'payoutAmount']);
  checkUuid(req.body.tenantId, 'tenantId');
  checkUuid(req.body.userId, 'userId');
  if (!Number.isSafeInteger(req.body.payoutAmount) || req.body.payoutAmount < 0) throw Object.assign(new TypeError('payoutAmount must be a non-negative integer in virtual coins.'), { statusCode: 400 });
  const result = await settleRoundIdempotent({ ...req.body, roundId: req.params.roundId });
  res.status(result.deduplicated ? 200 : 201).json(result);
}));

export default router;
