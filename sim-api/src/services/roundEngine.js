import { supabaseAdmin } from '../db/supabaseAdmin.js';

/**
 * SCHEMA CONTRACT TO VERIFY BEFORE ANY LIVE WRITE:
 *
 * The exact Goldbet9-Staging column definitions have not been supplied. These are
 * proposed mappings, not claims about the deployed schema. Compare them with
 * information_schema using `npm run schema:check` and adjust these mappings and
 * this service before enabling write traffic. Never run migrations blindly.
 *
 * game_sessions: id, tenant_id, user_id, game_id, status, stake_amount
 * virtual_coin_ledger: id, tenant_id, user_id, round_id, amount, entry_type,
 *   idempotency_key (unique), created_at
 * round_settlements: id, round_id, user_id, payout_amount, created_at;
 *   unique(round_id, user_id)
 *
 * Keep values in virtual coins (integer units), not currency. The known
 * public.transfer_virtual_coins RPC is intentionally not called by this service.
 */
export const DB_SCHEMA = Object.freeze({
  rounds: {
    table: 'game_sessions',
    id: 'id', tenantId: 'tenant_id', userId: 'user_id', gameId: 'game_id',
    status: 'status', stake: 'stake_amount',
    openStatus: 'in_progress', settledStatus: 'settled',
  },
  ledger: {
    table: 'virtual_coin_ledger',
    id: 'id', tenantId: 'tenant_id', userId: 'user_id', roundId: 'round_id',
    amount: 'amount', type: 'entry_type', idempotencyKey: 'idempotency_key',
    createdAt: 'created_at',
  },
  settlements: {
    table: 'round_settlements',
    id: 'id', roundId: 'round_id', userId: 'user_id', payout: 'payout_amount',
    createdAt: 'created_at',
  },
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requireUuid = (value, label) => {
  if (typeof value !== 'string' || !UUID.test(value)) throw new TypeError(`${label} must be a UUID.`);
  return value;
};
const requireAmount = (value, label, { allowZero = true } = {}) => {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new TypeError(`${label} must be a ${allowZero ? 'non-negative' : 'positive'} safe integer in virtual coins.`);
  }
  return value;
};
const throwDb = (error, operation) => {
  if (error) {
    const wrapped = new Error(`Database operation failed: ${operation}`);
    wrapped.cause = error;
    wrapped.code = error.code;
    throw wrapped;
  }
};
const insertReturning = async (table, payload, operation) => {
  const { data, error } = await supabaseAdmin.from(table).insert(payload).select('*').single();
  throwDb(error, operation);
  return data;
};

/** Create a game session. Does not debit stake; record that separately as an entry. */
export async function createRound({ tenantId, userId, gameId, stakeAmount = 0 }) {
  requireUuid(tenantId, 'tenantId');
  requireUuid(userId, 'userId');
  requireUuid(gameId, 'gameId');
  requireAmount(stakeAmount, 'stakeAmount');
  const c = DB_SCHEMA.rounds;
  return insertReturning(c.table, {
    [c.tenantId]: tenantId,
    [c.userId]: userId,
    [c.gameId]: gameId,
    [c.status]: c.openStatus,
    [c.stake]: stakeAmount,
  }, 'create round');
}

/**
 * Record a virtual coin ledger row exactly once per caller-supplied key.
 * On PostgreSQL unique violation (23505), read and return the existing row.
 * Ensure a UNIQUE constraint/index exists on virtual_coin_ledger.idempotency_key.
 */
export async function recordCoinLedgerEntry({ tenantId, userId, roundId, amount, entryType, idempotencyKey }) {
  requireUuid(tenantId, 'tenantId');
  requireUuid(userId, 'userId');
  requireUuid(roundId, 'roundId');
  if (!Number.isSafeInteger(amount) || amount === 0) throw new TypeError('amount must be a non-zero safe integer in virtual coins.');
  if (typeof entryType !== 'string' || !/^[a-z][a-z0-9_]{1,39}$/.test(entryType)) throw new TypeError('entryType must be 2-40 lowercase letters, digits, or underscores.');
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 128) throw new TypeError('idempotencyKey must be 8-128 characters.');
  const c = DB_SCHEMA.ledger;
  const payload = {
    [c.tenantId]: tenantId,
    [c.userId]: userId,
    [c.roundId]: roundId,
    [c.amount]: amount,
    [c.type]: entryType,
    [c.idempotencyKey]: idempotencyKey,
  };
  const { data, error } = await supabaseAdmin.from(c.table).insert(payload).select('*').single();
  if (!error) return { entry: data, deduplicated: false };
  if (error.code !== '23505') throwDb(error, 'record virtual coin ledger entry');

  const { data: existing, error: readError } = await supabaseAdmin
    .from(c.table).select('*').eq(c.idempotencyKey, idempotencyKey).maybeSingle();
  throwDb(readError, 'read duplicate virtual coin ledger entry');
  if (!existing) throw new Error('Idempotency conflict was reported, but the existing ledger row could not be found.');
  if (existing[c.tenantId] !== tenantId || existing[c.userId] !== userId || existing[c.roundId] !== roundId || existing[c.amount] !== amount || existing[c.type] !== entryType) {
    const conflict = new Error('Idempotency key is already associated with a different ledger payload.');
    conflict.statusCode = 409;
    throw conflict;
  }
  return { entry: existing, deduplicated: true };
}

