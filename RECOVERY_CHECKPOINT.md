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


## Lobby checkpoint update (2026-11-27)
- Preview label replaces displayed credit balance; no credit balance shown.
- Game selection dialogs explicitly state gameplay, wagering, and settlement are disabled.
- Navigation active-state styling and modal focus accessibility improvements are committed.
- Favorites persist locally in browser storage; search has an accessible label.
- Footer underage notice remains present.
- Render deployment for latest preview clarification is live.


## Accessibility follow-up (2026-11-27)
- Dialog keyboard focus is contained while open.
- Escape key closes dialog only while it is open.
- Reduced-motion preference support added.

## Latest deployment status
- Render deployment for commit `45efc87a4ff3a117a35fc541c1047f5688c2e3ff` is LIVE.
- Checkpoint documentation commit `982f7ec9d1f94d638e539ad1efb2efe80d2f3238` is LIVE.
- Supabase health advisor returned no health lint findings at the time of review. Security advisor's four informational notices remain as previously documented.

## Lobby UX improvement (2026-11-27)
- Search/category results grid announces updates via aria-live.
- Clear empty-results message displayed when filtering returns no games.


## Latest recovery deployment checkpoint (2026-11-27)
- Latest recovery-branch commit: `b6750bfc945320d6649d7a5d21cf4a8b627635dd` (live on Render).
- Live deployment includes the search/filter accessibility announcement and empty state, and a live status announcement in the game preview dialog.
- The attempted change to dynamic game-card labels was reverted before finalizing; no incomplete label change remains.
- Supabase health advisor returned no lint findings on this review.
- Preview remains isolated; no actual gameplay, wagering, transactions, signup, or settlement.
