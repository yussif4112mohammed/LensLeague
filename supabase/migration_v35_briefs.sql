-- =================================================================================
-- migration v35 — The Brief
--
-- Specified in docs/SPEC-the-brief.md, first in the build order in
-- docs/PRODUCT.md. The spec calls this migration v20; v20 was taken by
-- notifications while the spec sat unbuilt, so it is v35. Everything else in
-- the spec is implemented as written, except where the spec was wrong about the
-- existing schema, which is noted at each point.
--
-- WHY THIS FEATURE EXISTS
--
-- When the live database was introspected on 2026-09-01 it held zero portfolio
-- items. Every system downstream - battles, points, recognition, the monthly
-- wrap - is built, correct, and idle, because nothing is being uploaded. Upload
-- is currently an open-ended invitation, and an open-ended invitation is the
-- easiest thing in the world to postpone. A constraint removes the hardest
-- decision (what to shoot) and makes the results worth scrolling, because two
-- hundred answers to one question compare and two hundred unrelated photographs
-- do not.
--
-- THE FOUR RULES, AND WHY THEY ARE HERE AND NOT IN THE BROWSER
--
--   1. One open brief at a time.
--   2. At most three entries per photographer per brief.
--   3. An entry must be a photograph uploaded DURING the brief window.
--   4. Entering is what queues a photograph for battle. No second path.
--
-- Rule 3 is the one that carries the whole feature. The point is to make
-- somebody go and shoot, not to make them search their archive - so it is
-- checked against portfolio_items.created_at, in the database, where a client
-- cannot skip it by calling PostgREST directly.
--
-- Rule 1 is an exclusion constraint on the time range rather than a flag,
-- because a flag can be wrong and a range cannot overlap. Two briefs whose
-- windows touch cannot both exist even if inserted by hand at three in the
-- morning.
--
-- WHERE THE SPEC WAS WRONG ABOUT THE SCHEMA
--
--   * It types category_id as uuid. categories.id is SERIAL. More to the point,
--     portfolio_items stores categories as TEXT[] and photo_battles keys on a
--     category TEXT, so a brief scoped by integer id could not be compared to
--     either without a join the engine does not do. Scoped by name instead,
--     with a foreign key to categories(name), which is UNIQUE.
--   * It does not mention moderation. v34 added it, so an entry must be
--     visible work.
--
-- REQUIRES v34 (portfolio_items.moderation_status). Guarded below.
-- Run once, in the Supabase SQL editor. Then VERIFY_v35.sql.
-- =================================================================================
BEGIN;

DO $require$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'portfolio_items'
      AND column_name = 'moderation_status'
  ) THEN
    RAISE EXCEPTION 'v35 requires v34: portfolio_items.moderation_status is missing. Apply migration v34 first.';
  END IF;
END
$require$;

-- ---------------------------------------------------------------------------
-- The brief itself. Platform-controlled, like categories: an uncontrolled list
-- becomes a taxonomy nobody maintains, which is why photographers cannot
-- propose one.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.briefs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL CHECK (btrim(title) <> ''),
  prompt      TEXT        NOT NULL CHECK (btrim(prompt) <> ''),
  category    TEXT        REFERENCES public.categories(name) ON DELETE SET NULL,
  opens_at    TIMESTAMPTZ NOT NULL,
  closes_at   TIMESTAMPTZ NOT NULL,
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT briefs_window_forwards CHECK (closes_at > opens_at)
);

-- Rule 1, as a constraint rather than a convention. gist over a range: two
-- briefs may not overlap, so "the open brief" is always at most one row.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $excl$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'briefs_no_overlap' AND conrelid = 'public.briefs'::REGCLASS
  ) THEN
    ALTER TABLE public.briefs
      ADD CONSTRAINT briefs_no_overlap
      EXCLUDE USING gist (tstzrange(opens_at, closes_at, '[)') WITH &&);
  END IF;
END
$excl$;

CREATE INDEX IF NOT EXISTS idx_briefs_window ON public.briefs (opens_at DESC, closes_at DESC);

-- ---------------------------------------------------------------------------
-- Entries. The primary key is the rule "one photograph enters once".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brief_entries (
  brief_id   UUID        NOT NULL REFERENCES public.briefs(id)          ON DELETE CASCADE,
  item_id    UUID        NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id)        ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (brief_id, item_id)
);

