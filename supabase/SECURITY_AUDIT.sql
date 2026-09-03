-- =================================================================================
-- LENSLEAGUE SECURITY AUDIT — READ ONLY
-- ---------------------------------------------------------------------------------
-- Run this in the Supabase SQL editor BEFORE migration v18.
-- It writes nothing. It only reports what the live database actually allows.
--
-- Every row is a claim the static review made about the code. This proves or
-- disproves each one against the running system, because a migration file on
-- disk is not evidence that the database is in that state.
--
-- Read the RESULT column. Anything that says FAIL is a live vulnerability.
-- =================================================================================

WITH

-- ── S1. PRIVATE MESSAGES ─────────────────────────────────────────────────────
-- The claim: any signed-in user can insert themselves into ANY message thread,
-- then read every message in it.
--
-- The chain has two links:
--   (a) get_or_create_thread(a, b) is SECURITY DEFINER with no check that the
--       caller is a or b, so it hands back the thread id of any pair.
--   (b) the thread_participants INSERT policy is WITH CHECK (auth.uid() IS NOT
--       NULL) — i.e. "anyone signed in", not "you, in your own thread".
-- Either link alone is bad. Together they are a full DM compromise.
s1_policy AS (
  SELECT
    'S1a' AS id,
    'thread_participants INSERT policy' AS check_name,
    COALESCE(
      (SELECT string_agg(polname || ' => ' || COALESCE(pg_get_expr(polwithcheck, polrelid), 'no WITH CHECK'), ' | ')
         FROM pg_policy
        WHERE polrelid = 'public.thread_participants'::regclass
          AND polcmd IN ('a', '*')),
      'no INSERT policy'
    ) AS found,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policy
       WHERE polrelid = 'public.thread_participants'::regclass
         AND polcmd IN ('a', '*')
         AND pg_get_expr(polwithcheck, polrelid) LIKE '%IS NOT NULL%'
         AND pg_get_expr(polwithcheck, polrelid) NOT LIKE '%thread_id%'
    ) THEN 'FAIL — anyone signed in can join any thread'
         ELSE 'ok' END AS result
),
s1_grant AS (
  SELECT
    'S1b' AS id,
    'direct INSERT grant on thread_participants' AS check_name,
    COALESCE((SELECT string_agg(DISTINCT grantee, ', ')
                FROM information_schema.role_table_grants
               WHERE table_schema = 'public' AND table_name = 'thread_participants'
                 AND privilege_type = 'INSERT'
                 AND grantee IN ('anon', 'authenticated')), 'none') AS found,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.role_table_grants
                       WHERE table_schema = 'public' AND table_name = 'thread_participants'
                         AND privilege_type = 'INSERT' AND grantee IN ('anon','authenticated'))
         THEN 'FAIL — client roles can write thread membership directly'
         ELSE 'ok' END AS result
),
s1_fn AS (
  SELECT
    'S1c' AS id,
    'get_or_create_thread restricts the caller' AS check_name,
    CASE WHEN p.prosrc LIKE '%auth.uid()%' THEN 'checks auth.uid()' ELSE 'no caller check' END AS found,
    CASE WHEN p.prosrc LIKE '%auth.uid()%'
         THEN 'ok'
         ELSE 'FAIL — returns any two users'' private thread id to any caller' END AS result
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_or_create_thread'
),

-- ── S2. POINT FARMING VIA THE QUEUE RPC ──────────────────────────────────────
-- The claim: queue_portfolio_item_for_battle(item_id) is granted to
-- authenticated, takes any item id, and checks neither ownership nor whether
-- that photograph is already in an open battle. The unique indexes stop a photo
-- being photo_a twice, but nothing stops it being photo_a of one battle and
-- photo_b of another — two participation awards for one upload, repeatable.
s2 AS (
  SELECT
    'S2' AS id,
    'queue_portfolio_item_for_battle guards' AS check_name,
    CASE WHEN p.prosrc LIKE '%auth.uid()%' THEN 'has ownership check' ELSE 'NO ownership check' END
      || ', ' ||
    CASE WHEN p.prosrc LIKE '%already in a battle%' OR p.prosrc LIKE '%photo_b_id = p_item_id%'
         THEN 'has open-battle check' ELSE 'NO open-battle check' END
      || ', callable by: ' ||
    COALESCE((SELECT string_agg(DISTINCT r.rolname, ', ')
                FROM pg_roles r
               WHERE r.rolname IN ('anon','authenticated')
                 AND has_function_privilege(r.oid, p.oid, 'EXECUTE')), 'nobody') AS found,
    CASE WHEN p.prosrc LIKE '%auth.uid()%' THEN 'ok'
         ELSE 'FAIL — any user can queue any photograph, repeatedly' END AS result
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'queue_portfolio_item_for_battle'
),

