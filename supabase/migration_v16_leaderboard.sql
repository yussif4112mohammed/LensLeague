-- =================================================================================
-- LENSLEAGUE MIGRATION V16: LEADERBOARD
-- ---------------------------------------------------------------------------------
-- "Define ranking logic once. Do not calculate rankings differently on different
-- pages." So ranking lives here, in the database, and every surface reads it.
--
-- ── WHAT WAS THERE ───────────────────────────────────────────────────────────
-- LeaderboardPage.jsx was never routed (/leaderboard redirects to /leagues), and
-- it re-sorted by points in the browser with the comment "global_rank may lag
-- behind in DB so we recompute locally" - a second ranking system that could
-- disagree with the first. It also labelled the column "ELO", but the points
-- come from a flat award, not from an Elo calculation. Three different ideas
-- wearing one name.
--
-- ── THE TWO SCOPES ───────────────────────────────────────────────────────────
-- ALL TIME reads profiles.points - the running total the battle engine awards.
--
-- THIS MONTH cannot read that column, because a running total has no date on it.
-- It is derived from the battles themselves: every battle finalised this month,
-- scored with the same values the engine used. So the two scopes cannot drift
-- apart - they are the same rules applied over different windows.
--
-- Point values come from battle_settings, not from literals repeated here. If
-- you retune the engine, the leaderboard follows automatically.
--
-- ── RANKING RULE ─────────────────────────────────────────────────────────────
-- Points first, then wins, then who got there first. DENSE_RANK, so two
-- photographers on the same points genuinely share a position rather than one
-- being arbitrarily placed above the other - the same principle as ties in a
-- battle.
--
-- Banned and deactivated accounts are excluded. is_deactivated was written by
-- Settings and read by nothing until now.
--
-- Safe to run more than once. Requires v15.
-- =================================================================================

BEGIN;

-- ---------------------------------------------------------------------------------
-- Indexes for the two scans this view performs.
-- ---------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS profiles_points_idx
  ON public.profiles (points DESC, wins DESC);

CREATE INDEX IF NOT EXISTS photo_battles_month_idx
  ON public.photo_battles (finalized_at)
  WHERE status = 'finalized';


-- ---------------------------------------------------------------------------------
-- THE LEADERBOARD
--
--   p_scope   'all_time' (default) or 'month'
--   p_limit   how many rows, capped at 200
--   p_month   which month for 'month' scope; defaults to the current one
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_scope TEXT DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 50,
  p_month DATE DEFAULT NULL
)
RETURNS TABLE (
  rank           INTEGER,
  user_id        UUID,
  name           TEXT,
  username       TEXT,
  avatar_url     TEXT,
  points         INTEGER,
  wins           INTEGER,
  battles_played INTEGER,
  verified       BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  pts_part   INTEGER := COALESCE(public.battle_setting('points_participate'), 3);
  pts_win    INTEGER := COALESCE(public.battle_setting('points_win'), 10);
  window_start TIMESTAMPTZ;
  window_end   TIMESTAMPTZ;
  row_cap    INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
BEGIN
  IF p_scope NOT IN ('all_time', 'month') THEN
    RAISE EXCEPTION 'Unknown leaderboard scope: %', p_scope;
  END IF;

  -- ── ALL TIME: the running total the engine maintains ──────────────────────
  IF p_scope = 'all_time' THEN
    RETURN QUERY
    SELECT
      DENSE_RANK() OVER (ORDER BY p.points DESC, p.wins DESC, p.created_at ASC)::INTEGER,
      p.id,
      p.name,
      p.username,
      COALESCE(p.avatar_url, p.avatar),
      p.points,
      p.wins,
      p.battles_played,
      COALESCE(p.verified, FALSE)
    FROM profiles p
    WHERE COALESCE(p.banned, FALSE) = FALSE
      AND COALESCE(p.is_deactivated, FALSE) = FALSE
      AND p.points > 0                  -- nobody appears on a leaderboard at zero
    ORDER BY p.points DESC, p.wins DESC, p.created_at ASC
    LIMIT row_cap;
    RETURN;
  END IF;

  -- ── THIS MONTH: recomputed from the battles themselves ────────────────────
  window_start := date_trunc('month', COALESCE(p_month, CURRENT_DATE)::TIMESTAMPTZ);
  window_end   := window_start + INTERVAL '1 month';

  RETURN QUERY
  WITH entrants AS (
    -- One row per photographer per battle they had a photograph in.
    SELECT b.id AS battle_id, b.outcome, b.winner_id, pi.photographer_id, pi.id AS item_id
    FROM photo_battles b
    JOIN portfolio_items pi ON pi.id IN (b.photo_a_id, b.photo_b_id)
    WHERE b.status = 'finalized'
      AND b.finalized_at >= window_start
      AND b.finalized_at <  window_end
      AND b.outcome IS DISTINCT FROM 'no_votes'   -- a battle nobody saw scores nothing
  ),
  scored AS (
    SELECT
      e.photographer_id,
      SUM(pts_part
          + CASE WHEN e.outcome = 'decided' AND e.winner_id = e.item_id
                 THEN pts_win ELSE 0 END)::INTEGER AS month_points,
      COUNT(*) FILTER (
        WHERE e.outcome = 'decided' AND e.winner_id = e.item_id
      )::INTEGER AS month_wins,
      COUNT(*)::INTEGER AS month_battles
    FROM entrants e
    GROUP BY e.photographer_id
  )
  SELECT
    DENSE_RANK() OVER (ORDER BY s.month_points DESC, s.month_wins DESC, p.created_at ASC)::INTEGER,
    p.id,
    p.name,
    p.username,
    COALESCE(p.avatar_url, p.avatar),
    s.month_points,
    s.month_wins,
    s.month_battles,
    COALESCE(p.verified, FALSE)
  FROM scored s
  JOIN profiles p ON p.id = s.photographer_id
  WHERE COALESCE(p.banned, FALSE) = FALSE
    AND COALESCE(p.is_deactivated, FALSE) = FALSE
  ORDER BY s.month_points DESC, s.month_wins DESC, p.created_at ASC
  LIMIT row_cap;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INTEGER, DATE) TO anon, authenticated;


