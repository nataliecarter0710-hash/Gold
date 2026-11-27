// Read-only schema mapping for Goldbet9-Staging (feat/sim-api-staging).
// Non-monetary simulation diagnostics only; no writes or RPC calls.

export const DIAGNOSTIC_TABLES = [
  "game_sessions",
  "coin_ledger",
  "virtual_coin_ledger",
  "round_settlements",
];

export const SCHEMA_MAPPING = {
  game_sessions: {
    verifiedColumns: [
      "tenant_id",
      "game_id",
      "rules_version",
      "status",
      "result_public",
    ],
    unverifiedOrAbsentColumns: {
      absentFromLiveSchema: ["user_id", "stake_amount"],
      pendingExactColumnNames: ["timestamps (exact column names unverified)"],
    },
  },
  coin_ledger: {
    verifiedColumns: [
      "from_user_id",
      "to_user_id",
      "amount",
      "entry_type",
      "round_id",
      "idempotency_key",
      "note",
      "created_at",
    ],
    unverifiedRules: [
      "exact positive-amount check constraint definition",
      "exact allowed entry_type literals",
      "exact unique/idempotency index definitions",
    ],
  },
  virtual_coin_ledger: {
    verifiedColumns: [
      "tenant_id",
      "user_id",
      "amount_delta",
      "reason",
      "reference_id",
      "actor_user_id",
      "created_at",
    ],
    unverifiedRules: [
      "exact primary key, foreign key, check, and index definitions",
      "whether idempotency/deduplication is enforced via reference_id or a separate index",
    ],
  },
  round_settlements: {
    verifiedColumns: [
      "round_id",
      "game_code",
      "winner_outcome",
      "settled_at",
    ],
    unverifiedOrAbsentColumns: {
      absentOrUnmatchedAssumedColumns: ["id", "user_id", "payout_amount", "created_at"],
      unverifiedRules: ["exact primary key, foreign key, unique, and index definitions"],
    },
  },
};

export const REQUIRED_SCHEMA_COLUMNS = Object.fromEntries(
  Object.entries(SCHEMA_MAPPING).map(([tableName, spec]) => [
    tableName,
    spec.verifiedColumns,
  ])
);
