-- =================================================================================
-- DOES THE HIRING HALF OF LENSLEAGUE ACTUALLY WORK?
--
-- Everything fixed so far has been the photographer side. The client side - a
-- person finding a photographer and booking them - is the other half of the
-- product and has never been proven end to end. The inquiry path in particular
-- has not been exercised since migrations v21 and v22 repaired the triggers that
-- had silently broken every threaded message and every booking since July.
--
-- COUNTS FIRST, CODE SECOND. That is the lesson from portfolio_items: it read as
-- a young platform for eleven migrations while it was in fact refusing every
-- write. Three days were spent fixing empty states on a table that could not
-- hold a row. One COUNT(*) would have said so immediately.
--
-- A zero below does not prove breakage - nobody may simply have tried yet. But a
-- zero next to a working UI is the exact shape that hid the upload bug, so each
-- row says what its zero would mean.
-- =================================================================================
WITH pol AS (
  SELECT tablename AS t,
         string_agg(DISTINCT cmd, ',' ORDER BY cmd) AS cmds,
         COUNT(*) AS n
    FROM pg_policies WHERE schemaname = 'public'
   GROUP BY tablename
), rls AS (
  SELECT c.relname AS t, c.relrowsecurity AS on
    FROM pg_class c JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
   WHERE nsp.nspname = 'public' AND c.relkind = 'r'
), tbl AS (
  SELECT 'bookings'        AS t, 1 AS ord, (SELECT COUNT(*) FROM public.bookings)        AS n,
         'a client hiring a photographer - the point of the marketplace' AS what
  UNION ALL SELECT 'job_requests',     2, (SELECT COUNT(*) FROM public.job_requests),
         'a client posting work for photographers to answer'
  UNION ALL SELECT 'proposals',        3, (SELECT COUNT(*) FROM public.proposals),
         'a photographer answering a posted job'
  UNION ALL SELECT 'counter_offers',   4, (SELECT COUNT(*) FROM public.counter_offers),
         'negotiation on a booking'
  UNION ALL SELECT 'payments',         5, (SELECT COUNT(*) FROM public.payments),
         'money. zero is expected - nothing charges yet'
  UNION ALL SELECT 'reviews',          6, (SELECT COUNT(*) FROM public.reviews),
         'a client rating a completed shoot'
  UNION ALL SELECT 'message_threads',  7, (SELECT COUNT(*) FROM public.message_threads),
         'v21 and v22 fixed this path; a thread exists, so at least one worked'
  UNION ALL SELECT 'messages',         8, (SELECT COUNT(*) FROM public.messages),
         'the messages inside those threads'
  UNION ALL SELECT 'thread_participants', 9, (SELECT COUNT(*) FROM public.thread_participants),
         'two rows per conversation; an odd number means a half-built thread'
  UNION ALL SELECT 'booking_state_events', 10, (SELECT COUNT(*) FROM public.booking_state_events),
         'the audit trail of a booking changing hands'
)
SELECT
  tbl.ord                                    AS "#",
  tbl.t                                      AS "table",
  tbl.n                                      AS rows,
  CASE WHEN r.on THEN 'ON' ELSE 'off' END    AS rls,
  COALESCE(p.cmds, '(NONE)')                 AS policies,
  CASE
    WHEN r.on AND COALESCE(p.n, 0) = 0
      THEN '*** RLS ON, NO POLICY - this table refuses every write, like albums did'
    WHEN r.on AND COALESCE(p.cmds,'') NOT LIKE '%INSERT%' AND COALESCE(p.cmds,'') NOT LIKE '%ALL%'
      THEN '*** no INSERT path - a client cannot create one of these'
    WHEN r.on AND COALESCE(p.cmds,'') NOT LIKE '%SELECT%' AND COALESCE(p.cmds,'') NOT LIKE '%ALL%'
      THEN '*** no SELECT path - created but never readable'
    WHEN tbl.n = 0 THEN 'writable, but never used: ' || tbl.what
    ELSE 'in use: ' || tbl.what
  END                                        AS verdict
FROM tbl
LEFT JOIN rls r ON r.t = tbl.t
LEFT JOIN pol p ON p.t = tbl.t
ORDER BY
  CASE WHEN r.on AND COALESCE(p.n,0) = 0 THEN 0 ELSE 1 END,
  tbl.ord;
