-- =================================================================================
-- LENSLEAGUE — VERIFY MIGRATION V15 (BATTLE ENGINE).  READ ONLY.
-- ---------------------------------------------------------------------------------
-- Run on its own. Changes nothing. Any >> FAIL sorts to the top.
--
-- Everything is asked via the catalogs (pg_proc, pg_indexes, information_schema)
-- so a missing object returns false rather than raising - the mistake that broke
-- the v14 verification block.
-- =================================================================================

WITH
fn AS (SELECT proname, pg_get_functiondef(oid) AS src
         FROM pg_proc WHERE pronamespace = 'public'::regnamespace),
col AS (SELECT table_name, column_name FROM information_schema.columns
         WHERE table_schema = 'public'),
idx AS (SELECT indexname FROM pg_indexes WHERE schemaname = 'public'),

checks(sort, label, ok) AS (VALUES

  -- ---- tuning ---------------------------------------------------------------
  (1, 'battle_settings table',        to_regclass('public.battle_settings') IS NOT NULL),
  (1, 'all 8 settings seeded',        (SELECT COUNT(*) = 8 FROM public.battle_settings)),
  (1, 'settings not writable by anon',
      NOT EXISTS (SELECT 1 FROM information_schema.table_privileges
                   WHERE table_schema='public' AND table_name='battle_settings'
                     AND grantee='anon' AND privilege_type IN ('INSERT','UPDATE','DELETE'))),

  -- ---- experience banding ---------------------------------------------------
  (2, 'profiles.battles_played',      EXISTS (SELECT 1 FROM col WHERE table_name='profiles' AND column_name='battles_played')),
  (2, 'photo_battles.band',           EXISTS (SELECT 1 FROM col WHERE table_name='photo_battles' AND column_name='band')),
  (2, 'photo_battles.queued_at',      EXISTS (SELECT 1 FROM col WHERE table_name='photo_battles' AND column_name='queued_at')),
  (2, 'photo_battles.outcome',        EXISTS (SELECT 1 FROM col WHERE table_name='photo_battles' AND column_name='outcome')),
  (2, 'experience_band()',            EXISTS (SELECT 1 FROM fn WHERE proname='experience_band')),
  (2, 'battles_played write-guarded', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_guard_battles_played')),

  -- ---- the engine -----------------------------------------------------------
  (3, 'finalize_battle()',            EXISTS (SELECT 1 FROM fn WHERE proname='finalize_battle')),
  (3, 'finalize_due_battles()',       EXISTS (SELECT 1 FROM fn WHERE proname='finalize_due_battles')),
  (3, 'battle_setting()',             EXISTS (SELECT 1 FROM fn WHERE proname='battle_setting')),

  -- ---- the behaviour changes that matter ------------------------------------
  -- A tie must be a real outcome, not a win for photo A.
  (4, 'ties handled as ties',
      EXISTS (SELECT 1 FROM fn WHERE proname='finalize_battle' AND src LIKE '%''tie''%')),
  -- Participation must pay, or new photographers leave after three losses.
  (4, 'participation points awarded',
      EXISTS (SELECT 1 FROM fn WHERE proname='finalize_battle' AND src LIKE '%points_participate%')),
  -- The old engine closed at 10 votes unconditionally, which with 8 users meant never.
  (4, 'no unconditional 10-vote close',
      NOT EXISTS (SELECT 1 FROM fn WHERE proname='cast_photo_battle_vote'
                    AND src LIKE '%votes_a + battle.votes_b >= 10%')),
  (4, 'daily vote cap enforced',
      EXISTS (SELECT 1 FROM fn WHERE proname='cast_photo_battle_vote' AND src LIKE '%daily_vote_cap%')),
  (4, 'matching is banded',
      EXISTS (SELECT 1 FROM fn WHERE proname='queue_portfolio_item_for_battle' AND src LIKE '%band%')),
  -- finalize must NOT call queue - that was the recursion cycle.
  --
  -- Judged on CODE ONLY. pg_get_functiondef() includes comments, and
  -- finalize_battle carries a comment reading "Inserted directly rather than
  -- via queue_portfolio_item_for_battle()." A naive LIKE over the whole body
  -- matched that comment and reported a failure against the very line that
  -- documents the fix. Comment lines are stripped before the test.
  (4, 'no finalize -> queue recursion',
      NOT EXISTS (
        SELECT 1 FROM (
          SELECT unnest(string_to_array(
                   (SELECT src FROM fn WHERE proname='finalize_battle'), E'\n')) AS line
        ) c
        WHERE btrim(c.line) NOT LIKE '--%'
          AND c.line LIKE '%queue_portfolio_item_for_battle%')),
  (4, 'requeue uses a direct INSERT',
      EXISTS (SELECT 1 FROM fn WHERE proname='finalize_battle'
                AND src LIKE '%INSERT INTO photo_battles%')),

  -- ---- indexes the engine depends on ----------------------------------------
  (5, 'index: due battles',           EXISTS (SELECT 1 FROM idx WHERE indexname='photo_battles_due_idx')),
  (5, 'index: matchmaking',           EXISTS (SELECT 1 FROM idx WHERE indexname='photo_battles_matchmaking_idx')),
  (5, 'index: voter rate limit',      EXISTS (SELECT 1 FROM idx WHERE indexname='photo_battle_votes_voter_time_idx')),
  (5, 'index: battle history',        EXISTS (SELECT 1 FROM idx WHERE indexname='photo_battles_finalized_idx')),

  -- ---- security -------------------------------------------------------------
  (6, 'finalize_battle not callable by clients',
      NOT has_function_privilege('authenticated',
        (SELECT oid FROM pg_proc WHERE proname='finalize_battle'
          AND pronamespace='public'::regnamespace LIMIT 1), 'EXECUTE')),
  (6, 'voting callable by signed-in users',
      has_function_privilege('authenticated',
        (SELECT oid FROM pg_proc WHERE proname='cast_photo_battle_vote'
          AND pronamespace='public'::regnamespace LIMIT 1), 'EXECUTE')),
  (6, 'voting NOT callable anonymously',
      NOT has_function_privilege('anon',
        (SELECT oid FROM pg_proc WHERE proname='cast_photo_battle_vote'
          AND pronamespace='public'::regnamespace LIMIT 1), 'EXECUTE'))
)
SELECT CASE WHEN ok THEN 'OK' ELSE '>> FAIL' END AS result, label
FROM checks
ORDER BY (NOT ok) DESC, sort, label;
