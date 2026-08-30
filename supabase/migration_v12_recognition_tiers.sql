-- =================================================================================
-- LENSLEAGUE MIGRATION V12: FOUR-TIER RECOGNITION, NO RANKED LEADERBOARD
-- ---------------------------------------------------------------------------------
-- The product spec is explicit: "There should be no public display of losses",
-- recognition is Winner / Runner-up / Honorable Mention / Participated, and
-- participation itself counts. The v1-v10 schema instead carried Elo points,
-- profiles.global_rank and competition_entries.losses, and the UI ranked everyone
-- against everyone else.
--
-- This migration:
--   1. Adds competition_recognition — the four tiers, awarded server-side.
--   2. Awards them from real vote counts, giving every entrant at least
--      'participated'.
--   3. Stops losses and ranked position being readable by the public roles.
--   4. Leaves the underlying numbers in place, so nothing is destroyed and the
--      decision is reversible.
--
-- Safe to run more than once. Apply migration_v11 first.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. RECOGNITION
-- ---------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.competition_recognition (
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_id       UUID REFERENCES public.competition_entries(id) ON DELETE SET NULL,
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


-- ---------------------------------------------------------------------------------
-- 2. AWARDING
--    Called when a room closes. Everyone who entered is recognised.
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.award_competition_recognition(p_competition_id UUID)
RETURNS TABLE (tier TEXT, awarded INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  entrant_count INT;
BEGIN
  IF NOT public.user_has_permission('manage_challenges') THEN
    RAISE EXCEPTION 'Unauthorized: missing manage_challenges permission';
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
    SELECT
      e.id  AS entry_id,
      p.author_id AS user_id,
      ROW_NUMBER() OVER (ORDER BY e.vote_count DESC, e.created_at ASC) AS position
    FROM public.competition_entries e
    JOIN public.posts p ON p.id = e.post_id
    WHERE e.competition_id = p_competition_id
  ),
  assigned AS (
    SELECT
      entry_id,
      user_id,
      CASE
        WHEN position = 1 THEN 'winner'
        WHEN position = 2 THEN 'runner_up'
        WHEN position <= 5 THEN 'honorable_mention'
        ELSE 'participated'
      END AS tier
    FROM ranked
  )
  INSERT INTO public.competition_recognition (competition_id, user_id, entry_id, tier)
  SELECT p_competition_id, a.user_id, a.entry_id, a.tier
  FROM assigned a
  ON CONFLICT (competition_id, user_id) DO UPDATE
    SET tier = EXCLUDED.tier,
        entry_id = EXCLUDED.entry_id,
        awarded_at = NOW();

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
-- 3. LEAGUE ROOMS
--    One read for the Leagues screen: the room, its category, how many are in,
--    and how long is left. Category rooms only — a room never mixes categories.
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.league_rooms AS
SELECT
  c.id,
  c.name,
  c.status,
  c.round,
  c.starts_at,
  c.ends_at,
  cat.name AS category,
  (SELECT COUNT(*) FROM public.competition_entries e WHERE e.competition_id = c.id) AS entry_count,
  (SELECT COUNT(DISTINCT v.voter_id)
     FROM public.competition_votes v
     JOIN public.competition_battles b ON b.id = v.battle_id
    WHERE b.competition_id = c.id) AS voter_count,
  GREATEST(0, EXTRACT(DAY FROM (c.ends_at - NOW()))::INT) AS days_left
FROM public.competitions c
JOIN public.categories cat ON cat.id = c.category_id;

DO $$
BEGIN
  IF current_setting('server_version_num')::INT >= 150000 THEN
    EXECUTE 'ALTER VIEW public.league_rooms SET (security_invoker = true)';
  END IF;
END $$;

GRANT SELECT ON public.league_rooms TO anon, authenticated;

-- The recognition board for one room, already grouped into the four tiers.
CREATE OR REPLACE FUNCTION public.get_room_recognition(p_competition_id UUID)
RETURNS TABLE (tier TEXT, headline TEXT, people INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    t.tier,
    CASE
      WHEN COUNT(*) = 1 THEN MIN(pr.name)
      ELSE COUNT(*) || ' photographers'
    END AS headline,
    COUNT(*)::INT AS people
  FROM (VALUES ('winner'), ('runner_up'), ('honorable_mention'), ('participated')) AS t(tier)
  JOIN public.competition_recognition cr
    ON cr.tier = t.tier AND cr.competition_id = p_competition_id
  JOIN public.profiles pr ON pr.id = cr.user_id
  GROUP BY t.tier;
$$;

GRANT EXECUTE ON FUNCTION public.get_room_recognition(UUID) TO anon, authenticated;


-- ---------------------------------------------------------------------------------
-- 4. RETIRE THE RANKED LEADERBOARD
--    The columns stay so this is reversible, but the public roles can no longer
--    read a loss count or a ranked position. Nothing in the app selects them by
--    name after this migration.
-- ---------------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='competition_entries' AND column_name='losses') THEN
    EXECUTE 'REVOKE SELECT (losses) ON public.competition_entries FROM anon, authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='competition_entries' AND column_name='ranking') THEN
    EXECUTE 'REVOKE SELECT (ranking) ON public.competition_entries FROM anon, authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='profiles' AND column_name='global_rank') THEN
    EXECUTE 'REVOKE SELECT (global_rank) ON public.profiles FROM anon, authenticated';
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.global_rank IS
  'Deprecated in v12. LensLeague does not publish a ranked leaderboard; recognition is the four tiers in competition_recognition. Column retained so the decision is reversible.';

-- ---------------------------------------------------------------------------------
-- 5. VERIFICATION
-- ---------------------------------------------------------------------------------
-- Rooms and their state:
--   SELECT name, category, status, entry_count, days_left FROM public.league_rooms ORDER BY ends_at;
--
-- Confirm losses and rank are no longer public (all three expect false):
--   SELECT has_column_privilege('anon','public.competition_entries','losses','SELECT'),
--          has_column_privilege('anon','public.competition_entries','ranking','SELECT'),
--          has_column_privilege('anon','public.profiles','global_rank','SELECT');