-- ---------------------------------------------------------------------------------
-- ONE PHOTOGRAPHER'S STANDING — so a profile shows the same number the
-- leaderboard does, rather than computing its own.
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_standing(p_user_id UUID)
RETURNS TABLE (rank INTEGER, points INTEGER, wins INTEGER, total_ranked INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH ranked AS (
    SELECT p.id,
           DENSE_RANK() OVER (ORDER BY p.points DESC, p.wins DESC, p.created_at ASC)::INTEGER AS r,
           p.points, p.wins
    FROM profiles p
    WHERE COALESCE(p.banned, FALSE) = FALSE
      AND COALESCE(p.is_deactivated, FALSE) = FALSE
      AND p.points > 0
  )
  SELECT r.r, r.points, r.wins, (SELECT COUNT(*)::INTEGER FROM ranked)
  FROM ranked r WHERE r.id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_standing(UUID) TO anon, authenticated;


-- ---------------------------------------------------------------------------------
-- PLATFORM TOTALS FOR THE MONTH — the honest version of "this month photographers
-- uploaded X photos and completed Y battles". Every number is counted, none invented.
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_month_stats(p_month DATE DEFAULT NULL)
RETURNS TABLE (
  photos_uploaded  INTEGER,
  battles_completed INTEGER,
  votes_cast       INTEGER,
  photographers    INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH w AS (
    SELECT date_trunc('month', COALESCE(p_month, CURRENT_DATE)::TIMESTAMPTZ) AS s,
           date_trunc('month', COALESCE(p_month, CURRENT_DATE)::TIMESTAMPTZ)
             + INTERVAL '1 month' AS e
  )
  SELECT
    (SELECT COUNT(*)::INTEGER FROM portfolio_items, w
      WHERE created_at >= w.s AND created_at < w.e),
    (SELECT COUNT(*)::INTEGER FROM photo_battles, w
      WHERE status = 'finalized' AND finalized_at >= w.s AND finalized_at < w.e),
    (SELECT COUNT(*)::INTEGER FROM photo_battle_votes, w
      WHERE created_at >= w.s AND created_at < w.e),
    (SELECT COUNT(DISTINCT photographer_id)::INTEGER FROM portfolio_items, w
      WHERE created_at >= w.s AND created_at < w.e);
$$;

GRANT EXECUTE ON FUNCTION public.get_month_stats(DATE) TO anon, authenticated;

COMMIT;
