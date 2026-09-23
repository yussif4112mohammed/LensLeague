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

## The v34 audit, and what it found

Three more, found by reading the live database rather than the files.

**S9 — high. The `disputes` table was world-writable.** `schema.sql` created

    CREATE POLICY "Allow admin operations on disputes"
      ON public.disputes FOR ALL USING (true);

with the comment "Full policy validation done at application level". No later
migration dropped it. `FOR ALL USING (true)` granted to `public` includes `anon`,
so anyone holding the anon key — which ships in the browser bundle by design —
could read, edit and delete every dispute.

The identical policy on `reports` is gone, but only by accident: v7 dropped and
recreated that table, and the policy died with it. Nothing recreated `disputes`.
That is worth sitting with. The hole was closed by a migration that was not
trying to close it, and the one next to it survived for the same reason.

Fixed by dropping the policy, revoking INSERT, UPDATE and DELETE from `anon` and
`authenticated` outright — nothing in the client ever wrote to the table — and
reading it through `admin_get_disputes`, which checks its caller.

**S10 — medium. `SECURITY DEFINER` functions with no pinned `search_path`.**
This document claimed every one of them pinned it. The v4–v7 series did not:
`user_has_permission`, `admin_get_reports`, `log_admin_report_action`, the v5
booking triggers and the v6 messaging triggers all ran with whatever
`search_path` the caller brought. A function that runs as its owner and resolves
table names through a caller-controlled path is the textbook escalation shape.

Fixed as a **sweep, not a list**: v34 loops over every `SECURITY DEFINER`
function in `public` whose `proconfig` carries no `search_path` and issues
`ALTER FUNCTION ... SET search_path = public, pg_temp`. `ALTER` changes the
setting without touching the body, so it cannot break a function by rewriting it
from a stale copy on disk — which matters, because the files in `supabase/` are
not proof of what is live. VERIFY_v34 check 3 asserts the count is zero across
every function, so one added later without a pinned path fails that page.

**S11 — high, and not a database hole at all. Moderation did nothing.** The
"Remove Photo" button called `admin_resolve_report`, which writes a status onto
the *report* row. The photograph stayed public. A moderator pressed Remove, the
queue cleared, and the reported content was still in the feed — the failure mode
where the screen says the job is done.

Fixed with a real moderation state on `portfolio_items`, enforced in the RLS
policy rather than in each query, so every read path is covered including ones
written later by somebody who does not know the rule exists. `search_posts` is
`SECURITY DEFINER` and therefore ignores RLS, so it filters removed work itself —
that is the read path most likely to leak it back into the product, and
VERIFY_v34 check 8 asserts it.

Removal is reversible and records who did it, when, and why. A moderation action
that cannot be undone or defended is one nobody will take.

## The checklist, item by item

A common web-security checklist, audited against this repository on 2026-09-22.
Every row says where the rule is actually enforced, because "we do input
validation" means nothing until you can name the line that refuses the input.

