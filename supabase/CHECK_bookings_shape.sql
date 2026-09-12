-- =================================================================================
-- WHAT DOES bookings LOOK LIKE?
--
-- The reviews fix needs it. A review should only be writable by somebody who was
-- actually party to the booking it refers to - otherwise anyone can review
-- anyone, which is worse than no reviews at all in a hiring marketplace.
--
-- To express that I need the real column names on bookings, and whether it
-- carries a status I can require ('completed', or whatever this schema calls
-- it). I am asking instead of reading migration_v3, which has now misled me
-- three times: albums.client_id, job_requests, and the assumption that
-- portfolio_items had rows.
-- =================================================================================
SELECT
  c.ordinal_position                  AS "#",
  c.column_name                       AS column,
  c.data_type                         AS type,
  COALESCE(c.column_default, '')      AS default_value,
  COALESCE(
    (SELECT string_agg(cc.check_clause, ' ')
       FROM information_schema.constraint_column_usage ccu
       JOIN information_schema.check_constraints cc
         ON cc.constraint_name = ccu.constraint_name
      WHERE ccu.table_schema = 'public'
        AND ccu.table_name = 'bookings'
        AND ccu.column_name = c.column_name),
    '') AS allowed_values
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'bookings'
ORDER BY c.ordinal_position;
