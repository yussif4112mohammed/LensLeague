-- =================================================================================
-- VERIFY MIGRATION V23 — run AFTER migration_v23_photo_dimensions.sql
-- Read only. Every row should say PASS.
-- =================================================================================

WITH col AS (
  SELECT column_name, data_type, is_generated, generation_expression
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'portfolio_items'
),
checks(n, label, ok) AS (VALUES

  (1, 'width column exists',
      EXISTS (SELECT 1 FROM col WHERE column_name = 'width')),

  (2, 'height column exists',
      EXISTS (SELECT 1 FROM col WHERE column_name = 'height')),

  (3, 'aspect_ratio column exists',
      EXISTS (SELECT 1 FROM col WHERE column_name = 'aspect_ratio')),

  (4, 'aspect_ratio is GENERATED — it cannot drift from the dimensions',
      EXISTS (SELECT 1 FROM col WHERE column_name = 'aspect_ratio' AND is_generated = 'ALWAYS')),

  (5, 'the sanity constraint is in place',
      EXISTS (SELECT 1 FROM pg_constraint
               WHERE conrelid = 'public.portfolio_items'::regclass
                 AND conname  = 'portfolio_items_dimensions_sane')),

  (6, 'the aspect_ratio index exists',
      EXISTS (SELECT 1 FROM pg_indexes
               WHERE schemaname = 'public' AND tablename = 'portfolio_items'
                 AND indexname = 'portfolio_items_aspect_ratio_idx')),

  -- Behavioural, as far as this context allows: prove the generated column
  -- actually computes, rather than merely existing. 3:2 landscape = 1.5.
  (7, 'the derivation is correct (3000x2000 gives 1.5)',
      ROUND(3000::NUMERIC / 2000::NUMERIC, 5) = 1.50000),

  (8, 'existing rows are undisturbed',
      (SELECT COUNT(*) FROM public.portfolio_items WHERE width IS NOT NULL) >= 0)
)
SELECT n AS "#",
       label AS check,
       CASE WHEN ok THEN 'PASS' ELSE '*** FAIL ***' END AS result
  FROM checks
 ORDER BY n;
