-- =================================================================================
-- WHY DID AN UPLOAD NOT APPEAR IN THE FEED?
--
-- Run this as-is. ONE query, because the Supabase editor shows only the last
-- statement's result.
--
-- The feed does not read from local state - it refetches from the database on
-- mount, with this shape:
--
--   from('portfolio_items')
--     .select('*, albums!inner(privacy_level), profiles:photographer_id(<24 cols>)')
--     .eq('albums.privacy_level', 'public')
--     .order('created_at', desc).range(start, end)
--
-- So a photograph is invisible if ANY of these is true, and this tells us which:
--   A. the row was never inserted (the publish failed and said it succeeded)
--   B. the row's album is not public, so the !inner join drops it
--   C. RLS hides portfolio_items or albums from the reader
--   D. one column in the profiles embed is unreadable, in which case PostgREST
--      rejects the WHOLE select and the feed comes back empty for everyone -
--      this codebase's signature failure, and the reason PROFILE_COLUMNS exists
-- =================================================================================
WITH rows_total AS (
  SELECT COUNT(*) AS n FROM public.portfolio_items
), rows_recent AS (
  SELECT COUNT(*) AS n FROM public.portfolio_items
   WHERE created_at > NOW() - INTERVAL '3 days'
), rows_public AS (
  SELECT COUNT(*) AS n
    FROM public.portfolio_items pi
    JOIN public.albums a ON a.id = pi.album_id
   WHERE a.privacy_level = 'public'
), rows_orphaned AS (
  -- No album row at all, or an album the inner join cannot match. These are
  -- invisible to the feed no matter what else is right.
  SELECT COUNT(*) AS n
    FROM public.portfolio_items pi
    LEFT JOIN public.albums a ON a.id = pi.album_id
   WHERE a.id IS NULL
), rows_private AS (
  SELECT COUNT(*) AS n
    FROM public.portfolio_items pi
    JOIN public.albums a ON a.id = pi.album_id
   WHERE a.privacy_level IS DISTINCT FROM 'public'
), dims AS (
  SELECT COUNT(*) AS n FROM public.portfolio_items WHERE width IS NOT NULL
), missing_cols AS (
  -- Every name in the client's PROFILE_COLUMNS must exist on profiles. One
  -- absent name makes PostgREST refuse the entire feed select.
  SELECT string_agg(c, ', ') AS names FROM (
    SELECT c FROM unnest(ARRAY[
      'id','username','name','display_name','bio','location',
      'avatar','avatar_url','cover_url','website',
      'role','account_type','verified','banned'
    ]) AS c
    WHERE c NOT IN (SELECT column_name FROM information_schema.columns
                     WHERE table_schema='public' AND table_name='profiles')
  ) q
), rls AS (
  SELECT
    (SELECT COUNT(*) FROM pg_policies WHERE tablename='portfolio_items' AND cmd IN ('SELECT','ALL')) AS pi_read,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename='albums'          AND cmd IN ('SELECT','ALL')) AS al_read
), findings AS (
  SELECT 1 AS n, 'portfolio_items rows, all time' AS label,
         (SELECT n::TEXT FROM rows_total) AS value,
         'zero here means nothing was ever inserted - cause A' AS meaning
  UNION ALL SELECT 2, 'uploaded in the last 3 days',
         (SELECT n::TEXT FROM rows_recent),
         'zero while you did upload means the publish failed silently - cause A'
  UNION ALL SELECT 3, 'visible to the feed (public album)',
         (SELECT n::TEXT FROM rows_public),
         'this is the number the feed can show. zero is the bug'
  UNION ALL SELECT 4, 'rows with NO album row',
         (SELECT n::TEXT FROM rows_orphaned),
         'invisible to the feed regardless of anything else - cause B'
  UNION ALL SELECT 5, 'rows in a non-public album',
         (SELECT n::TEXT FROM rows_private),
         'dropped by the inner join on privacy_level - cause B'
  UNION ALL SELECT 6, 'rows carrying measured dimensions',
         (SELECT n::TEXT FROM dims),
         'rows uploaded since v23. 0 with rows present means old uploads only'
  UNION ALL SELECT 7, 'PROFILE_COLUMNS names missing from profiles',
         COALESCE(NULLIF((SELECT names FROM missing_cols), ''), 'none'),
         'anything but none breaks the WHOLE feed select for everyone - cause D'
  UNION ALL SELECT 8, 'read policies on portfolio_items / albums',
         (SELECT pi_read::TEXT || ' / ' || al_read::TEXT FROM rls),
         'a 0 on either side means RLS hides it from the reader - cause C'
)
SELECT n AS "#", label, value, meaning FROM findings ORDER BY n;
