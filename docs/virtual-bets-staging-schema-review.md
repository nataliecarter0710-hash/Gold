# Virtual-bets staging migration draft (REVIEW ONLY)

**Not applied.** This is a schema proposal only; it does not include executable bet-placement, balance-debit, payout, or settlement routines. Do not apply to Goldbet9-Staging until security, authorization, and transaction design have been reviewed.

Assumes existing `public.platform_users(id uuid)` and `public.coin_ledger(id uuid)`.

```sql
-- Draft: rounds
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  game_code text not null,
  round_code text not null,
  status text not null default 'CREATED'
    check (status in ('CREATED','OPEN','CLOSED','RESULT_RECORDED','REVIEW','COMPLETE','CANCELLED')),
  opens_at timestamptz,
  closes_at timestamptz,
  closed_at timestamptz,
  result_payload jsonb,
  result_version integer not null default 0 check (result_version >= 0),
  result_recorded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rounds_game_round_unique unique (game_code, round_code),
  constraint rounds_window_check check (closes_at is null or opens_at is null or closes_at > opens_at),
  constraint rounds_result_state_check check (
    status not in ('RESULT_RECORDED','REVIEW','COMPLETE')
    or (result_payload is not null and result_recorded_at is not null)
  )
);

create index if not exists rounds_game_status_time_idx
  on public.rounds (game_code, status, opens_at);
create index if not exists rounds_status_close_idx
  on public.rounds (status, closes_at);

-- Draft: bet records. These columns/constraints do not implement or authorize betting.
create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete restrict,
  platform_user_id uuid not null references public.platform_users(id) on delete restrict,
  game_code text not null,
  selection_code text not null,
  selection_snapshot jsonb not null default '{}'::jsonb,
  stake numeric(18,2) not null check (stake > 0),
  status text not null default 'RECORDED'
    check (status in ('RECORDED','CANCELLED','RESULT_RECORDED','WON_SIMULATION','LOST_SIMULATION','VOID_SIMULATION')),
  idempotency_key text not null,
  ledger_entry_id uuid unique references public.coin_ledger(id) on delete restrict,
  result_snapshot jsonb,
  payout_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  constraint bets_user_idempotency_unique unique (platform_user_id, idempotency_key),
  constraint bets_round_game_consistency_note check (length(game_code) > 0),
  constraint bets_key_nonempty check (length(trim(idempotency_key)) > 0)
);

create index if not exists bets_round_status_idx
  on public.bets (round_id, status);
create index if not exists bets_user_created_idx
  on public.bets (platform_user_id, created_at desc);
create index if not exists bets_game_created_idx
  on public.bets (game_code, created_at desc);

-- Protect both tables before granting any access. Policies/grants are deliberately
-- not supplied here because the tenant/role model and API ownership must be reviewed.
alter table public.rounds enable row level security;
alter table public.bets enable row level security;
```

## Pre-application checks
- Confirm that `platform_users.id` and `coin_ledger.id` are UUID primary keys in the target.
- Reconcile the existing ledger entry-type check and current access policies.
- Decide who may create/update round status and result data; require result immutability/versioned correction procedures.
- Define role-specific RLS policies and grants; enabling RLS alone does not establish a complete policy.
- Review transaction, locking, authorization, and retry design separately. This draft has no debit, payout, or settlement procedure.
- Test on a disposable PostgreSQL database, not Goldbet9-Staging.
