/**
 * Goldbet9-Staging column contract. These names are a proposed mapping only:
 * the actual column DDL was not provided. Verify with scripts/check-schema-columns.sql
 * before writes. Keep the service on virtual_coin_ledger; coin_ledger is inventoried
 * but deliberately not used for this educational virtual-coin flow.
 */
export const DB_SCHEMA = Object.freeze({
  rounds: Object.freeze({
    table: 'game_sessions',
    id: 'id', tenantId: 'tenant_id', userId: 'user_id', gameId: 'game_id',
    status: 'status', stake: 'stake_amount',
    openStatus: 'in_progress', settledStatus: 'settled',
  }),
  ledger: Object.freeze({
    table: 'virtual_coin_ledger',
    id: 'id', tenantId: 'tenant_id', userId: 'user_id', roundId: 'round_id',
    amount: 'amount', type: 'entry_type', idempotencyKey: 'idempotency_key',
    createdAt: 'created_at',
  }),
  settlements: Object.freeze({
    table: 'round_settlements',
    id: 'id', roundId: 'round_id', userId: 'user_id', payout: 'payout_amount',
    createdAt: 'created_at',
  }),
});

export const REQUIRED_SCHEMA_COLUMNS = Object.freeze({
  game_sessions: Object.freeze(['id', 'tenant_id', 'user_id', 'game_id', 'status', 'stake_amount']),
  virtual_coin_ledger: Object.freeze(['id', 'tenant_id', 'user_id', 'round_id', 'amount', 'entry_type', 'idempotency_key', 'created_at']),
  round_settlements: Object.freeze(['id', 'round_id', 'user_id', 'payout_amount', 'created_at']),
});
