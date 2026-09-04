# LensLeague — Security

The governing rule: **a control that lives in JavaScript is a control an attacker
skips by calling the API directly.** The browser holds the anon key and talks to
PostgREST. Anything that matters is enforced in the database.

Verified against the live database on 2026-09-03/04. Every finding below was
proven against the running system, not inferred from the code.

## The model

Row-level security is enabled on every table in `public`. Privileged operations go
through `SECURITY DEFINER` functions rather than direct table writes:

- **Admin gate** — `admin_console_access`. Not an email comparison.
- **Moderation** — `admin_resolve_report`, `admin_set_user_verified`,
  `admin_set_user_banned`, `admin_resolve_dispute`.
- **Voting** — `cast_photo_battle_vote`. The server awards points, wins and rank;
  guard triggers revert any client write to those columns.
- **Profiles** — table-wide `SELECT` is revoked and re-granted as a column list,
  so `email` and `phone` are not readable by `anon` or `authenticated`. Reads must
  name columns explicitly (`PROFILE_COLUMNS`); `select('*')` fails RLS.

Every `SECURITY DEFINER` function pins `search_path = public, pg_temp`.

## The v18 audit, and what it found

Five live vulnerabilities, all introduced by migrations in the v14–v17 series and
all confirmed against production before being fixed.

**S1 — critical. Any signed-in user could read anyone's private messages.**
A three-call chain, no guessing required. `get_or_create_thread(a, b)` was
`SECURITY DEFINER` and never checked its caller, so it would hand back the thread
id of any two people's conversation. The `thread_participants` INSERT policy was
`WITH CHECK (auth.uid() IS NOT NULL)` — "anyone signed in", not "you, in your own
thread". `messages_select_participant` then let you read the thread, because as
far as it could tell you were a participant.

Worth remembering: that policy was **named** `participants_insert_self_or_thread`.
The name described a rule the predicate did not implement. A static read of the
schema would have called it safe; only querying the live policy caught it.

Fixed by revoking INSERT, UPDATE and DELETE on `thread_participants` and
`message_threads` from `anon` and `authenticated` entirely — nothing in the client
ever wrote to them — dropping the permissive policies, and making
`get_or_create_thread` refuse unless the caller is one of the two participants.

**S2 — high. Unlimited point farming.** `queue_portfolio_item_for_battle` had no
ownership check, so any user could queue any photograph, repeatedly.

**S3 — high. The engine's own point awards were being reverted.** The subtlest one
and worth understanding properly. `auth.uid()` does not read the database role; it
reads a setting PostgREST puts on the connection from the caller's JWT.
`SECURITY DEFINER` changes the role and leaves that setting alone. So inside
`finalize_battle()`, called by a voter, `auth.uid()` is still that voter — and the
v11 and v15 guard triggers, doing exactly what they were built to do, saw a voter
writing to somebody else's points and silently reverted every award.

Battles closed correctly, outcomes were recorded correctly, and nobody was ever
paid. No error anywhere. The leaderboard would have stayed empty forever.

Fixed with `engine_is_writing()`, backed by a transaction-local setting
(`lensleague.engine_write`) that only `finalize_battle` sets. Not a role check and
not a trust flag on a row: PostgREST does not execute client SQL and no function
exposes `set_config`, so a client cannot reach it, and `is_local` means it dies
with the transaction even if something raises. The function is deliberately
`VOLATILE` so the planner re-evaluates it rather than folding a stale answer into
a cached trigger plan.

**S4 — medium.** `get_or_create_thread` ran with an unpinned `search_path`.

**S7 — medium, fixed separately in v19.** The `photos` storage bucket had no MIME
allow-list and no size limit. Without a MIME list it accepts an HTML upload, which
then serves from our own storage origin — a cross-site scripting foothold that the
CSP in `vercel.json` cannot help with, because the file genuinely is on an allowed
origin. Without a size limit it is a billing incident that needs no cleverness.

Constrained to JPEG, PNG, WebP, AVIF, HEIC and HEIF at 15 MiB. `image/svg+xml` is
excluded permanently: an SVG is an XML document that can carry `<script>`, so
allowing it reopens the hole. Vector assets, if ever needed, belong in their own
bucket on a different origin.

Note the limitation honestly: `allowed_mime_types` is checked against the content
type the client declares, not the bytes. It still closes the XSS vector, because
Supabase serves an object under the type it was stored with, so a file declared
`image/jpeg` is treated as an image whatever is inside it.

Bucket visibility was deliberately left unchanged. Constraining what may enter a
bucket is safe; changing who may read it can break URLs that are currently
serving, and the migration cannot see which rows point where.

## Running the audit

    supabase/SECURITY_AUDIT.sql     read-only, 10 checks, S1 through S8
    supabase/VERIFY_v18.sql         20 checks
    supabase/VERIFY_v19.sql         9 checks, including a re-run of the S7 rule

Run the audit before any security migration and the verify after. Read the
`result` column; anything reading FAIL is live.

`VERIFY_v19` check 9 re-runs the audit's own rule across every bucket, so a new
unconstrained bucket is caught rather than discovered later.

## Transport and headers

`vercel.json` sets a strict CSP: scripts `'self'` only, connections limited to
`https://*.supabase.co` and `wss://*.supabase.co`, `frame-ancestors 'none'`,
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. Plus HSTS with
preload and a two-year max-age, `nosniff`, `X-Frame-Options: DENY`,
`strict-origin-when-cross-origin` referrer policy, and a Permissions-Policy
denying camera and microphone outright and allowing geolocation only to self.

A new external origin must be added there or it is blocked in production —
silently, and only in production, which is the worst way to find out.

## When adding a feature

1. Decide the rule in SQL. If the client can skip it, it is not a rule.
2. Pin `search_path` on every `SECURITY DEFINER` function, and check the caller.
3. Grant the narrowest privilege that works. If no client code writes a table
   directly, revoke the grant rather than relying on a policy to hold the line —
   and drop the permissive policy too, so a later innocent `GRANT` cannot reopen it.
4. Write the `VERIFY_vN.sql` before you believe the migration worked.
