-- =================================================================================
-- LENSLEAGUE MIGRATION V17: MONTHLY WRAP
-- ---------------------------------------------------------------------------------
-- Every number here is counted. None is invented.
--
-- ── WHY THIS MATTERS MORE THAN IT LOOKS ──────────────────────────────────────
-- AnalyticsPage.jsx currently shows a photographer:
--     '14,820' profile views, '3,241' votes, '87' wins, '4.97 ★' rating,
--     "12-day upload streak", and an audience split of US 28% / UK 18% / Japan 15%
-- All of it is string literals in a module-level const. The 7D / 30D / All-Time
-- tabs change a useState that nothing reads, so the figures never move. A
-- photographer has no way to tell any of it is fiction, and it is presented to
-- them as "Your Analytics".
--
-- That is the single most dishonest thing left in the product, so the wrap is
-- built to replace it rather than to sit beside it. If a number cannot be
-- counted, it does not appear.
--
-- ── WHAT IS DELIBERATELY ABSENT ──────────────────────────────────────────────
-- No profile views: nothing records them, so there is no honest figure to give.
-- No audience-by-country: no location is stored for viewers.
-- No rating: no reviews table exists yet.
-- Better an empty space than a confident lie.
--
-- Requires v15 and v16. Safe to run more than once.
-- =================================================================================

BEGIN;

-- Likes and comments are counted per photographer over a month, so both need
-- their timestamps indexed alongside the item they belong to.
CREATE INDEX IF NOT EXISTS likes_item_created_idx
  ON public.likes (item_id, created_at);
CREATE INDEX IF NOT EXISTS comments_item_created_idx
  ON public.comments (item_id, created_at);

/**
 * One photographer's month.
 *
 * Defaults to the caller and the current month. A user may only ever read
 * their own wrap - p_user_id exists so the function can be reused later for a
 * public "year in review" if that is ever wanted, and it refuses anything else.
 */
CREATE OR REPLACE FUNCTION public.get_my_wrap(
  p_month   DATE DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  month_start       DATE,
  photos_uploaded   INTEGER,
  battles_entered   INTEGER,
  battles_won       INTEGER,
  battles_tied      INTEGER,
  points_earned     INTEGER,
  likes_received    INTEGER,
  comments_received INTEGER,
  win_rate          NUMERIC,
  top_category      TEXT,
  top_style         TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  uid      UUID := COALESCE(p_user_id, auth.uid());
  w_start  TIMESTAMPTZ := date_trunc('month', COALESCE(p_month, CURRENT_DATE)::TIMESTAMPTZ);
  w_end    TIMESTAMPTZ := date_trunc('month', COALESCE(p_month, CURRENT_DATE)::TIMESTAMPTZ) + INTERVAL '1 month';
  pts_part INTEGER := COALESCE(public.battle_setting('points_participate'), 3);
  pts_win  INTEGER := COALESCE(public.battle_setting('points_win'), 10);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to see your month';
  END IF;
  -- You may only read your own wrap.
  IF uid <> auth.uid() AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'You can only view your own wrap';
  END IF;

  RETURN QUERY
  WITH
  my_items AS (
    SELECT id, categories, custom_style, created_at
    FROM portfolio_items WHERE photographer_id = uid
  ),
  uploaded AS (
    SELECT COUNT(*)::INTEGER AS n FROM my_items
    WHERE created_at >= w_start AND created_at < w_end
  ),
  my_battles AS (
    SELECT b.id, b.outcome, b.winner_id, pi.id AS item_id
    FROM photo_battles b
    JOIN my_items pi ON pi.id IN (b.photo_a_id, b.photo_b_id)
    WHERE b.status = 'finalized'
      AND b.finalized_at >= w_start AND b.finalized_at < w_end
      AND b.outcome IS DISTINCT FROM 'no_votes'
  ),
  battle_tally AS (
    SELECT
      COUNT(*)::INTEGER AS entered,
      COUNT(*) FILTER (WHERE outcome = 'decided' AND winner_id = item_id)::INTEGER AS won,
      COUNT(*) FILTER (WHERE outcome = 'tie')::INTEGER AS tied
    FROM my_battles
  ),
  engagement AS (
    SELECT
      (SELECT COUNT(*)::INTEGER FROM likes l
        JOIN my_items mi ON mi.id = l.item_id
        WHERE l.created_at >= w_start AND l.created_at < w_end) AS likes_n,
      (SELECT COUNT(*)::INTEGER FROM comments c
        JOIN my_items mi ON mi.id = c.item_id
        WHERE c.created_at >= w_start AND c.created_at < w_end) AS comments_n
  ),
  top_cat AS (
    SELECT COALESCE(categories[1], 'General') AS cat, COUNT(*) AS n
    FROM my_items
    WHERE created_at >= w_start AND created_at < w_end
    GROUP BY 1 ORDER BY n DESC, cat ASC LIMIT 1
  ),
  top_sty AS (
    SELECT custom_style AS sty, COUNT(*) AS n
    FROM my_items
    WHERE created_at >= w_start AND created_at < w_end
      AND custom_style IS NOT NULL AND btrim(custom_style) <> ''
    GROUP BY 1 ORDER BY n DESC, sty ASC LIMIT 1
  )
  SELECT
    w_start::DATE,
    u.n,
    t.entered,
    t.won,
    t.tied,
    (t.entered * pts_part + t.won * pts_win)::INTEGER,
    e.likes_n,
    e.comments_n,
    -- Win rate is NULL, not 0, when nothing has been decided. Zero would read
    -- as "you lost everything"; null renders as "—".
    CASE WHEN t.entered > 0
         THEN ROUND((t.won::NUMERIC / t.entered) * 100, 0)
         ELSE NULL END,
    (SELECT cat FROM top_cat),
    (SELECT sty FROM top_sty)
  FROM uploaded u, battle_tally t, engagement e;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_wrap(DATE, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_wrap(DATE, UUID) FROM anon;


/**
 * A photographer's own battle history - the list behind the tally.
 * Losses are returned to the OWNER only. They are never published; the product
 * decision is that losses are not shown publicly, not that a photographer may
 * not see their own record.
 */
CREATE OR REPLACE FUNCTION public.get_my_battle_history(p_limit INTEGER DEFAULT 30)
RETURNS TABLE (
  battle_id     UUID,
  finalized_at  TIMESTAMPTZ,
  category      TEXT,
  outcome       TEXT,
  i_won         BOOLEAN,
  my_votes      INTEGER,
  their_votes   INTEGER,
  my_item_id    UUID,
  their_item_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    b.id,
    b.finalized_at,
    b.category,
    b.outcome,
    (b.outcome = 'decided' AND b.winner_id = mine.id),
    CASE WHEN mine.id = b.photo_a_id THEN b.votes_a ELSE b.votes_b END,
    CASE WHEN mine.id = b.photo_a_id THEN b.votes_b ELSE b.votes_a END,
    mine.id,
    CASE WHEN mine.id = b.photo_a_id THEN b.photo_b_id ELSE b.photo_a_id END
  FROM photo_battles b
  JOIN portfolio_items mine
    ON mine.id IN (b.photo_a_id, b.photo_b_id)
   AND mine.photographer_id = auth.uid()
  WHERE b.status = 'finalized'
  ORDER BY b.finalized_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_my_battle_history(INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_battle_history(INTEGER) FROM anon;

COMMIT;