-- The gallery reads newest-first within a brief; the cap counts a person's
-- entries within a brief. One index each, because both are on every request.
CREATE INDEX IF NOT EXISTS idx_brief_entries_gallery ON public.brief_entries (brief_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brief_entries_by_user ON public.brief_entries (brief_id, user_id);

-- How many a photographer may enter. In a settings row rather than a literal
-- scattered through three functions, so retuning it is one UPDATE.
INSERT INTO public.battle_settings (key, value, description)
VALUES ('brief_max_entries', 3, 'How many photographs one person may enter in a single brief.')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS. Briefs are public reading. Nothing writes either table directly: the
-- grant is revoked rather than left behind a policy, so a later GRANT cannot
-- quietly reopen a rule this migration spent effort enforcing.
-- ---------------------------------------------------------------------------
ALTER TABLE public.briefs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS briefs_select        ON public.briefs;
DROP POLICY IF EXISTS brief_entries_select ON public.brief_entries;

CREATE POLICY briefs_select ON public.briefs
  FOR SELECT TO anon, authenticated
  USING (opens_at <= NOW() OR public.is_staff());

CREATE POLICY brief_entries_select ON public.brief_entries
  FOR SELECT TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.briefs        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.brief_entries FROM anon, authenticated;
GRANT  SELECT                 ON public.briefs        TO anon, authenticated;
GRANT  SELECT                 ON public.brief_entries TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_current_brief()
--
-- One call, so the upload screen and the brief screen cannot disagree about
-- whether a brief is open or how many entries the caller has left.
--
-- When nothing is open it returns the most recent brief that has closed, with
-- is_open false. The screen then shows the last constraint and when the next
-- one starts, rather than an empty page - the spec's "never an empty page".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_brief()
RETURNS TABLE (
  id                 UUID,
  title              TEXT,
  prompt             TEXT,
  category           TEXT,
  opens_at           TIMESTAMPTZ,
  closes_at          TIMESTAMPTZ,
  is_open            BOOLEAN,
  seconds_remaining  INT,
  entries_total      INT,
  photographers      INT,
  my_entries         INT,
  max_entries        INT,
  next_opens_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  b     public.briefs;
  v_max INT := GREATEST(1, COALESCE(public.battle_setting('brief_max_entries'), 3));
BEGIN
  SELECT * INTO b
  FROM public.briefs
  WHERE NOW() >= opens_at AND NOW() < closes_at
  LIMIT 1;

  IF b.id IS NULL THEN
    SELECT * INTO b
    FROM public.briefs
    WHERE closes_at <= NOW()
    ORDER BY closes_at DESC
    LIMIT 1;
  END IF;

  IF b.id IS NULL THEN
    RETURN;  -- no brief has ever run; the screen says so rather than inventing one
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.title, b.prompt, b.category, b.opens_at, b.closes_at,
    (NOW() >= b.opens_at AND NOW() < b.closes_at)                              AS is_open,
    GREATEST(0, EXTRACT(EPOCH FROM (b.closes_at - NOW()))::INT)                AS seconds_remaining,
    (SELECT count(*)            FROM public.brief_entries e WHERE e.brief_id = b.id)::INT,
    (SELECT count(DISTINCT e.user_id) FROM public.brief_entries e WHERE e.brief_id = b.id)::INT,
    (SELECT count(*)            FROM public.brief_entries e
      WHERE e.brief_id = b.id AND e.user_id = auth.uid())::INT,
    v_max,
    (SELECT MIN(nb.opens_at) FROM public.briefs nb WHERE nb.opens_at > NOW());
END;
$fn$;

-- ---------------------------------------------------------------------------
-- enter_brief(item_id)
--
-- All four rules, server-side, in one transaction.
--
-- The queue call is wrapped: uploading already queues a photograph
-- automatically, so by the time somebody enters a brief the photograph is
-- usually in a battle already, and queue_portfolio_item_for_battle raises on
-- that. Entering a brief must not fail because the platform already did the
-- thing entering was supposed to trigger.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enter_brief(p_item_id UUID)
RETURNS TABLE (brief_id UUID, entries_used INT, entries_left INT, battle_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_caller   UUID := auth.uid();
  b          public.briefs;
  v_owner    UUID;
  v_created  TIMESTAMPTZ;
  v_status   TEXT;
  v_max      INT := GREATEST(1, COALESCE(public.battle_setting('brief_max_entries'), 3));
  v_used     INT;
  v_battle   UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to enter a brief';
  END IF;

  SELECT * INTO b
  FROM public.briefs
  WHERE NOW() >= opens_at AND NOW() < closes_at
  LIMIT 1;

  IF b.id IS NULL THEN
    RAISE EXCEPTION 'No brief is open right now';
  END IF;

  SELECT pi.photographer_id, pi.created_at, pi.moderation_status
    INTO v_owner, v_created, v_status
  FROM public.portfolio_items pi
  WHERE pi.id = p_item_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Photograph not found';
  END IF;

  IF v_owner <> v_caller THEN
    RAISE EXCEPTION 'You can only enter your own photographs';
  END IF;

  IF v_status <> 'visible' THEN
    RAISE EXCEPTION 'That photograph has been removed and cannot be entered';
  END IF;

  -- Rule 3. The whole point of the feature: go and shoot it.
  IF v_created < b.opens_at OR v_created >= b.closes_at THEN
    RAISE EXCEPTION
      'This brief takes photographs made during its window. Shoot something new and upload it.';
  END IF;

  SELECT count(*) INTO v_used
  FROM public.brief_entries e
  WHERE e.brief_id = b.id AND e.user_id = v_caller;

  IF v_used >= v_max THEN
    RAISE EXCEPTION 'You have entered % photographs already, which is the limit for this brief', v_max;
  END IF;

  INSERT INTO public.brief_entries (brief_id, item_id, user_id)
  VALUES (b.id, p_item_id, v_caller)
  ON CONFLICT (brief_id, item_id) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That photograph is already entered in this brief';
  END IF;

  -- Rule 4. Entering is what queues it. Already queued is a success, not a
  -- failure - the photograph is competing either way, which is what was asked.
  BEGIN
    v_battle := public.queue_portfolio_item_for_battle(p_item_id);
  EXCEPTION WHEN OTHERS THEN
    v_battle := NULL;
  END;

  RETURN QUERY SELECT b.id, (v_used + 1), (v_max - v_used - 1), v_battle;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- get_brief_entries(brief_id, limit, cursor)
--
-- Keyset paginated on created_at, not OFFSET: at ten thousand entries an OFFSET
-- page reads and discards everything before it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_brief_entries(
  p_brief_id UUID DEFAULT NULL,
  p_limit    INT DEFAULT 30,
  p_cursor   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  item_id       UUID,
  media_url     TEXT,
  caption       TEXT,
  width         INT,
  height        INT,
  entered_at    TIMESTAMPTZ,
  owner_id      UUID,
  owner_name    TEXT,
  owner_avatar  TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_brief UUID := p_brief_id;
BEGIN
  IF v_brief IS NULL THEN
    SELECT br.id INTO v_brief
    FROM public.briefs br
    WHERE NOW() >= br.opens_at AND NOW() < br.closes_at
    LIMIT 1;
  END IF;

  IF v_brief IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.item_id,
    pi.media_url,
    pi.caption,
    pi.width,
    pi.height,
    e.created_at AS entered_at,
    pi.photographer_id AS owner_id,
    pr.name            AS owner_name,
    pr.avatar_url      AS owner_avatar
  FROM public.brief_entries e
  JOIN public.portfolio_items pi ON pi.id = e.item_id
  JOIN public.profiles        pr ON pr.id = pi.photographer_id
  WHERE e.brief_id = v_brief
    AND pi.moderation_status = 'visible'
    AND pr.banned = false
    AND (p_cursor IS NULL OR e.created_at < p_cursor)
  ORDER BY e.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 100));
END;
$fn$;

-- ---------------------------------------------------------------------------
-- admin_create_brief(...)
--
-- Briefs are platform-controlled, so setting one is an operator action with a
-- permission check and an audit trail - not a hand-written INSERT that leaves
-- no record of who chose the prompt.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_brief(
  p_title     TEXT,
  p_prompt    TEXT,
  p_opens_at  TIMESTAMPTZ,
  p_closes_at TIMESTAMPTZ,
  p_category  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.user_has_permission('manage_challenges') THEN
    RAISE EXCEPTION 'Unauthorized: missing manage_challenges permission';
  END IF;

  INSERT INTO public.briefs (title, prompt, category, opens_at, closes_at, created_by)
  VALUES (btrim(p_title), btrim(p_prompt), NULLIF(btrim(COALESCE(p_category, '')), ''),
          p_opens_at, p_closes_at, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'BRIEF_CREATED', 'brief', v_id,
          jsonb_build_object('title', p_title, 'opens_at', p_opens_at, 'closes_at', p_closes_at));

  RETURN v_id;
EXCEPTION WHEN exclusion_violation THEN
  -- Rule 1, surfacing as something a person can act on rather than a
  -- constraint name.
  RAISE EXCEPTION 'That window overlaps a brief that already exists. One brief runs at a time.';
END;
$fn$;

-- ---------------------------------------------------------------------------
-- admin_get_briefs — what has run, what is running, what is scheduled.
--
-- Staff-only, and it deliberately includes briefs that have not opened yet,
-- which the briefs_select policy hides from everybody else. A prompt leaking
-- early turns "go and shoot this" into "here is a week to prepare an answer",
-- which is a different and much weaker product.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_briefs(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id            UUID,
  title         TEXT,
  prompt        TEXT,
  category      TEXT,
  opens_at      TIMESTAMPTZ,
  closes_at     TIMESTAMPTZ,
  state         TEXT,
  entries_total INT,
  photographers INT,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NOT public.user_has_permission('manage_challenges') THEN
    RAISE EXCEPTION 'Unauthorized: missing manage_challenges permission';
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.title, b.prompt, b.category, b.opens_at, b.closes_at,
    CASE
      WHEN NOW() <  b.opens_at  THEN 'scheduled'
      WHEN NOW() >= b.closes_at THEN 'closed'
      ELSE 'open'
    END::TEXT AS state,
    (SELECT count(*)                  FROM public.brief_entries e WHERE e.brief_id = b.id)::INT,
    (SELECT count(DISTINCT e.user_id) FROM public.brief_entries e WHERE e.brief_id = b.id)::INT,
    b.created_at
  FROM public.briefs b
  ORDER BY b.opens_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$fn$;

-- ---------------------------------------------------------------------------
-- Matching preference: two answers to the same constraint is a fair comparison;
-- a golden-hour frame against an unrelated street photograph is not.
--
-- A preference, not a filter. The ORDER BY puts a same-brief opponent first and
-- falls back to the normal queue, so a brief entry is never left waiting for a
-- partner that does not exist.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.queue_portfolio_item_for_battle(p_item_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  item_category TEXT;
  item_owner    UUID;
  item_band     SMALLINT;
  item_brief    UUID;
  opponent      public.photo_battles;
  battle_id     UUID;
  widen_after   INTERVAL := (public.battle_setting('band_widen_hours') || ' hours')::INTERVAL;
BEGIN
  SELECT COALESCE(categories[1], 'General'), photographer_id
    INTO item_category, item_owner
    FROM portfolio_items WHERE id = p_item_id;
  IF item_owner IS NULL THEN RAISE EXCEPTION 'Portfolio item not found'; END IF;

  -- You may only enter your own photographs.
  IF item_owner <> auth.uid() AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'You can only enter your own photographs into a battle';
  END IF;

  -- One open battle per photograph. This is the line that closes the farm.
  IF EXISTS (
    SELECT 1 FROM photo_battles
     WHERE status IN ('queued', 'active')
       AND (photo_a_id = p_item_id OR photo_b_id = p_item_id)
  ) THEN
    RAISE EXCEPTION 'This photograph is already in a battle';
  END IF;

  SELECT public.experience_band(battles_played) INTO item_band
    FROM profiles WHERE id = item_owner;

  -- v35: which brief this photograph answers, if any. Used as a PREFERENCE in
  -- the ORDER BY below and never as a filter, so a brief entry is never left
  -- waiting for a partner that does not exist.
  SELECT e.brief_id INTO item_brief
    FROM brief_entries e WHERE e.item_id = p_item_id LIMIT 1;

  -- Keep the engine current while we are here.
  PERFORM public.finalize_due_battles(10);

  SELECT * INTO opponent
    FROM photo_battles b
   WHERE b.status = 'queued'
     AND b.category = item_category
     AND b.photo_a_id <> p_item_id
     AND (b.band = item_band OR b.queued_at < NOW() - widen_after)
     AND NOT EXISTS (
       SELECT 1 FROM portfolio_items pi
        WHERE pi.id = b.photo_a_id AND pi.photographer_id = item_owner
     )
   ORDER BY (
              item_brief IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM brief_entries be
                 WHERE be.item_id = b.photo_a_id AND be.brief_id = item_brief
              )
            ) DESC,
            (b.band = item_band) DESC,
            b.queued_at ASC
   LIMIT 1
     FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    UPDATE photo_battles
       SET photo_b_id = p_item_id,
           status     = 'active',
           closes_at  = NOW() + (public.battle_setting('battle_hours') || ' hours')::INTERVAL
     WHERE id = opponent.id
    RETURNING id INTO battle_id;
  ELSE
    INSERT INTO photo_battles (photo_a_id, category, band, queued_at)
    VALUES (p_item_id, item_category, item_band, NOW())
    RETURNING id INTO battle_id;
  END IF;

  RETURN battle_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.queue_portfolio_item_for_battle(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.queue_portfolio_item_for_battle(UUID) TO authenticated;

-- The gist index the preference above reads on every queue call.
CREATE INDEX IF NOT EXISTS idx_brief_entries_item ON public.brief_entries (item_id);

REVOKE EXECUTE ON FUNCTION public.enter_brief(UUID)                                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_briefs(INT)                               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_brief(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_current_brief()                                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_brief_entries(UUID, INT, TIMESTAMPTZ)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enter_brief(UUID)                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_briefs(INT)                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_brief(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

COMMIT;
