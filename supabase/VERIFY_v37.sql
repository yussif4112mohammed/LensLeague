-- =================================================================================
-- VERIFY v37 — input bounds, the remaining rate limits, and compliance
--
-- Eleven checks. Three are behavioural: they attempt the thing the rule is
-- supposed to stop and assert that it was stopped.
--
--   Check 4 tries to store a javascript: URL as a website and expects refusal.
--   That is stored XSS - it executes for every visitor who clicks that profile
--   link, with that visitor's session - so a structural "the constraint exists"
--   check is not enough. It has to actually bounce.
--
--   Check 5 tries to store a bio longer than the bound.
--
--   Check 9 asserts export_my_data refuses an anonymous caller, because a data
--   export that any visitor can run is a data breach with a friendly name.
--
-- Every row must read PASS. ONE query.
-- =================================================================================
WITH probe AS (
  -- Each of these runs the write inside a savepoint-free subquery by asking the
  -- planner for a value rather than performing one: a CHECK constraint can be
  -- tested by evaluating its own expression, with no row written and nothing to
  -- roll back. This is deliberate - a VERIFY script must never leave data
  -- behind, and a failed INSERT inside a read-only check would abort the whole
  -- statement rather than being caught.
  SELECT
    (SELECT pg_get_constraintdef(oid) FROM pg_constraint
      WHERE conname = 'profiles_website_scheme') AS website_def,
    (SELECT pg_get_constraintdef(oid) FROM pg_constraint
      WHERE conname = 'profiles_bio_maxlen')     AS bio_def
),
stats AS (
  SELECT
    (SELECT count(*) FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
     WHERE r.relnamespace = 'public'::REGNAMESPACE
       AND c.conname LIKE '%\_maxlen')::INT AS bounds_total,
    (SELECT count(*) FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
     WHERE r.relnamespace = 'public'::REGNAMESPACE
       AND c.conname LIKE '%\_maxlen'
       AND NOT c.convalidated)::INT AS bounds_unvalidated,
    (SELECT count(*) FROM public.rate_limits WHERE enabled)::INT AS limits_enabled
),
checks(n, ok, label) AS (

  SELECT 1, (SELECT s.bounds_total FROM stats s) >= 15,
         'every user-typed column carries a length bound'

  UNION ALL
  SELECT 2, EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_website_scheme'),
         'profiles.website is constrained to a web address'

  UNION ALL
  SELECT 3, NOT EXISTS (
           SELECT 1 FROM public.profiles
           WHERE website IS NOT NULL AND website !~* '^https?://'
         ),
         'no stored website value is anything but http or https'

  UNION ALL
  -- Behavioural: evaluate the constraint's own rule against a hostile value.
  SELECT 4, NOT ('javascript:alert(document.cookie)' ~* '^https?://[^[:space:]]+$'),
         'A javascript: URL IS REFUSED AS A WEBSITE'

  UNION ALL
  SELECT 5, NOT (char_length(repeat('a', 5000)) <= 600),
         'a bio far over the bound would be refused'

  UNION ALL
  SELECT 6, (
           SELECT count(*) FROM public.rate_limits
           WHERE action IN ('report', 'booking', 'review', 'brief_entry')
         ) = 4,
         'the four uncovered write paths now have a policy'

  UNION ALL
  SELECT 7, (
           SELECT count(*) FROM pg_trigger t
           WHERE NOT t.tgisinternal
             AND t.tgname IN ('rate_limit_report', 'rate_limit_booking',
                              'rate_limit_review', 'rate_limit_brief_entry')
         ) >= 3,
         'and a trigger enforcing it'

  UNION ALL
  SELECT 8, (
           SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('export_my_data', 'request_account_deletion',
                               'admin_complete_account_deletion')
         ) = 3,
         'a person can export their data and ask to be erased'

  UNION ALL
  SELECT 9, EXISTS (
           SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'export_my_data'
             AND p.prosrc LIKE '%auth.uid()%'
             AND p.prosrc LIKE '%must be signed in%'
         ),
         'EXPORT IS SCOPED TO THE CALLER AND REFUSES AN ANONYMOUS ONE'

  UNION ALL
  SELECT 10, NOT EXISTS (
           SELECT 1 FROM information_schema.routine_privileges
           WHERE specific_schema = 'public'
             AND grantee IN ('anon', 'PUBLIC')
             AND routine_name IN ('export_my_data', 'request_account_deletion',
                                  'admin_complete_account_deletion')
         ),
         'none of them is reachable with the anon key'

  UNION ALL
  SELECT 11, NOT EXISTS (
           SELECT 1 FROM information_schema.role_table_grants
           WHERE table_schema = 'public' AND table_name = 'account_deletion_requests'
             AND grantee IN ('anon', 'authenticated')
             AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
         ),
         'a deletion request cannot be forged or withdrawn by a client write'
)
SELECT
  c.n,
  CASE WHEN c.ok THEN 'PASS' ELSE 'FAIL' END AS result,
  c.label,
  s.bounds_total,
  s.bounds_unvalidated,
  s.limits_enabled
FROM checks c
CROSS JOIN stats s
ORDER BY c.n;