/**
 * Insert payout ledger entry first (with deterministic idempotency key), then the
 * settlement row, then mark the round settled. This ordering allows retry after
 * partial failure without duplicating payout. Required DB constraints:
 * unique virtual_coin_ledger.idempotency_key and unique(round_id,user_id) on
 * round_settlements. For strict all-or-nothing semantics, replace with a reviewed
 * PostgreSQL transaction/RPC after schema review; PostgREST calls are not a txn.
 */
export async function settleRoundIdempotent({ roundId, tenantId, userId, payoutAmount }) {
  requireUuid(roundId, 'roundId');
  requireUuid(tenantId, 'tenantId');
  requireUuid(userId, 'userId');
  requireAmount(payoutAmount, 'payoutAmount');
  const r = DB_SCHEMA.rounds;
  const s = DB_SCHEMA.settlements;
  const l = DB_SCHEMA.ledger;

  const { data: round, error: roundError } = await supabaseAdmin.from(r.table)
    .select('*').eq(r.id, roundId).maybeSingle();
  throwDb(roundError, 'load round for settlement');
  if (!round) {
    const error = new Error('Round not found.'); error.statusCode = 404; throw error;
  }
  if (round[r.tenantId] !== tenantId || round[r.userId] !== userId) {
    const error = new Error('Round does not belong to the supplied tenant and user.'); error.statusCode = 409; throw error;
  }

  const { data: prior, error: priorError } = await supabaseAdmin.from(s.table)
    .select('*').eq(s.roundId, roundId).eq(s.userId, userId).maybeSingle();
  throwDb(priorError, 'check existing settlement');
  if (prior) {
    if (prior[s.payout] !== payoutAmount) {
      const error = new Error('Round has already been settled with a different payout.'); error.statusCode = 409; throw error;
    }
    return { settlement: prior, deduplicated: true };
  }
  if (round[r.status] === r.settledStatus) {
    const error = new Error('Round is marked settled but has no matching settlement row; manual review is required.'); error.statusCode = 409; throw error;
  }

  // A zero payout has no ledger mutation; positive payouts are virtual coin credits.
  if (payoutAmount > 0) {
    await recordCoinLedgerEntry({
      tenantId, userId, roundId, amount: payoutAmount, entryType: 'round_payout',
      idempotencyKey: `round:${roundId}:payout:${userId}`,
    });
  }

  const { data: settlement, error: settlementError } = await supabaseAdmin.from(s.table)
    .insert({ [s.roundId]: roundId, [s.userId]: userId, [s.payout]: payoutAmount })
    .select('*').single();
  if (settlementError?.code === '23505') {
    const { data: concurrent, error: readError } = await supabaseAdmin.from(s.table)
      .select('*').eq(s.roundId, roundId).eq(s.userId, userId).maybeSingle();
    throwDb(readError, 'read concurrent settlement');
    if (concurrent && concurrent[s.payout] === payoutAmount) return { settlement: concurrent, deduplicated: true };
    const conflict = new Error('Concurrent settlement used a different payout.'); conflict.statusCode = 409; throw conflict;
  }
  throwDb(settlementError, 'insert round settlement');

  const { error: updateError } = await supabaseAdmin.from(r.table)
    .update({ [r.status]: r.settledStatus }).eq(r.id, roundId);
  throwDb(updateError, 'mark round settled');
  return { settlement, deduplicated: false };
}
