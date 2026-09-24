# LensLeague — Status

What is built, what is half-built, what is not started, and what is waiting on
somebody. One page, kept honest.

Legend: ✅ done and verified · 🟡 partly built · 🔴 not started · ⚠️ blocked on
an action only the founder can take.

Last reconciled: 2026-09-24. Verified against the working tree and the test
suite, not against memory. Where a row says ⚠️ the code is finished and the
database change it needs has not been applied yet — see **Waiting on you**.

---

## Waiting on you

Migrations in this project are applied by hand through the Supabase SQL editor.
Four are written, reviewed and unapplied. Until they run, the features below
exist in the codebase and not in the product.

**All migrations are applied.** v33 through v39 are live on production and every
VERIFY passes. Two were fixed mid-flight, both the same mistake — assuming a
column's type instead of asking the database:

| | |
| --- | --- |
| v38 | `search_photographers` declared `starting_rate TEXT`; the column is INTEGER. plpgsql does not check a function body against its declared result type until it RUNS, so v36 created cleanly and the first real call failed. VERIFY_v36 caught it because two of its checks call the function. |
| v37 | The same column appeared in the length-bounds list, so the migration aborted on `char_length(integer)`. The loop now checks each column's real `data_type` and skips anything that is not text. |
| v39 | **Nobody had ever held the admin role.** v7 built the whole role system and never inserted a row into `user_roles`, so `/admin` refused everyone — including the founder — from the day it was written. That is also why the disconnected moderation queue went unreported for months: nobody could open the page to see it was empty. |

Also outstanding, and not something code can fix:

- ⚠️ **Custom SMTP.** Supabase's built-in mail is capped at 2 emails per hour.
  That number caps the beta, not the product. Resend or Postmark, then set it in
  Supabase → Authentication → Emails.
- ⚠️ **Branch protection** on `master`: restrict deletions, block force pushes.
- ⚠️ **Leaked-password protection** and a 10-character minimum, in Supabase →
  Authentication → Policies. The strength meter added to signup is guidance; this
  is the control.
- ✅ **Google sign-in tested on production** after the PKCE change. The callback
  now carries `?code=` rather than `#access_token=`, and sign-in works.
- ⚠️ **Legal review** of `/terms`, `/privacy`, `/guidelines` by a solicitor.
- ⚠️ **One booking, end to end,** with a real second account, through to a
  written review — the only way to know the reviews path works on production.

---

## Photographer experience

| | Area | Notes |
| --- | --- | --- |
| ✅ | Portfolio and uploads | Upload → storage → `portfolio_items` → gallery, feed and battle queue. EXIF read in the browser, dimensions measured, image downscaled before upload. |
| ✅ | Profile identity | Name, bio, location, specialisms, gear, style, starting rate, availability. Avatar and banner with a real cropper. |
| ✅ | Battles | Server-side engine: 24-hour box, early close when decided, ties finish as ties, zero votes requeues, points from `battle_settings`. |
| ✅ | Recognition | Four tiers per category room, no ranked ladder, no losses shown. |
| ✅ | Monthly wrap | `get_my_wrap` — every number counted, none invented. |
| ✅ | The Brief | Built: tables, four rules in SQL, three RPCs, the screen, the upload toggle, the feed card, an operator panel to set each week's. Needs v35. |
| 🟡 | Analytics | A page exists and reads real counts. Thin: no views, no reach, because nothing records them. |
| 🔴 | Achievements | Nothing beyond recognition tiers and wins. |
| 🔴 | Opportunities | Jobs, events, brand work, second-shooter calls, collaborations. Not started. Phase 2 — see **Deliberately later**. |
| 🔴 | The Weekly Cover | Build-order item 2. Not started; it needs The Brief in front of it. |

## Client / hiring experience

