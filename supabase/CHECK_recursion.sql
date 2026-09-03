-- =================================================================================
-- Is there really a finalize -> queue recursion?  READ ONLY.
-- ---------------------------------------------------------------------------------
-- VERIFY_v15 reported ">> FAIL  no finalize -> queue recursion".
--
-- I believe that check is wrong, not the migration. pg_get_functiondef() returns
-- the function body INCLUDING its comments, and finalize_battle() contains this
-- line of explanation:
--
--     -- Inserted directly rather than via queue_portfolio_item_for_battle().
--
-- A plain LIKE '%queue_portfolio_item_for_battle(%' matches that comment, so the
-- check fires on the very comment that documents the fix.
--
-- This query settles it by showing every line of the real function body that
-- mentions the name, and separately by looking only at code with the comments
-- stripped out. Read the output rather than trusting either of us.
-- =================================================================================

-- 1. Every line mentioning the name, and whether that line is a comment.
SELECT
  '1 LINES MENTIONING IT' AS section,
  CASE WHEN btrim(line) LIKE '--%' THEN 'comment (harmless)'
       ELSE '>> CODE — would recurse' END AS kind,
  btrim(line) AS the_line
FROM (
  SELECT unnest(string_to_array(pg_get_functiondef(oid), E'\n')) AS line
  FROM pg_proc
  WHERE proname = 'finalize_battle' AND pronamespace = 'public'::regnamespace
) t
WHERE line LIKE '%queue_portfolio_item_for_battle%'

UNION ALL

-- 2. The verdict, judged on code only: comment lines removed first.
SELECT
  '2 VERDICT',
  CASE WHEN EXISTS (
    SELECT 1 FROM (
      SELECT unnest(string_to_array(pg_get_functiondef(oid), E'\n')) AS line
      FROM pg_proc
      WHERE proname = 'finalize_battle' AND pronamespace = 'public'::regnamespace
    ) c
    WHERE btrim(c.line) NOT LIKE '--%'
      AND c.line LIKE '%queue_portfolio_item_for_battle%'
  ) THEN '>> FAIL — finalize really does call queue. Recursion is live.'
       ELSE 'OK — the only mentions are comments. No recursion.' END,
  ''

UNION ALL

-- 3. Corroboration: finalize should requeue with a direct INSERT instead.
SELECT
  '3 REQUEUE METHOD',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'finalize_battle' AND pronamespace = 'public'::regnamespace
      AND pg_get_functiondef(oid) LIKE '%INSERT INTO photo_battles%'
  ) THEN 'OK — requeues via direct INSERT, as intended'
       ELSE '>> FAIL — no direct INSERT found; requeue path is missing' END,
  ''
ORDER BY 1, 2;
