-- =================================================================================
-- CHECK 3: what breaks the moment posts and photos are gone
--
-- Check 2 showed that all eleven child columns are empty, so they drop cleanly.
-- It also showed something more serious, which is why this third check exists.
--
-- Four trigger functions read columns that the collapse deletes:
--
--   tg_notify_like     reads NEW.post_id   on likes
--   tg_notify_comment  reads NEW.photo_id  on comments
--   on_like_insert     reads NEW.post_id   on likes
--   on_like_delete     reads OLD.post_id   on likes
--
-- plpgsql resolves a column reference when the function RUNS, not when it is
-- created. Today those branches are simply never taken, because the columns are
-- always NULL. But drop `likes.post_id` while a trigger function still says
-- NEW.post_id, and that function raises on EVERY like - the feature stops
-- working outright. Same shape as the vote bug: a body that parses fine and
-- fails only when reached.
--
-- So before writing the migration I need to know which of those four are
-- actually attached as triggers, and to what. That is section 1.
--
-- Section 2 asks a second question the collapse forces. `on_post_insert` is the
-- ONLY thing maintaining profiles.posts_count, and it fires on inserts into
-- `posts`. Drop that table and every photographer's post count silently freezes
-- forever. The same applies to like_count and comment_count on portfolio_items:
-- if nothing in the database maintains them, they are already wrong, and I need
-- to know that BEFORE I write a migration that claims to fix counters.
--
-- Read-only. ONE query.
-- =================================================================================
WITH counter_truth AS (
  SELECT
    count(*)                                                              AS items,
    count(*) FILTER (WHERE COALESCE(pi.like_count, 0)    <> lc.n)         AS like_mismatch,
    count(*) FILTER (WHERE COALESCE(pi.comment_count, 0) <> cc.n)         AS comment_mismatch,
    COALESCE(sum(lc.n), 0)                                                AS real_likes,
    COALESCE(sum(cc.n), 0)                                                AS real_comments,
    COALESCE(sum(COALESCE(pi.like_count, 0)), 0)                          AS stored_likes,
    COALESCE(sum(COALESCE(pi.comment_count, 0)), 0)                       AS stored_comments
  FROM public.portfolio_items pi
  CROSS JOIN LATERAL (SELECT count(*) AS n FROM public.likes    l WHERE l.item_id = pi.id) lc
  CROSS JOIN LATERAL (SELECT count(*) AS n FROM public.comments c WHERE c.item_id = pi.id) cc
),
profile_truth AS (
  SELECT
    count(*)                                                                      AS profiles,
    count(*) FILTER (
      WHERE COALESCE(NULLIF(to_jsonb(pr) ->> 'posts_count', ''), '0')::INT <> pc.n
    )                                                                             AS mismatch,
    COALESCE(sum(COALESCE(NULLIF(to_jsonb(pr) ->> 'posts_count', ''), '0')::INT), 0) AS stored_total,
    COALESCE(sum(pc.n), 0)                                                        AS real_total
  FROM public.profiles pr
  CROSS JOIN LATERAL (
    SELECT count(*) AS n FROM public.portfolio_items pi WHERE pi.photographer_id = pr.id
  ) pc
),
findings AS (

  SELECT '1. TRIGGERS ON THE CHILD TABLES'::TEXT AS section,
         (child.relname || '.' || tg.tgname)::TEXT AS item,
         pg_get_triggerdef(tg.oid)::TEXT AS detail,
         CASE
           WHEN pr.proname IN ('tg_notify_like', 'tg_notify_comment', 'on_like_insert', 'on_like_delete')
             THEN 'MUST BE REWRITTEN before the column it reads is dropped'
           ELSE 'unaffected'
         END::TEXT AS verdict
  FROM pg_trigger tg
  JOIN pg_class child ON child.oid = tg.tgrelid
  JOIN pg_proc  pr    ON pr.oid    = tg.tgfoid
  WHERE NOT tg.tgisinternal
    AND child.relnamespace = 'public'::REGNAMESPACE
    AND child.relname IN (
      'likes', 'comments', 'notifications', 'saved_items', 'saved_posts',
      'votes', 'competition_entries', 'mentions', 'post_hashtags', 'post_shares',
      'follows', 'profiles'
    )

  UNION ALL
  SELECT '2. ARE THE COUNTERS ALREADY WRONG',
         'portfolio_items.like_count',
         t.stored_likes::TEXT || ' stored vs ' || t.real_likes::TEXT || ' real like rows',
         CASE WHEN t.like_mismatch = 0 THEN 'CORRECT - something is maintaining it'
              ELSE t.like_mismatch::TEXT || ' of ' || t.items::TEXT
                   || ' items are wrong - nothing is maintaining it' END
  FROM counter_truth t

  UNION ALL
  SELECT '2. ARE THE COUNTERS ALREADY WRONG',
         'portfolio_items.comment_count',
         t.stored_comments::TEXT || ' stored vs ' || t.real_comments::TEXT || ' real comment rows',
         CASE WHEN t.comment_mismatch = 0 THEN 'CORRECT - something is maintaining it'
              ELSE t.comment_mismatch::TEXT || ' of ' || t.items::TEXT
                   || ' items are wrong - nothing is maintaining it' END
  FROM counter_truth t

  UNION ALL
  SELECT '2. ARE THE COUNTERS ALREADY WRONG',
         'profiles.posts_count',
         p.stored_total::TEXT || ' stored vs ' || p.real_total::TEXT || ' real portfolio_items rows',
         CASE WHEN p.mismatch = 0 THEN 'CORRECT today - but on_post_insert is what keeps it so'
              ELSE p.mismatch::TEXT || ' of ' || p.profiles::TEXT
                   || ' profiles are wrong - it counts posts, not portfolio_items' END
  FROM profile_truth p
)
SELECT f.section, f.item, f.detail, f.verdict
FROM findings f
ORDER BY f.section, f.item;