| | Area | Notes |
| --- | --- | --- |
| ✅ | Search photographers | Was filtering 100 cached profiles — photographer 101 was unfindable by name. Now a database search with category, minimum rating, availability and four honest sorts. Needs v36. |
| ✅ | View portfolios | Public profile with gallery, specialisms, rate, availability. |
| ✅ | Message a photographer | Real threads, realtime, opened from the profile. |
| ✅ | Request a booking | Booking row plus an opening message; a failed message is now reported rather than swallowed. |
| ✅ | Reviews | Written after a completed booking; `profiles.rating` and `review_count` maintained by trigger (v31). Structurally verified, **not yet exercised by a real review**. |
| 🟡 | Saved photographers | Saving works; the saved screen is thin. |
| 🔴 | Compare photographers | Not started. |
| 🔴 | Real availability | `availability_status` is free text. No calendar, no dates. |

## Competition system

| | Area | Notes |
| --- | --- | --- |
| ✅ | Voting | `cast_photo_battle_vote`. The ambiguity bug that meant it had **never once run to completion** was fixed in v29; the platform's first vote followed. |
| ✅ | Finalisation | `pg_cron` every ten minutes (v30). |
| ✅ | Points and ranking | Server-side, positive-sum, values in `battle_settings`. |
| ⚠️ | Brief-aware matching | Battles prefer two answers to the same constraint, falling back to the normal queue. Needs v35. |
| 🔴 | Reputation drives client search | Build-order item 3. The `ORDER BY` in `search_photographers` is written as one `CASE` so this is a clause, not a rewrite. |

## Admin

| | Area | Notes |
| --- | --- | --- |
| ✅ | Reported content | **Was not connected to anything.** `admin_get_reports` existed since v7 and was never called; the queue was local React state. A report filed by a user was invisible to every moderator, forever. Now loaded, rendered for any target type, with an honest empty state. Needs v34. |
| ✅ | Content removal | **"Remove Photo" did not remove a photo** — it wrote a status on the report row and left the image public. Now a real, reversible moderation state enforced in RLS, with the reason recorded and any in-flight battle discarded. Needs v34. |
| ✅ | User management | Verify and suspend, through permission-checked RPCs. |
| ✅ | Disputes | Queue now read from the database. The table's `FOR ALL USING (true)` policy — readable, editable and deletable by anyone holding the anon key — is closed by v34. |
| ✅ | Activity log | Every moderation action with its actor, written by the database. Needs v34. |
| ✅ | Platform stats | Counted platform-wide rather than derived from the 100 profiles the browser happens to hold. Needs v34. |
| ✅ | Briefs | Schedule, list and see entry counts. Needs v35. |
| 🔴 | Categories, featured content, announcements, roles UI | Roles and permissions exist in the database (v7) with no screen. Phase 2. |

## Platform

| | Area | Notes |
| --- | --- | --- |
| ✅ | Auth | Supabase Auth. Admin access is a database decision (`admin_console_access`), never an email comparison in the browser. |
| ✅ | Storage | Folder-scoped write policies on every bucket; MIME allow-list and size cap; `image/svg+xml` permanently excluded. |
| ✅ | RLS | On every table in `public`. |
| ✅ | `search_path` pinning | v34 sweeps every `SECURITY DEFINER` function that lacks one — a sweep rather than a list, so functions nobody remembered are covered. |
| ✅ | Input bounds | Every user-typed column was unbounded `TEXT`. v37 bounds them in the database, where a `maxlength` attribute cannot be skipped. |
| ✅ | Stored XSS via `profiles.website` | The old guard neutralised `javascript:` by accident. Now a scheme allow-list in `src/lib/safeUrl.js` and a `CHECK` on the column. |
| ✅ | Data export and deletion | "Deactivate account" set one boolean and called it deleting. v37 adds a real export and a two-step deletion that is honest about the operator step. |
| ✅ | Dependency scanning | CI fails on a high-severity advisory in the runtime tree; the dev tree is advisory. Runtime currently reports zero. |
| ✅ | Session handling | PKCE flow, explicit token refresh and persistence, stated rather than inherited. |
| ✅ | Headers and CSP | Strict CSP, HSTS with preload, `frame-ancestors 'none'`. |
| ✅ | SEO and domain | `lensleague.app` indexed, sitemap accepted, duplicate hosts collapsed. |
| ✅ | Bundle | Was one 986 kB chunk. Now route-level code splitting plus vendor chunks: 140 kB of application code, and a deploy no longer invalidates React for returning visitors. |
| ✅ | Tests | 165 tests across 16 files. |
| 🟡 | Lint | `npm run lint` runs oxlint through `npx`; CI runs it advisory-only until its output has been read once. |
| 🟡 | Mobile | Every screen touched in this pass is responsive and was built mobile-first. Not every older screen has been walked through on a real handset. |
| 🔴 | CAPTCHA | Needs an hCaptcha site key and a CSP widening. |
| 🔴 | Payments | Not started. |

