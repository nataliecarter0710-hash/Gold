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


## Code cleanup (2026-11-27)
- Review identified and corrected a duplicate class attribute on the favorites button in the lobby HTML.
- Commit: `e48c237656c72b99fa4c55474ee4b166436eaac9`; deployment pending verification.


## Accessibility labels (2026-11-27)
- Game-card preview labels now include each game name.
- Favorite buttons announce add/remove favorite intent and expose aria-pressed state.
- Change commit: `6e18b4319671f152fe1841a8885bee99d7343267`; deployment pending.


## Search accessibility refinement (2026-11-27)
- Search uses a native search input, autocomplete disabled, and explicit grid control relationship.
- Empty-result text now has a polite live announcement role.
- Commit `b32084f88178c962ee29ca0c1564627d3116ef12`; deployment pending.


## Game-card semantics refinement (2026-11-27)
- Game cards use group semantics instead of button semantics because each contains a separate favorite button (avoids nested interactive controls).
- Keyboard activation of the card preview is preserved, while favorite-button keyboard interaction is excluded from the card handler.
- Commit: 5b191f66e3f0f9554fd7573fc8a940dc087f50ea; deployment verification pending.


## Semantic game preview controls (2026-11-27)
- Replaced clickable/group card containers with a dedicated native preview button and a separate favorite button, avoiding nested controls and making the preview action semantically keyboard-accessible.
- Commit: aad34feea46d6aca1d67d5408d4e43c8891fb2b8; deployment verification pending.


## Focus indicator visibility refinement (2026-11-27)
- Preview button keyboard focus indicator changed to an inset outline/shadow to avoid clipping by the card's overflow boundary.
- Commit: 82a2c7eb4f099bed3e0ac02a81fc2d5f76a8f42b; deployment pending verification.


## Lobby-wide keyboard and touch polish (2026-11-27)
- Added consistent visible focus indicators to search, category, navigation, mobile navigation, and modal buttons.
- Added touch-action: manipulation to buttons to reduce double-tap delay behavior on touch devices.
- Commit: 638b31cf004fca9d891134f6a13cc1c883126837; deployment verification pending.


## Favorite-button focus refinement (2026-11-27)
- Improved focus ring on the favorite control to remain visible within clipped game cards.
- Commit: 725e032426381eafb67c2651b97561f0db8b7edf.
- Deployment verification pending.


## Empty-state guidance improvement (2026-11-27)
- Favorites view now explains how to save a game when the list is empty; search/category empty results retain their existing guidance.
- Commit: 7a5b4ce889d3a0974976abf26bf62637e5a802c8.
- Deployment verification pending.


## Accessible category/result announcement (2026-11-27)
- Lobby heading now politely announces selected category and matching game count to assistive technology users as filters change.
- Commit: 3be364e6cf1a4da5bdfb36c94267c7966ea1daa2.
- Deployment verification pending.


## Category navigation search reset (2026-11-27)
- Selecting a category now clears the prior search query, avoiding confusing empty category results when a previous search was active.
- Commit: d261026ec794fa75b617ae0fc6ec0705cf841657.
- Deployment verification pending.
