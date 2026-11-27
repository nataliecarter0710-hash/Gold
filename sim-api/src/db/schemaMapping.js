/**
 * Goldbet9-Staging diagnostic contract. Every column below is a CONSERVATIVE,
 * UNVERIFIED assumption until scripts/check-schema-columns.sql is run against
 * the intended live project. This mapping is for metadata diagnostics only; it
 * does not authorize or enable round/ledger/settlement writes.
 */
export const DB_SCHEMA = Object.freeze({
  rounds: Object.freeze({
    table: 'game_sessions',
    id: 'id', tenantId: 'tenant_id', userId: 'user_id', gameId: 'game_id',
    status: 'status', stake: 'stake_amount',
    openStatus: 'in_progress', settledStatus: 'settled',
  }),
  coinLedger: Object.freeze({
    // Tentative conventional names only; inspect before relying on them.
    table: 'coin_ledger',
    id: 'id', userId: 'user_id', amount: 'amount', type: 'entry_type', createdAt: 'created_at',
  }),
  virtualCoinLedger: Object.freeze({
    // Tentative conventional names only; no ledger writes occur in diagnostic mode.
    table: 'virtual_coin_ledger',
    id: 'id', tenantId: 'tenant_id', userId: 'user_id', roundId: 'round_id',
    amount: 'amount', type: 'entry_type', idempotencyKey: 'idempotency_key', createdAt: 'created_at',
  }),
  settlements: Object.freeze({
    table: 'round_settlements',
    id: 'id', roundId: 'round_id', userId: 'user_id', payout: 'payout_amount', createdAt: 'created_at',
  }),
});

// Expected columns are diagnostic comparison candidates, not verified DDL.
// A mismatch is reported and must be reviewed; the checker never alters schema.
export const REQUIRED_SCHEMA_COLUMNS = Object.freeze({
  game_sessions: Object.freeze(['id', 'tenant_id', 'user_id', 'game_id', 'status', 'stake_amount']),
  coin_ledger: Object.freeze(['id', 'user_id', 'amount', 'entry_type', 'created_at']),
  virtual_coin_ledger: Object.freeze(['id', 'tenant_id', 'user_id', 'round_id', 'amount', 'entry_type', 'idempotency_key', 'created_at']),
  round_settlements: Object.freeze(['id', 'round_id', 'user_id', 'payout_amount', 'created_at']),
});
