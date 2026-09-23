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

## State as of 2026-09-21

`schema.sql` is the v1 baseline. v2 through v36 follow.

**v2 through v32 are applied and verified on production.** VERIFY_v18 returns
20/20 PASS, VERIFY_v19 9/9, VERIFY_v29 7/7, VERIFY_v30 7/7, VERIFY_v31 7/7 and
VERIFY_v32 4/4 with `unchecked_remaining = 0`.

**v33 through v36 are written and NOT applied.** The code that depends on them
is merged, so until they run those features exist in the repository and not in
the product. Apply in order; v35 refuses to run without v34.

| | |
| --- | --- |
| v33 | Collapses `photos` and `posts` into `portfolio_items` |
| v34 | Admin foundation, moderation state, `search_path` sweep, closes the open `disputes` policy |
| v35 | The Brief |
| v36 | Photographer search |

### The v29 finding, which is the most important thing in this file's history

`cast_photo_battle_vote` **had never once run to completion.** Every call raised
`column reference "votes_a" is ambiguous`: the function's own `RETURNS TABLE`
output columns are variables in scope, and the counting `UPDATE` used a bare
`votes_a`, which matched both the column and the variable.

It survived six migrations because **plpgsql does not validate a function body
until it runs.** VERIFY_v15 found the function present and correctly
permissioned — both true. An audit called the engine well built and properly
locked down — also true. It had simply never executed. The lesson is in
VERIFY_v29 check 5, which does not ask whether the function exists: it asks
whether a vote has actually been recorded.

Write at least one behavioural check in every VERIFY. Structure passes when
nothing works.

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
`photos`. Its one object is an orphaned avatar from July that nothing points at.
Real uploads go to `post-media`, and avatars to `avatars`.

### Being removed by v33

A photograph was written to three tables: `portfolio_items`, `photos` and
`posts`. Only `portfolio_items` was ever read. The other two writes ignored their
own results, so when they failed nobody was told and when the schemas drifted
nobody noticed — which is how `alt_text` and `location` were collected from
photographers for months and written to a table that has neither column.

What the database actually said, before v33 was written:

| Table | Rows | Foreign keys pointing at it | Child columns holding data |
| --- | --- | --- | --- |
| `photos` | 0 | 3 | none — all NULL |
| `posts` | 10, 8 of them duplicates | 7 | none — all NULL |

So nothing depended on the data. What depended on those tables was **code**, and
that was the dangerous part: four trigger functions read columns the collapse
deletes, including `tg_notify_like` on every like. plpgsql resolves a column
reference when the function runs, so those branches were harmless until the
column went — the same shape as the v29 bug. v33 rewrites the functions first and
drops the tables second, and deliberately leaves the dead child columns in place,
because removing them means rewriting `public.notify()`, which has not been read.

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

Added by v34 (admin console):

    admin_get_reports             admin_get_disputes
    admin_get_audit_log           admin_get_platform_stats
    admin_remove_content          admin_restore_content

Added by v35 (The Brief), v36 (search) and v37 (limits and compliance):

    get_current_brief             enter_brief
    get_brief_entries             admin_create_brief
    admin_get_briefs              search_photographers
    export_my_data                request_account_deletion
    admin_complete_account_deletion

`admin_get_reports` is worth a note: it existed from v7 and **was never called
once.** The admin console's queue was local React state, so a report filed by a
user was invisible to every moderator forever. An RPC nobody calls is not a
feature; check both halves.

`get_feed` is dropped by v33 — it returned `SETOF posts` and no client code
called it. Privileged work goes through these; the browser does not write
privileged columns directly.

## Resolved: the `reviews` discrepancy

The table exists; v17's header comment was stale. v27 built the rules — a review
requires a completed booking you were party to, one per booking per reviewer,
rating constrained to 1–5, identity fields frozen on edit.

What v27 did not do was connect a review to the number a client reads. Nothing
maintained `profiles.rating` or `profiles.review_count`, and both `ClientHome`
and `ClientSearch` sort and filter on them — so a photographer could collect ten
honest reviews and still read "No reviews yet" on every screen that matters.
v31 added `sync_profile_review_stats`, which recomputes both from the rows rather
than incrementing a counter, so a miscount heals instead of persisting.

VERIFY_v31 passes 7/7, but with `reviews_total = 0` — checks 4 through 7 passed
with nothing to check. The structure is right; **the path has not yet been
exercised by a real review.**

## Next

Build-order item 2, The Weekly Cover. See docs/PRODUCT.md.
