# LensLeague — Database

Supabase Postgres. The database is the source of truth for this product: battle
results, points, ranking and eligibility are decided here, not in the browser.

Verified against the repository and the live database on 2026-09-03/04.

## How migrations work here

`supabase/` is raw SQL applied **by hand**, in numerical order, through the
Supabase SQL editor. There is no Supabase CLI, no generated types, no local
Postgres, and — importantly — **no migrations table.**

That last point has a consequence worth internalising: a migration file on disk is
not evidence the database is in that state. `supabase/CHECK_migration_state.sql`
exists to answer the question honestly, by probing for the objects each migration
creates. Run it before assuming anything.

When you change data shape, add the next `migration_vN_*.sql`. Never edit one that
has been applied.

The convention that has grown up around this, and is worth keeping:

    SECURITY_AUDIT.sql        read-only, run BEFORE a security migration
    migration_vN_*.sql        the change itself, wrapped in one BEGIN/COMMIT
    VERIFY_vN.sql             read-only, run AFTER; every row should say PASS

Every migration is written to be safe to run more than once.

## State as of 2026-09-04

`schema.sql` is the v1 baseline. v2 through v19 follow.

**v14 through v19 are applied and verified on production.** VERIFY_v18 returns
20/20 PASS, VERIFY_v19 returns 9/9 PASS, and SECURITY_AUDIT comes back clean.

**Migration v3 never ran.** This was discovered by introspecting the live database
on 2026-09-01, and it is the single most important fact in this file's history: v3
was the migration that introduced the messaging, portfolio and profile shapes the
frontend was already written against. Five tables and nineteen columns were
missing, every `profiles` select was failing RLS, and the UI had been quietly
falling back to in-memory mock data. That is why the app appeared to be hardcoded
and why nothing persisted. Migration v14 reconciled it — moving the database to
the frontend's design where that design was better, which was affordable only
because the content tables were still empty.

## Schema drift

Legacy and current tables coexist, and some writes still target both for backward
compatibility. This is deliberate and not yet cleaned up.

| Legacy | Current |
| --- | --- |
| `photos` | `portfolio_items` and `albums` |
| `messages.recipient_id` | `message_threads`, `thread_participants`, `messages.thread_id` |
| feed read from `portfolio_items` | `posts` and the `get_feed` RPC |

Note also that the storage bucket named `photos` is unrelated to the table named
`photos`. Nothing writes to that bucket; all real uploads go to `post-media`, and
avatars to `avatars`. `supabase.from('photos')` in the client is the table.

## The competition domain

`src/lib/elo.js` is pure Elo maths, K=32. It is used **only** as the mock-mode
fallback. Real battles are decided server-side and the client's Elo path never
runs against a live database.

Persisted battles live in `photo_battles` (v10). Without v10 applied, `AppContext`
generates battles client-side by pairing photographs of matching aspect ratio.

The engine as it stands after v15:

- A battle runs for 24 hours and closes on whatever votes it received. It may
  close sooner only when already decided: at least 10 votes and a margin the
  remaining time cannot plausibly overturn. One rule that resolves in 24 hours on
  a small platform and in minutes on a large one.
- A tie is a tie. Both photographers are credited for taking part and neither
  wins. v10 broke ties in favour of whoever was queued first, which at low vote
  counts was the most-hit path in the system.
- Zero votes is not a loss. Both photographs requeue once and nobody is scored.
- Points are positive-sum: +3 to enter, +10 to win. Values live in
  `battle_settings`, not in literals scattered across migrations, so retuning the
  engine moves the leaderboard with it.

Ranking (v16) is defined once, in `get_leaderboard`, using `DENSE_RANK` so equal
points genuinely share a position. All-time reads `profiles.points`; this-month is
derived from finalised battles using the same values from `battle_settings`, so
the two scopes cannot drift apart. Banned and deactivated accounts are excluded.

The monthly wrap (v17) is `get_my_wrap` and `get_month_stats`. Every number it
returns is counted. It deliberately reports no profile views, no audience by
country and no rating, because nothing records them.

## RPCs the frontend calls

    admin_console_access          admin_resolve_report
    admin_resolve_dispute         admin_set_user_verified
    admin_set_user_banned         cast_photo_battle_vote
    get_leaderboard               get_month_stats
    get_my_battle_history         get_my_wrap
    get_or_create_thread          get_room_recognition
    is_username_available         queue_portfolio_item_for_battle
    search_posts                  search_users

`get_feed` also exists. Privileged work goes through these; the browser does not
write privileged columns directly.

## Discrepancy to resolve

Migration v17's header states that no `reviews` table exists, which is why the
monthly wrap reports no rating. But `reviews` is created in `schema.sql` and again
in `migration_v2.sql`, both of which appear to have been applied. Either the table
exists and is unused, or the comment is stale. Check the live database before
building anything that depends on ratings, and correct whichever is wrong.

## Next

`migration_v20_briefs.sql`, for the feature specified in docs/SPEC-the-brief.md.
