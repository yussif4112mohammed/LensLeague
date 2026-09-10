-- =================================================================================
-- WHAT DO albums AND portfolio_items ACTUALLY LOOK LIKE?
--
-- v25 failed on `a.client_id does not exist`. migration_v3's CREATE TABLE for
-- albums DOES define client_id - but it is CREATE TABLE IF NOT EXISTS, so if the
-- table already existed from an earlier source, v3's definition was skipped
-- entirely and the live shape is somebody else's.
--
-- That also explains the original bug. v3's policy block references client_id;
-- against a table without that column it would ERROR, aborting the rest of the
-- block - which is exactly why albums and portfolio_items ended up with RLS
-- enabled and no policies while every other table got its own.
--
-- v25 is atomic (BEGIN/COMMIT) so nothing partial was applied; the whole thing
-- rolled back. This reads the real columns so the rewrite matches the database
-- instead of the migration file.
-- =================================================================================
SELECT
  c.table_name                                   AS "table",
  c.ordinal_position                             AS "#",
  c.column_name                                  AS column,
  c.data_type                                    AS type,
  CASE WHEN c.is_nullable = 'YES' THEN 'null ok' ELSE 'NOT NULL' END AS nullable,
  COALESCE(c.column_default, '')                 AS default_value
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN ('albums', 'portfolio_items')
ORDER BY c.table_name, c.ordinal_position;