| Item | Where it lives | State |
| --- | --- | --- |
| **Rate limiting** | `rate_limits` policy rows plus `BEFORE INSERT` triggers (v24, extended in v37). Covers upload, comment, follow, like, thread, message, report, booking, review and brief entry. Counters are `SECURITY DEFINER` and unwritable by clients. Supabase Auth rate-limits sign-in separately. | Done |
| **Input validation** | Length bounds on every user-typed column (v37), `CHECK` constraints on enums and ratings, and `enter_brief` validating ownership, window and cap. Client-side validation exists too and is treated as a hint. | Done |
| **Sanitise user input** | React escapes interpolated text, and nothing in `src/` uses `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` — checked, not assumed. The two places that escape React's protection are `href` and inline `style`, both now routed through `src/lib/safeUrl.js`. | Done |
| **Never expose API keys** | Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` reach the bundle. The anon key is public by design; RLS is what protects the data behind it. No service-role key appears anywhere in `src/`. `.gitignore` covers `.env` and `.env.*` with `!.env.example`, and only `.env.example` is tracked. | Done |
| **Rotate secrets** | Not a code control. See "What only a person can do" below. | Owner action |
| **`.env` variables** | `.env.example` is committed; `.env.local` is ignored. A build with no keys now shows a banner rather than silently serving mock data. | Done |
| **SQL injection** | The browser talks to PostgREST, which parameterises. Inside the database, every dynamic statement uses `format()` with `%I`/`%L`; the `EXECUTE` calls in v11 are static literals. Checked across all migrations. | Done |
| **CSRF** | Not applicable in the classic sense: Supabase authenticates with a bearer token in a header, not an ambient cookie, so a cross-site form post carries no credential. `form-action 'self'` and `frame-ancestors 'none'` are set regardless. | N/A by design |
| **Session expiration** | JWTs expire and refresh on Supabase's schedule; `autoRefreshToken`, `persistSession` and `detectSessionInUrl` are now stated explicitly in `supabaseClient.js` rather than inherited, so a library default changing is a decision and not a surprise. | Done |
| **Hash passwords** | Supabase Auth does it. This codebase never receives, stores or compares a password, which is the property worth protecting. | Done |
| **XSS** | The `href` built from `profiles.website` used to be guarded by `startsWith('http') ? w : 'https://' + w`, which neutralised `javascript:` **by accident** — the prefix made the scheme unparseable — and would have stopped doing so the moment anyone tidied the line. Now an explicit scheme allow-list in `safeUrl.js`, the same rule as a `CHECK` on the column (v37), and two `backgroundImage: url(...)` interpolations routed through `cssUrl()`. CSP is `script-src 'self'` with no `unsafe-eval`. | Done |
| **File upload** | Bucket-level MIME allow-list and a 15 MiB cap (v19); `image/svg+xml` permanently excluded, because an SVG is an XML document that can carry `<script>` and would serve from our own origin. Write policies scoped to `(storage.foldername(name))[1] = auth.uid()::text` on every bucket (v32). | Done |
| **Scan dependencies** | `npm audit --omit=dev --audit-level=high` now fails CI; the dev tree is audited advisory-only. The split is deliberate: a vulnerability in vitest is a risk to whoever runs the build, not to a visitor, and one combined number is a number nobody acts on. Runtime tree currently reports zero. | Done |
| **Security headers** | `vercel.json`: CSP, HSTS with preload, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP, CORP, `frame-src 'none'`, `worker-src`. | Done |
| **CORS** | There is no server of ours to configure. Supabase sets its own CORS; `connect-src` in the CSP limits the browser to `*.supabase.co` over HTTPS and WSS. | Done |
| **HTTPS everywhere** | HSTS with a two-year max-age and preload, plus `upgrade-insecure-requests` in the CSP. `lens-league.vercel.app` 308-redirects to `https://lensleague.app`. | Done |
| **Applicable compliance** | Terms, privacy and guidelines pages exist and are routed. v37 adds `export_my_data()` and a two-step account deletion that is honest about the part only an operator can do. | Done, pending legal review |

### What only a person can do

These cannot be fixed by a migration and are listed so they are not mistaken for done.

- **Rotate the Supabase anon key** if it has ever been pasted anywhere public, and rotate the database password on a schedule. The anon key is meant to be public, so this is hygiene rather than an incident.
- **Turn on leaked-password protection** in Supabase (Authentication → Policies). It checks new passwords against HaveIBeenPwned. The browser-side strength check in `src/lib/password.js` is guidance; this is the control.
- **Raise the minimum password length** to at least 10 in the same place, to match what signup now asks for.
- **A solicitor reads the legal pages.** They are written; they are not reviewed.

## Running the audit

    supabase/SECURITY_AUDIT.sql     read-only, 10 checks, S1 through S8
    supabase/VERIFY_v18.sql         20 checks
    supabase/VERIFY_v19.sql         9 checks, including a re-run of the S7 rule
    supabase/CHECK_storage_policies.sql   every storage policy, with a verdict
    supabase/VERIFY_v32.sql         storage writes all scoped to auth.uid()
    supabase/VERIFY_v34.sql         12 checks, including the search_path sweep
    supabase/VERIFY_v37.sql         input bounds, rate limits, compliance

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
4. Write the `VERIFY_vN.sql` before you believe the migration worked, and put
   at least one **behavioural** check in it. Structure passes when nothing
   works: `cast_photo_battle_vote` was present, correctly permissioned, and had
   never run to completion.
5. Prefer a sweep to a list. "Every `SECURITY DEFINER` function pins its
   `search_path`" is a rule a future function can satisfy; "these eleven
   functions pin it" is a rule the twelfth breaks silently.
6. Check that something **reads** what you wrote. `admin_get_reports` was
   correct, permission-checked, and called by nothing for the whole time
   moderation appeared to work.
7. Bound the input. Every user-typed column was an unbounded `TEXT` until v37.
   A `maxlength` attribute is a suggestion; the column is the rule.