-- ── S3. THE ENGINE'S OWN POINT AWARD IS BLOCKED ──────────────────────────────
-- The claim: auth.uid() reads a JWT setting, NOT the database role. SECURITY
-- DEFINER changes the role and leaves that setting alone. So inside
-- finalize_battle(), auth.uid() is still the voter — and the v11 guard trigger
-- on profiles silently reverts any change to points/wins for a non-admin, while
-- the v15 trigger reverts battles_played.
--
-- Consequence: battles finish, but nobody is ever paid. The leaderboard stays
-- empty forever and Your Month always reads zero. This is not a leak; it is the
-- engine quietly not working, which is the harder kind of bug to notice.
s3 AS (
  SELECT
    'S3' AS id,
    'profile guard triggers let the battle engine write' AS check_name,
    (SELECT string_agg(t.tgname, ', ' ORDER BY t.tgname)
       FROM pg_trigger t
      WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal) AS found,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname IN ('guard_profile_privileged_columns','guard_battles_played')
         AND p.prosrc LIKE '%engine%'
    ) THEN 'ok — guards recognise the engine'
      ELSE 'FAIL — guards revert points/wins/battles_played awarded by finalize_battle' END AS result
),

-- ── S4. DEFINER FUNCTIONS WITHOUT A PINNED search_path ───────────────────────
-- A SECURITY DEFINER function with a mutable search_path can be made to call
-- an attacker's object instead of the intended one. Supabase's own linter flags
-- this. Lists every offender rather than checking one.
s4 AS (
  SELECT
    'S4' AS id,
    'SECURITY DEFINER functions with unpinned search_path' AS check_name,
    COALESCE((SELECT string_agg(p.proname, ', ' ORDER BY p.proname)
                FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname = 'public' AND p.prosecdef
                 AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}'::text[])) AS c
                                  WHERE c LIKE 'search_path=%')), 'none') AS found,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.prosecdef
         AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}'::text[])) AS c
                          WHERE c LIKE 'search_path=%'))
    THEN 'FAIL — pin these' ELSE 'ok' END AS result
),

-- ── S5. THE THINGS THAT MUST NEVER BE CLIENT-WRITABLE ────────────────────────
-- Votes and battle rows carry the result. If a client role can UPDATE either
-- one directly, every other control in the engine is decoration.
s5 AS (
  SELECT
    'S5' AS id,
    'direct writes to photo_battles / photo_battle_votes' AS check_name,
    COALESCE((SELECT string_agg(table_name || ':' || privilege_type || ':' || grantee, ', ')
                FROM information_schema.role_table_grants
               WHERE table_schema = 'public'
                 AND table_name IN ('photo_battles','photo_battle_votes')
                 AND privilege_type IN ('INSERT','UPDATE','DELETE')
                 AND grantee IN ('anon','authenticated')), 'none — good') AS found,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.role_table_grants
                       WHERE table_schema = 'public'
                         AND table_name IN ('photo_battles','photo_battle_votes')
                         AND privilege_type IN ('INSERT','UPDATE','DELETE')
                         AND grantee IN ('anon','authenticated'))
         THEN 'FAIL — scores are forgeable' ELSE 'ok' END AS result
),

-- ── S6. RLS ENABLED EVERYWHERE ───────────────────────────────────────────────
-- A public table with RLS off is readable and writable by anyone holding the
-- anon key, which is shipped in the browser bundle by design.
s6 AS (
  SELECT
    'S6' AS id,
    'tables in public with RLS disabled' AS check_name,
    COALESCE((SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
                FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity),
             'none — good') AS found,
    CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                       WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity)
         THEN 'FAIL — enable RLS on these' ELSE 'ok' END AS result
),

-- ── S7. STORAGE ──────────────────────────────────────────────────────────────
-- A bucket with no MIME allow-list accepts an HTML file, which then serves from
-- your domain. A bucket with no size limit is a billing incident.
s7 AS (
  SELECT
    'S7' AS id,
    'buckets without a MIME allow-list or size limit' AS check_name,
    COALESCE((SELECT string_agg(id, ', ' ORDER BY id) FROM storage.buckets
               WHERE allowed_mime_types IS NULL OR file_size_limit IS NULL), 'none — good') AS found,
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets
                       WHERE allowed_mime_types IS NULL OR file_size_limit IS NULL)
         THEN 'FAIL — constrain these buckets' ELSE 'ok' END AS result
),

-- ── S8. PROFILE COLUMN PRIVILEGE ─────────────────────────────────────────────
-- v11 revoked table-wide SELECT and re-granted a column list, so email and
-- phone stay private. A later `GRANT SELECT ON profiles` anywhere would undo it
-- silently, because table privileges are additive to column privileges.
s8 AS (
  SELECT
    'S8' AS id,
    'table-wide SELECT on profiles (would expose email/phone)' AS check_name,
    COALESCE((SELECT string_agg(DISTINCT grantee, ', ')
                FROM information_schema.role_table_grants
               WHERE table_schema='public' AND table_name='profiles'
                 AND privilege_type='SELECT' AND grantee IN ('anon','authenticated')),
             'none — column grants only, good') AS found,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.role_table_grants
                       WHERE table_schema='public' AND table_name='profiles'
                         AND privilege_type='SELECT' AND grantee IN ('anon','authenticated'))
         THEN 'FAIL — contact details are readable by everyone' ELSE 'ok' END AS result
)

SELECT id, check_name, found, result FROM (
  SELECT * FROM s1_policy
  UNION ALL SELECT * FROM s1_grant
  UNION ALL SELECT * FROM s1_fn
  UNION ALL SELECT * FROM s2
  UNION ALL SELECT * FROM s3
  UNION ALL SELECT * FROM s4
  UNION ALL SELECT * FROM s5
  UNION ALL SELECT * FROM s6
  UNION ALL SELECT * FROM s7
  UNION ALL SELECT * FROM s8
) audit
ORDER BY id;
