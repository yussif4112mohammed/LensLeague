-- =================================================================================
-- migration v40 — get_current_brief has never run
--
-- THE BUG, WHICH IS THE ONE THIS PROJECT KEEPS MAKING
--
--     ERROR: column reference "opens_at" is ambiguous
--     It could refer to either a PL/pgSQL variable or a table column.
--
-- get_current_brief RETURNS TABLE (..., opens_at, closes_at, ...). In plpgsql
-- every output column of a RETURNS TABLE is also a variable in scope for the
-- whole body. So
--
--     SELECT * INTO b FROM public.briefs
--      WHERE NOW() >= opens_at AND NOW() < closes_at
--
-- is ambiguous, and the function raises on its first statement. Every call has
-- failed since v35 was applied.
--
-- This is identical to the v29 vote bug - same cause, same shape, same silence.
-- v29's header says so in as many words, and I wrote this function afterwards.
--
-- WHY VERIFY_v35 PASSED ANYWAY, WHICH IS THE MORE USEFUL LESSON
--
-- Eleven checks, all green. Checks 6, 7 and 8 asserted things about the
-- function's SOURCE TEXT - does the body contain this string - and not one
-- check called the function. plpgsql does not validate a body until it runs, so
-- a source-text check is a check that the code was typed, not that it works.
--
-- docs/SECURITY.md already carries the rule: put at least one behavioural check
-- in every VERIFY. VERIFY_v40 calls all four brief functions and looks at what
-- comes back.
--
-- ALSO FIXED: A BRIEF THAT HAS NOT OPENED YET WAS INVISIBLE
--
-- The function looked for an open brief, then fell back to the most recently
-- CLOSED one. A brief scheduled for next week matched neither, so with only a
-- future brief in the table it returned no row - and the screen showed "No
-- brief yet", which is indistinguishable from a platform where nobody has ever
-- set one. The spec's rule is "never an empty page". There is now a third
-- branch: the soonest brief still to come.
--
-- Run once, in the Supabase SQL editor. Then VERIFY_v40.sql.
-- =================================================================================
BEGIN;

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
  -- Every reference to a briefs column is qualified with its alias. Not style:
  -- an unqualified one collides with this function's own output columns and
  -- raises at runtime, which is the bug this migration exists to fix.

  -- 1. The brief running right now.
  SELECT br.* INTO b
  FROM public.briefs br
  WHERE NOW() >= br.opens_at AND NOW() < br.closes_at
  LIMIT 1;

  -- 2. Failing that, the one that closed most recently, so the page can show
  --    what the last constraint was and what came in for it.
  IF b.id IS NULL THEN
    SELECT br.* INTO b
    FROM public.briefs br
    WHERE br.closes_at <= NOW()
    ORDER BY br.closes_at DESC
    LIMIT 1;
  END IF;

  -- 3. Failing that, the soonest one still to come. Without this branch a brief
  --    scheduled for next week is invisible and the screen says nothing has
  --    ever been set.
  IF b.id IS NULL THEN
    SELECT br.* INTO b
    FROM public.briefs br
    WHERE br.opens_at > NOW()
    ORDER BY br.opens_at ASC
    LIMIT 1;
  END IF;

  -- Genuinely nothing. The screen says so, and that is now true.
  IF b.id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.title, b.prompt, b.category, b.opens_at, b.closes_at,
    (NOW() >= b.opens_at AND NOW() < b.closes_at)                 AS is_open,
    GREATEST(0, EXTRACT(EPOCH FROM (b.closes_at - NOW()))::INT)   AS seconds_remaining,
    (SELECT count(*) FROM public.brief_entries e WHERE e.brief_id = b.id)::INT,
    (SELECT count(DISTINCT e.user_id) FROM public.brief_entries e WHERE e.brief_id = b.id)::INT,
    (SELECT count(*) FROM public.brief_entries e
      WHERE e.brief_id = b.id AND e.user_id = auth.uid())::INT,
    v_max,
    (SELECT MIN(nb.opens_at) FROM public.briefs nb WHERE nb.opens_at > NOW());
END;
$fn$;

COMMIT;