---

## Scale: what holds, and what does not

The standing rule is to ask what a design costs at ten thousand users and a
million rows. Measured against that:

**Fixed**

| Was | Now |
| --- | --- |
| Client search filtered 100 cached profiles; photographer 101 was unfindable by name | An indexed database query with bounded pagination |
| Admin stats derived from whatever 100 profiles the browser held — "banned" meant "banned among the first hundred" | Counted platform-wide by the database |
| Every user-typed column an unbounded `TEXT` | Twenty bounded columns; one bad paste cannot put four megabytes into a bio that loads on every profile view |
| The 500 most recent comments across the whole platform, each with a joined profile, into every visitor's browser on mount | Loaded per photograph when somebody opens one |
| A card's comment count computed by scanning that array, so past 500 it silently undercounted | `portfolio_items.comment_count`, maintained by a v14 trigger |
| 200 `challenge_entries` fetched on mount and read by nothing | Removed |
| Every visitor, signed out included, holding a realtime subscription against the whole `messages` table | Signed-in only |
| One 986 kB bundle | ~140 kB of application code plus vendor chunks that survive a deploy |

**Still wrong, and named so it is not mistaken for done**

- `syncFromSupabase` still pulls 100 profiles and 100 portfolio items into every
  browser on mount, signed in or not. Feed, Discover, ClientHome and the admin
  People tab all read that array. Fixing it means giving each of those screens
  its own query, which is four screens' worth of regression risk — a job, not a
  patch. It is the largest remaining item.
- The messages realtime subscription is now signed-in only but is still
  table-wide per person. `postgres_changes` filters take a single column
  comparison and "threads I am in" is a join. Narrowing it needs a denormalised
  participant column on `messages`, or per-thread broadcast channels.
- `admin_get_platform_stats` runs twelve `count(*)` queries over full tables.
  Fine now and for a long while; it becomes a problem at millions of rows, and
  the answer then is a materialised view refreshed on a schedule.

## Deliberately later, and why

- **Opportunities** (jobs, events, brand work, second-shooter calls). It is the
  most requested-sounding feature on the list and it is a marketplace of its
  own: postings, applications, moderation, notifications. Shipped into a
  platform with a few dozen photographers it is an empty board, which is worse
  than no board. It comes after the upload loop is producing work every week.
- **The Weekly Cover.** Build-order item 2. It is only a prize if winning it
  means beating real work, so it needs The Brief running first.
- **Reputation drives client search.** Build-order item 3, and the moment points
  turn into money. It needs both sides of the platform populated.
- **Removing the dead child columns** (`likes.post_id`, `comments.photo_id` and
  the rest) and the empty satellite tables. Left standing by v33 on purpose:
  dropping them means rewriting `public.notify()`, which has not been read, and
  a broken `notify()` costs every notification in the product.

## Known issues carried forward

- **Two typography systems.** Tokens load Outfit, Inter and JetBrains Mono;
  `tailwind.config.js` maps `font-sans`/`font-mono` onto Geist. Both ship. Which
  one an element gets depends on how it was styled. Still unresolved.
- **`AuthContext.jsx` is legacy and not mounted.** Nothing imports it.
- **`StoriesBar`** exists, is imported by nothing, and contradicts the stated
  product direction. It costs nothing at runtime — it is not in the module graph
  — but it should go.
- **`uploadAvatar`, `setProfileCategories` and `completeOnboarding`** in
  `AppContext` are exported and called by nothing.
- **`onboarding_completed`** is written by `completeOnboarding` and is not in
  `PROFILE_COLUMNS` nor created by any migration. Either add the column or
  delete the function.
