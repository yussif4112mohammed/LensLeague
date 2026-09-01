-- =================================================================================
-- LENSLEAGUE MIGRATION V12: FOUR-TIER RECOGNITION, NO RANKED LEADERBOARD
--                           (self-adapting edition)
-- ---------------------------------------------------------------------------------
-- The product spec is explicit: "There should be no public display of losses",
-- recognition is Winner / Runner-up / Honorable Mention / Participated, and
-- participation itself counts. The earlier schema instead carried Elo points,
-- profiles.global_rank and competition_entries.losses, and the UI ranked everyone
-- against everyone else.
--
-- Like v11, every block checks for its tables first and prints a NOTICE rather
-- than failing, because not all of this repo's older migrations were applied.
--
-- Run migration_v11 first. Safe to run more than once.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. RECOGNITION
--    Deliberately depends only on profiles, so it works whether or not the
--    competition tables from the older migrations are present. The link to
--    competitions is added as a foreign key below only if that table exists.
-- ---------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.competition_recognition (
  competition_id UUID NOT NULL,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_id       UUID,
  tier           TEXT NOT NULL CHECK (tier IN ('winner', 'runner_up', 'honorable_mention', 'participated')),
  awarded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (competition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_recognition_user ON public.competition_recognition(user_id);
CREATE INDEX IF NOT EXISTS idx_recognition_tier ON public.competition_recognition(competition_id, tier);

ALTER TABLE public.competition_recognition ENABLE ROW LEVEL SECURITY;

-- Recognition is public — that is the point of it. Nobody writes it from a
-- browser; only the definer function below awards tiers.
REVOKE INSERT, UPDATE, DELETE ON public.competition_recognition FROM anon, authenticated;

DROP POLICY IF EXISTS "recognition_select_all" ON public.competition_recognition;
CREATE POLICY "recognition_select_all" ON public.competition_recognition
  FOR SELECT USING (true);

-- Wire it to the competition tables only if they are actually here.
DO $do$
BEGIN
  IF to_regclass('public.competitions') IS NULL THEN
    RAISE NOTICE 'note: public.competitions is missing, so recognition rows are not FK-linked to a room yet';
  ELSIF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competition_recognition_competition_fk') THEN
    EXECUTE 'ALTER TABLE public.competition_recognition
             ADD CONSTRAINT competition_recognition_competition_fk
             FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE CASCADE';
    RAISE NOTICE 'linked: competition_recognition -> competitions';
  END IF;

  IF to_regclass('public.competition_entries') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competition_recognition_entry_fk') THEN
    EXECUTE 'ALTER TABLE public.competition_recognition
             ADD CONSTRAINT competition_recognition_entry_fk
             FOREIGN KEY (entry_id) REFERENCES public.competition_entries(id) ON DELETE SET NULL';
    RAISE NOTICE 'linked: competition_recognition -> competition_entries';
  END IF;
END
$do$;


-- ---------------------------------------------------------------------------------
-- 2. AWARDING — called when a room closes. Everyone who entered is recognised.
--    plpgsql, so it creates cleanly even if the competition tables are absent and
--    instead raises a clear error the day someone calls it.
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.award_competition_recognition(p_competition_id UUID)
RETURNS TABLE (tier TEXT, awarded INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  entrant_count INT;
BEGIN
  IF NOT public.user_has_permission('manage_challenges') THEN
    RAISE EXCEPTION 'Unauthorized: missing manage_challenges permission';
  END IF;

  IF to_regclass('public.competition_entries') IS NULL OR to_regclass('public.posts') IS NULL THEN
    RAISE EXCEPTION 'Competition entries are not set up in this database yet';
  END IF;

  SELECT COUNT(*) INTO entrant_count
  FROM public.competition_entries e
  WHERE e.competition_id = p_competition_id;

  IF entrant_count = 0 THEN
    RAISE EXCEPTION 'That room has no entries yet';
  END IF;

  -- Rank once, by community votes. Ties break on earliest entry so the result
  -- is deterministic rather than arbitrary.
  WITH ranked AS (
    SELECT e.id AS entry_id,
           p.author_id AS user_id,
           ROW_NUMBER() OVER (ORDER BY e.vote_count DESC, e.created_at ASC) AS position
    FROM public.competition_entries e
    JOIN public.posts p ON p.id = e.post_id
    WHERE e.competition_id = p_competition_id
  ),
  assigned AS (
    SELECT entry_id, user_id,
           CASE
             WHEN position = 1  THEN 'winner'
             WHEN position = 2  THEN 'runner_up'
             WHEN position <= 5 THEN 'honorable_mention'
             ELSE 'participated'
           END AS tier
    FROM ranked
  )
  INSERT INTO public.competition_recognition (competition_id, user_id, entry_id, tier)
  SELECT p_competition_id, a.user_id, a.entry_id, a.tier
  FROM assigned a
  ON CONFLICT (competition_id, user_id) DO UPDATE
    SET tier = EXCLUDED.tier, entry_id = EXCLUDED.entry_id, awarded_at = NOW();

  UPDATE public.competitions SET status = 'closed' WHERE id = p_competition_id;

  -- A win still counts toward the profile's win tally; nothing else is scored.
  UPDATE public.profiles pr
     SET wins = COALESCE(pr.wins, 0) + 1
    FROM public.competition_recognition cr
   WHERE cr.competition_id = p_competition_id
     AND cr.tier = 'winner'
     AND pr.id = cr.user_id;

  RETURN QUERY
    SELECT cr.tier, COUNT(*)::INT
    FROM public.competition_recognition cr
    WHERE cr.competition_id = p_competition_id
    GROUP BY cr.tier;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_competition_recognition(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.award_competition_recognition(UUID) TO authenticated;


-- ---------------------------------------------------------------------------------
-- 3. THE RECOGNITION BOARD FOR ONE ROOM — already grouped into the four tiers.
--    Depends only on competition_recognition and profiles, both guaranteed above.
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_room_recognition(p_competition_id UUID)
RETURNS TABLE (tier TEXT, headline TEXT, people INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    cr.tier,
    CASE WHEN COUNT(*) = 1 THEN MIN(pr.name)
         ELSE COUNT(*) || ' photographers' END AS headline,
    COUNT(*)::INT AS people
  FROM public.competition_recognition cr
  JOIN public.profiles pr ON pr.id = cr.user_id
  WHERE cr.competition_id = p_competition_id
  GROUP BY cr.tier;
$$;

GRANT EXECUTE ON FUNCTION public.get_room_recognition(UUID) TO anon, authenticated;


-- ---------------------------------------------------------------------------------
-- 4. LEAGUE ROOMS VIEW — one read for the Leagues screen.
--    Only built if the competition tables exist. The Leagues page already shows a
--    short setup notice when this view is absent, so a skip here is harmless.
-- ---------------------------------------------------------------------------------

DO $do$
DECLARE
  has_cats  BOOLEAN := to_regclass('public.categories') IS NOT NULL;
  has_entry BOOLEAN := to_regclass('public.competition_entries') IS NOT NULL;
  has_votes BOOLEAN := to_regclass('public.competition_votes') IS NOT NULL
                       AND to_regclass('public.competition_battles') IS NOT NULL;
  category_expr TEXT;
  entry_expr    TEXT;
  voter_expr    TEXT;
BEGIN
  IF to_regclass('public.competitions') IS NULL THEN
    RAISE NOTICE 'skip: league_rooms view (public.competitions does not exist). Leagues will show its setup notice.';
    RETURN;
  END IF;

  category_expr := CASE WHEN has_cats
    THEN '(SELECT cat.name FROM public.categories cat WHERE cat.id = c.category_id)'
    ELSE '''General''::text' END;

  entry_expr := CASE WHEN has_entry
    THEN '(SELECT COUNT(*) FROM public.competition_entries e WHERE e.competition_id = c.id)'
    ELSE '0::bigint' END;

  voter_expr := CASE WHEN has_votes
    THEN '(SELECT COUNT(DISTINCT v.voter_id) FROM public.competition_votes v
            JOIN public.competition_battles b ON b.id = v.battle_id
           WHERE b.competition_id = c.id)'
    ELSE '0::bigint' END;

  EXECUTE 'DROP VIEW IF EXISTS public.league_rooms';
  EXECUTE format($f$
    CREATE VIEW public.league_rooms AS
    SELECT c.id, c.name, c.status, c.round, c.starts_at, c.ends_at,
           %s AS category,
           %s AS entry_count,
           %s AS voter_count,
           GREATEST(0, EXTRACT(DAY FROM (c.ends_at - NOW()))::INT) AS days_left
    FROM public.competitions c
  $f$, category_expr, entry_expr, voter_expr);

  IF current_setting('server_version_num')::INT >= 150000 THEN
    EXECUTE 'ALTER VIEW public.league_rooms SET (security_invoker = true)';
  END IF;

  EXECUTE 'GRANT SELECT ON public.league_rooms TO anon, authenticated';
  RAISE NOTICE 'created: league_rooms view';
END
$do$;


-- ---------------------------------------------------------------------------------
-- 5. RETIRE THE RANKED LEADERBOARD
--    The columns stay so this is reversible, but the public roles can no longer
--    read a loss count or a ranked position.
-- ---------------------------------------------------------------------------------

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='competition_entries' AND column_name='losses') THEN
    EXECUTE 'REVOKE SELECT (losses) ON public.competition_entries FROM anon, authenticated';
    RAISE NOTICE 'revoked: competition_entries.losses is no longer public';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='competition_entries' AND column_name='ranking') THEN
    EXECUTE 'REVOKE SELECT (ranking) ON public.competition_entries FROM anon, authenticated';
    RAISE NOTICE 'revoked: competition_entries.ranking is no longer public';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles' AND column_name='global_rank') THEN
    EXECUTE 'REVOKE SELECT (global_rank) ON public.profiles FROM anon, authenticated';
    EXECUTE $c$COMMENT ON COLUMN public.profiles.global_rank IS
      'Deprecated in v12. LensLeague does not publish a ranked leaderboard; recognition is the four tiers in competition_recognition. Column retained so the decision is reversible.'$c$;
    RAISE NOTICE 'revoked: profiles.global_rank is no longer public';
  END IF;
END
$do$;


-- ---------------------------------------------------------------------------------
-- 6. VERIFICATION — run after applying.
-- ---------------------------------------------------------------------------------
-- Rooms and their state (empty is fine if you have not created a competition yet):
--   SELECT name, category, status, entry_count, days_left FROM public.league_rooms ORDER BY ends_at;
--
-- Confirm losses and rank are no longer public (each expects false, or an error
-- if that column does not exist in your database, which is equally fine):
--   SELECT has_column_privilege('anon','public.profiles','global_rank','SELECT');
