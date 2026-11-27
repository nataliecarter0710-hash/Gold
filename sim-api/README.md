# Goldbet9 virtual-coin simulation API

An isolated Node/Express service for a private educational simulation. It models round sessions and virtual-coin ledger events only; it has no payment/deposit/withdrawal functionality or public signup flow. It does not call `public.transfer_virtual_coins`.

## Important: verify the staging schema first

The exact column definitions were not provided when this service was scaffolded. Proposed mappings are documented in `src/services/roundEngine.js`; they must be reconciled with Goldbet9-Staging before enabling writes. Run `sql/schema-idempotency-check.sql` in the staging SQL Editor (read-only), or set a read-only-capable `DATABASE_URL` and run `npm run schema:check`. Confirm the table columns, types, status values, and uniqueness constraints, then update the mapping/payloads. In particular, idempotency requires unique `virtual_coin_ledger.idempotency_key` and unique `round_settlements(round_id,user_id)`. This service does not create or alter schema.

## Local run

1. Install Node.js 20+.
2. From `sim-api/`, run `npm install`.
3. Copy `.env.example` to `.env` locally and fill `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) and a unique high-entropy `SIM_API_TOKEN`. Never commit `.env` or paste secrets into source. Keep all Supabase secret/service-role credentials server-side.
4. Optionally add a direct staging `DATABASE_URL` for the read-only information_schema check; do not put it in Git. Run `npm run schema:check` and compare the results with the documented mapping.
5. After reconciling schema mappings and constraints, run `npm start`. `GET http://localhost:3000/api/health` should return `{"status":"ok",...}`.

## Deploy a separate Render Web Service

1. Push/deploy only branch `feat/sim-api-staging` as a new **Web Service**; do not change the existing static-site services. Set the service root directory to `sim-api`.
2. Select the repository and branch `feat/sim-api-staging`. Build command: `npm install`; start command: `npm start`. Choose a Node runtime version 20 or newer. Render supplies `PORT`.
3. Add Render environment variables: `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`), `SIM_API_TOKEN`, and `ALLOWED_ORIGINS` (exact comma-separated origins, or blank if only called server-to-server). Add `DATABASE_URL` only if you need the schema-check script; store it as a secret and remove/omit if not needed at runtime. Never expose the Supabase server key or `SIM_API_TOKEN` in frontend code.
4. Confirm the schema preflight and mapping review are complete before sending write requests. The deploy itself runs no migration and modifies no database rows.
5. Verify `https://<new-render-service>.onrender.com/api/health` returns healthy. Do not reuse the existing static service names/domains.

## One-round end-to-end test

Use a dedicated staging tenant, game and test learner UUID that you are authorized to use. Obtain those IDs from the verified staging schema; do not paste them into committed files. Keep the bearer token in a shell variable, not browser code. Use values appropriate to the confirmed column types and application rules.

```sh
export API='https://<new-render-service>.onrender.com'
read -s SIM_API_TOKEN
export SIM_API_TOKEN
export TENANT_ID='<staging-tenant-uuid>'
export USER_ID='<staging-test-user-uuid>'
export GAME_ID='<staging-game-uuid>'

ROUND=$(curl -fsS -X POST "$API/api/rounds" \
  -H "Authorization: Bearer $SIM_API_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"tenantId\":\"$TENANT_ID\",\"userId\":\"$USER_ID\",\"gameId\":\"$GAME_ID\",\"stakeAmount\":10}")
echo "$ROUND"
ROUND_ID=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).round.id))' <<< "$ROUND")

# Optional wager/debit example. Confirm the sign and entry_type convention first.
curl -fsS -X POST "$API/api/rounds/$ROUND_ID/entries" \
  -H "Authorization: Bearer $SIM_API_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"tenantId\":\"$TENANT_ID\",\"userId\":\"$USER_ID\",\"amount\":-10,\"entryType\":\"round_stake\",\"idempotencyKey\":\"test:$ROUND_ID:stake:v1\"}"

# Settlement; call twice with the exact same request to verify idempotency.
SETTLE_BODY="{\"tenantId\":\"$TENANT_ID\",\"userId\":\"$USER_ID\",\"payoutAmount\":15}"
curl -fsS -X POST "$API/api/rounds/$ROUND_ID/settle" -H "Authorization: Bearer $SIM_API_TOKEN" -H 'Content-Type: application/json' -d "$SETTLE_BODY"
curl -fsS -X POST "$API/api/rounds/$ROUND_ID/settle" -H "Authorization: Bearer $SIM_API_TOKEN" -H 'Content-Type: application/json' -d "$SETTLE_BODY"
```

Expected: round creation succeeds; one stake row exists if the optional entry call is used; payout ledger has at most one row; exactly one settlement exists; round status is settled; the second settlement response reports `deduplicated: true`. Verify rows in staging before and after the test. The API requires a bearer token for all writes. Do not test with learner/production accounts or balances.

## API

- `GET /api/health` — public process health only.
- `POST /api/rounds` — `{ tenantId, userId, gameId, stakeAmount? }`; creates a session but does not itself debit stake.
- `POST /api/rounds/:roundId/entries` — `{ tenantId, userId, amount, entryType, idempotencyKey }`; signed integer amount represents virtual coins.
- `POST /api/rounds/:roundId/settle` — `{ tenantId, userId, payoutAmount }`; payout is non-negative virtual coins and settlement is idempotent.

The API uses a server-only Supabase client (`persistSession`, refresh and URL session detection disabled). Since Supabase REST calls are not a PostgreSQL transaction, payout ledger entry is written first with a deterministic idempotency key, then settlement and status. Review the documented recovery behavior and consider a reviewed transactional database function before concurrent or real-world use. Keep this educational service isolated and monitor it; no client-side balance mutation is exposed.
