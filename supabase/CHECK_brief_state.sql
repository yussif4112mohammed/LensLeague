-- =================================================================================
-- CHECK: why does /brief say "No brief yet"?
--
-- That message is the screen's last fallback: it appears only when
-- get_current_brief() returns NO ROW AT ALL. There are two ways to get there
-- and they need different fixes, so this distinguishes them before anything is
-- changed.
--
--   A. No brief was created. The admin form failed and said so quietly, or the
--      insert was refused. Section 1 will be empty.
--
--   B. A brief exists but has not opened yet. get_current_brief looks for an
--      open brief, then falls back to the most recently CLOSED one - and has no
--      branch for "scheduled, not started". With only a future brief in the
--      table it returns nothing, and the screen cannot tell that apart from an
--      empty platform. That is a gap in the function, not in what you typed.
--
-- Section 3 shows the server's own clock, because a window that looks right in
-- a datetime-local field can still be in the future once it reaches UTC.
--
-- Read-only. ONE query.
-- =================================================================================
SELECT
  '1. BRIEFS IN THE TABLE'::TEXT AS section,
  b.title::TEXT                  AS detail,
  (CASE
     WHEN NOW() <  b.opens_at  THEN 'SCHEDULED - opens in '   || (b.opens_at - NOW())::TEXT
     WHEN NOW() >= b.closes_at THEN 'CLOSED - ended '         || (NOW() - b.closes_at)::TEXT || ' ago'
     ELSE                           'OPEN - closes in '       || (b.closes_at - NOW())::TEXT
   END)::TEXT                    AS state,
  b.opens_at::TEXT               AS opens_at_utc,
  b.closes_at::TEXT              AS closes_at_utc
FROM public.briefs b

UNION ALL

SELECT
  '2. WHAT get_current_brief RETURNS',
  COALESCE(g.title, '(no row - this is why the screen says "No brief yet")'),
  CASE WHEN g.id IS NULL THEN 'nothing' ELSE 'is_open=' || g.is_open::TEXT END,
  COALESCE(g.opens_at::TEXT, '-'),
  COALESCE(g.closes_at::TEXT, '-')
FROM (SELECT 1) one
LEFT JOIN LATERAL public.get_current_brief() g ON TRUE

UNION ALL

SELECT
  '3. THE SERVER CLOCK',
  'now, in UTC',
  NOW()::TEXT,
  '-',
  '-'

ORDER BY 1, 4;
