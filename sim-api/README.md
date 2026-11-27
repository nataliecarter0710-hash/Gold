# Goldbet9 virtual-coin simulation API

Private educational simulation service; virtual coins only. No payments, deposits, withdrawals, public signup or client-side balance mutation. The server does not call `public.transfer_virtual_coins`.

## Schema must be verified before writes

Actual Goldbet9-Staging column definitions were not provided. `src/db/schemaMapping.js` is the single mapping contract and uses **tentative** names. Run `scripts/check-schema-columns.sql` in the intended Supabase project's SQL Editor, or configure a least-privilege read-only `DATABASE_URL` and run `npm run schema:check`. Confirm exact column types, defaults, required fields and status values. Do not run a migration or live write until verified. The API only uses `virtual_coin_ledger`; it does not write `coin_ledger`.

Required idempotency constraints (verify; this service does not create them): unique `virtual_coin_ledger(idempotency_key)` and unique `round_settlements(round_id,user_id)`. Supabase REST operations are separate requests, not a transaction. The engine includes retry handling for expected partial progress, but strict atomicity/concurrent settlement requires a reviewed transaction-backed implementation.

## Local run / separate Render service

From `sim-api/`, use Node 20+, `npm install`, and a local ignored `.env` copied from `.env.example`. Configure `SUPABASE_URL`, server-only `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`, and `SIM_API_TOKEN`. Never commit `.env` or expose these values to browser code. For Render, create a **new Web Service** rooted at `sim-api`, connected only to `feat/sim-api-staging`; use `npm install` and `npm start`. Do not modify existing static sites. Set `NODE_ENV=production`, `SUPABASE_URL`, secret key, and high-entropy `SIM_API_TOKEN` in Render environment settings. The bearer token gates all writes. Schema inspection is optional and should use a read-only database role. `public.transfer_virtual_coins` remains unused and must not be exposed as a client endpoint.

## Single-round smoke test

Only proceed after schema/mapping and status/amount conventions are confirmed. Use a disposable staging test tenant, user, and game. Keep IDs and token outside Git. Configure `API`, `SIM_API_TOKEN`, `TENANT_ID`, `USER_ID`, and `GAME_ID` in a private shell. Test round creation, then repeat the exact same ledger payload/key, and repeat identical settlement payload to exercise duplicate paths:

```sh
ROUND=$(curl -fsS -X POST "$API/api/rounds" \
  -H "Authorization: Bearer $SIM_API_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"tenantId\":\"$TENANT_ID\",\"userId\":\"$USER_ID\",\"gameId\":\"$GAME_ID\",\"stakeAmount\":10}")
ROUND_ID=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).round.id))' <<< "$ROUND")
ENTRY_BODY="{\"tenantId\":\"$TENANT_ID\",\"userId\":\"$USER_ID\",\"amount\":-10,\"entryType\":\"round_stake\",\"idempotencyKey\":\"smoke:$ROUND_ID:stake:v1\"}"
curl -fsS -X POST "$API/api/rounds/$ROUND_ID/entries" -H "Authorization: Bearer $SIM_API_TOKEN" -H 'Content-Type: application/json' -d "$ENTRY_BODY"
curl -fsS -X POST "$API/api/rounds/$ROUND_ID/entries" -H "Authorization: Bearer $SIM_API_TOKEN" -H 'Content-Type: application/json' -d "$ENTRY_BODY"
SETTLE_BODY="{\"tenantId\":\"$TENANT_ID\",\"userId\":\"$USER_ID\",\"payoutAmount\":15}"
curl -fsS -X POST "$API/api/rounds/$ROUND_ID/settle" -H "Authorization: Bearer $SIM_API_TOKEN" -H 'Content-Type: application/json' -d "$SETTLE_BODY"
curl -fsS -X POST "$API/api/rounds/$ROUND_ID/settle" -H "Authorization: Bearer $SIM_API_TOKEN" -H 'Content-Type: application/json' -d "$SETTLE_BODY"
```

Expected: repeated entry reports `deduplicated: true`, repeated settlement does likewise; staging shows one stake ledger row, at most one payout ledger row, one settlement, and settled round status. Stop if schema or any balance/row outcome differs from the intended test. This smoke test is for isolated staging only.
