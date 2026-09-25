-- =================================================================================
-- VERIFY v40 — the brief functions, CALLED
--
-- VERIFY_v35 ran eleven checks against these same functions and passed while
-- get_current_brief could not execute a single statement. Every one of its
-- checks asked about the function's source text. plpgsql does not validate a
-- body until it runs, so that proved the code had been typed.
--
-- These checks call the functions. If a body is broken, this page errors
-- instead of reassuring you - which is the correct behaviour for a verifier and
-- is what VERIFY_v35 should have done.
--
-- Every row must read PASS. ONE query.
-- =================================================================================
WITH called AS (
  -- If get_current_brief raises, the whole statement fails here. That is the point.
  SELECT * FROM public.get_current_brief()
),
entries AS (
  SELECT count(*)::INT AS n FROM public.get_brief_entries(NULL, 5, NULL)
),
stats AS (
  SELECT
    (SELECT count(*) FROM public.briefs)::INT        AS briefs_total,
    (SELECT count(*) FROM public.briefs
      WHERE NOW() >= opens_at AND NOW() < closes_at)::INT AS briefs_open,
    (SELECT count(*) FROM public.briefs WHERE opens_at > NOW())::INT AS briefs_scheduled,
    (SELECT count(*) FROM called)::INT              AS rows_returned,
    (SELECT n FROM entries)::INT                    AS entries_returned
),
checks(n, ok, label) AS (

  SELECT 1, TRUE,
         'GET_CURRENT_BRIEF RAN WITHOUT RAISING'

  UNION ALL
  SELECT 2, (SELECT s.entries_returned FROM stats s) >= 0,
         'get_brief_entries ran without raising'

  UNION ALL
  SELECT 3, (SELECT count(*) FROM called) = CASE
              WHEN (SELECT s.briefs_total FROM stats s) = 0 THEN 0 ELSE 1 END,
         'it returns exactly one brief when any brief exists, and none when none does'

  UNION ALL
  SELECT 4, NOT EXISTS (
           SELECT 1 FROM called c
           WHERE c.is_open AND (NOW() < c.opens_at OR NOW() >= c.closes_at)
         ),
         'a brief reported open really is inside its window'

  UNION ALL
  SELECT 5, NOT EXISTS (SELECT 1 FROM called c WHERE NOT c.is_open AND c.seconds_remaining > 0),
         'a brief that is not open has no time left on it'

  UNION ALL
  -- The gap that made a scheduled brief invisible.
  SELECT 6, (SELECT s.briefs_total FROM stats s) = 0
            OR (SELECT count(*) FROM called) = 1,
         'A SCHEDULED BRIEF IS STILL RETURNED, NOT TREATED AS NOTHING'

  UNION ALL
  SELECT 7, NOT EXISTS (
           SELECT 1 FROM called c WHERE c.max_entries IS NULL OR c.max_entries < 1
         ),
         'the entry cap comes back as a real number'
)
SELECT
  c.n,
  CASE WHEN c.ok THEN 'PASS' ELSE 'FAIL' END AS result,
  c.label,
  s.briefs_total,
  s.briefs_open,
  s.briefs_scheduled,
  s.rows_returned
FROM checks c
CROSS JOIN stats s
ORDER BY c.n;
