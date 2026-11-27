import { supabaseAdmin } from '../db/supabaseAdmin.js';
import { DB_SCHEMA } from '../db/schemaMapping.js';

/**
 * Requires the mappings and constraints in schemaMapping.js to be checked against
 * Goldbet9-Staging first. All amounts are integer virtual coins. No currency,
 * payment, deposit, withdrawal, or public signup behavior exists here.
 *
 * Required database uniqueness: virtual_coin_ledger(idempotency_key) and
 * round_settlements(round_id,user_id). REST requests below are not one transaction;
 * this implementation is retry-safe for expected partial failures, but not atomic.
 * A reviewed transactional RPC would be required for strict all-or-nothing behavior.
 * public.transfer_virtual_coins is deliberately never called by this service.
 */
export { DB_SCHEMA };
const { rounds: R, ledger: L, settlements: S } = DB_SCHEMA;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalid = (message) => Object.assign(new TypeError(message), { statusCode: 400 });
const requireUuid = (value, label) => {
  if (typeof value !== 'string' || !UUID.test(value)) throw invalid(`${label} must be a UUID.`);
};
const requireAmount = (value, label, { allowZero = true } = {}) => {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) throw invalid(`${label} must be a ${allowZero ? 'non-negative' : 'positive'} safe integer in virtual coins.`);
};
const throwDb = (error, operation) => {
  if (!error) return;
  const wrapped = new Error(`Database operation failed: ${operation}`);
  wrapped.cause = error;
  wrapped.code = error.code;
  throw wrapped;
};
const loadRound = async (roundId) => {
  const { data, error } = await supabaseAdmin.from(R.table).select('*').eq(R.id, roundId).maybeSingle();
  throwDb(error, 'load round');
  if (!data) { const e = new Error('Round not found.'); e.statusCode = 404; throw e; }
  return data;
};
const assertRoundOwner = (round, { tenantId, userId }) => {
  if (round[R.tenantId] !== tenantId || round[R.userId] !== userId) {
    const e = new Error('Round does not belong to the supplied tenant and user.'); e.statusCode = 409; throw e;
  }
};
const setRoundSettled = async (roundId) => {
  const { error } = await supabaseAdmin.from(R.table).update({ [R.status]: R.settledStatus }).eq(R.id, roundId);
  throwDb(error, 'mark round settled');
};

export async function createRound({ tenantId, userId, gameId, stakeAmount = 0 }) {
  requireUuid(tenantId, 'tenantId'); requireUuid(userId, 'userId'); requireUuid(gameId, 'gameId');
  requireAmount(stakeAmount, 'stakeAmount');
  const { data, error } = await supabaseAdmin.from(R.table).insert({
    [R.tenantId]: tenantId, [R.userId]: userId, [R.gameId]: gameId,
    [R.status]: R.openStatus, [R.stake]: stakeAmount,
  }).select('*').single();
  throwDb(error, 'create round');
  return data;
}

/**
 * Insert one ledger event per idempotency key. A 23505 is treated as a retry only
 * when the same key can be read back and its entire payload matches; unrelated
 * unique violations are not hidden.
 */
export async function recordCoinLedgerEntry({ tenantId, userId, roundId, amount, entryType, idempotencyKey }) {
  requireUuid(tenantId, 'tenantId'); requireUuid(userId, 'userId'); requireUuid(roundId, 'roundId');
  if (!Number.isSafeInteger(amount) || amount === 0) throw invalid('amount must be a non-zero safe integer in virtual coins.');
  if (typeof entryType !== 'string' || !/^[a-z][a-z0-9_]{1,39}$/.test(entryType)) throw invalid('entryType must be 2-40 lowercase letters, digits, or underscores.');
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 128) throw invalid('idempotencyKey must be 8-128 characters.');

  const round = await loadRound(roundId);
  assertRoundOwner(round, { tenantId, userId });
  if (round[R.status] === R.settledStatus) { const e = new Error('Cannot add a ledger entry to a settled round.'); e.statusCode = 409; throw e; }

  const payload = {
    [L.tenantId]: tenantId, [L.userId]: userId, [L.roundId]: roundId,
    [L.amount]: amount, [L.type]: entryType, [L.idempotencyKey]: idempotencyKey,
  };
  const { data, error } = await supabaseAdmin.from(L.table).insert(payload).select('*').single();
  if (!error) return { entry: data, deduplicated: false };
  if (error.code !== '23505') throwDb(error, 'record virtual coin ledger entry');

  const { data: existing, error: readError } = await supabaseAdmin.from(L.table)
    .select('*').eq(L.idempotencyKey, idempotencyKey).maybeSingle();
  throwDb(readError, 'read duplicate virtual coin ledger entry');
  if (!existing) throwDb(error, 'ledger unique conflict without matching idempotency row');
  const matches = existing[L.tenantId] === tenantId && existing[L.userId] === userId &&
    existing[L.roundId] === roundId && Number(existing[L.amount]) === amount && existing[L.type] === entryType;
  if (!matches) { const e = new Error('Idempotency key is already associated with a different ledger payload.'); e.statusCode = 409; throw e; }
  return { entry: existing, deduplicated: true };
}

export async function settleRoundIdempotent({ roundId, tenantId, userId, payoutAmount }) {
  requireUuid(roundId, 'roundId'); requireUuid(tenantId, 'tenantId'); requireUuid(userId, 'userId');
  requireAmount(payoutAmount, 'payoutAmount');
  const round = await loadRound(roundId);
  assertRoundOwner(round, { tenantId, userId });

  const { data: prior, error: priorError } = await supabaseAdmin.from(S.table)
    .select('*').eq(S.roundId, roundId).eq(S.userId, userId).maybeSingle();
  throwDb(priorError, 'check existing settlement');
  if (prior) {
    if (Number(prior[S.payout]) !== payoutAmount) { const e = new Error('Round has already been settled with a different payout.'); e.statusCode = 409; throw e; }
    // Recover status if a previous request inserted settlement but failed before status update.
    if (round[R.status] !== R.settledStatus) await setRoundSettled(roundId);
    return { settlement: prior, deduplicated: true };
  }
  if (round[R.status] === R.settledStatus) { const e = new Error('Round is marked settled but has no matching settlement row; manual review is required.'); e.statusCode = 409; throw e; }

  if (payoutAmount > 0) {
    await recordCoinLedgerEntry({ tenantId, userId, roundId, amount: payoutAmount, entryType: 'round_payout', idempotencyKey: `round:${roundId}:payout:${userId}` });
  }

  const { data: settlement, error: settlementError } = await supabaseAdmin.from(S.table).insert({
    [S.roundId]: roundId, [S.userId]: userId, [S.payout]: payoutAmount,
  }).select('*').single();
  if (settlementError?.code === '23505') {
    const { data: concurrent, error: readError } = await supabaseAdmin.from(S.table)
      .select('*').eq(S.roundId, roundId).eq(S.userId, userId).maybeSingle();
    throwDb(readError, 'read concurrent settlement');
    if (concurrent && Number(concurrent[S.payout]) === payoutAmount) {
      await setRoundSettled(roundId);
      return { settlement: concurrent, deduplicated: true };
    }
    if (concurrent) { const e = new Error('Concurrent settlement used a different payout.'); e.statusCode = 409; throw e; }
    throwDb(settlementError, 'settlement unique conflict without matching settlement row');
  }
  throwDb(settlementError, 'insert round settlement');
  await setRoundSettled(roundId);
  return { settlement, deduplicated: false };
}
