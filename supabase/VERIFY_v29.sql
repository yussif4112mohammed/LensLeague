-- =================================================================================
-- VERIFY v29 — run AFTER migration_v29_vote_ambiguity.sql. ONE query.
--
-- Check 5 is the only one that proves anything, and it is behavioural: it says
-- whether a vote has actually landed. Every structural check below was already
-- passing while voting was completely broken, which is exactly why they are not
-- enough on their own.
-- =================================================================================
WITH checks AS (
  SELECT 1 AS n, 'the vote function exists and is still SECURITY DEFINER' AS label,
         (SELECT prosecdef FROM pg_proc WHERE proname = 'cast_photo_battle_vote') AS ok
  UNION ALL SELECT 2, 'its counting statement now names the table',
         (SELECT prosrc LIKE '%photo_battles.votes_a + CASE%'
            FROM pg_proc WHERE proname = 'cast_photo_battle_vote')
  UNION ALL SELECT 3, 'no bare "SET votes_a = votes_a" left in it',
         (SELECT prosrc NOT LIKE '%SET votes_a = votes_a +%'
            FROM pg_proc WHERE proname = 'cast_photo_battle_vote')
  UNION ALL SELECT 4, 'anonymous callers still cannot vote',
         NOT has_function_privilege('anon',
           (SELECT oid FROM pg_proc WHERE proname = 'cast_photo_battle_vote'), 'EXECUTE')
  UNION ALL SELECT 5, 'A VOTE HAS ACTUALLY BEEN RECORDED',
         (SELECT COUNT(*) > 0 FROM public.photo_battle_votes)
  UNION ALL SELECT 6, 'stored vote counts match the real vote rows',
         (SELECT COALESCE(SUM(votes_a + votes_b), 0) FROM public.photo_battles)
         = (SELECT COUNT(*) FROM public.photo_battle_votes)
  UNION ALL SELECT 7, 'nobody has voted in their own battle',
         NOT EXISTS (
           SELECT 1
             FROM public.photo_battle_votes v
             JOIN public.photo_battles b ON b.id = v.battle_id
             JOIN public.portfolio_items pi ON pi.id IN (b.photo_a_id, b.photo_b_id)
            WHERE pi.photographer_id = v.voter_id)
)
SELECT n,
       CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result,
       label,
       (SELECT COUNT(*) FROM public.photo_battle_votes) AS votes_recorded,
       (SELECT COUNT(*) FROM public.photo_battles WHERE status = 'active') AS battles_active
  FROM checks
 ORDER BY (CASE WHEN ok THEN 1 ELSE 0 END), n;
