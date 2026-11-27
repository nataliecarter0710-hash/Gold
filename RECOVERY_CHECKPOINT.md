# Goldbet9 Training / Recovery Preview

## Scope
This isolated branch and Render preview are for a non-transactional visual/training prototype. No signup flow, payment processing, cash-value transactions, or wagering/settlement features are enabled in this preview.

## Preview
- Render: https://goldbet9-training-recovery.onrender.com
- Branch: goldbet9-training-recovery

## Supabase staging security checkpoint (2026-11-27)
- RLS enabled on all eight public tables.
- Direct client privileges revoked on activity_audit, agent_relationships, tenants, and virtual_coin_ledger.
- Direct client write privileges revoked on profiles, tenant_memberships, game_catalog, and game_sessions.
- Authenticated direct client access remains limited to SELECT on the four app-facing tables, protected by existing RLS policies.
- No Edge Functions are deployed.
- Four informational Advisor findings remain for RLS-enabled tables with no policies on sensitive tables; these tables have direct client privileges revoked. Do not add permissive policies merely to clear warnings.

## Caution
This checkpoint is not a legal opinion, security certification, or production approval. Continue with isolated preview and review. Keep the main branch and original deployment unchanged.
