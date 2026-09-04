# LensLeague — Architecture

Only what is verifiable from the repository. Where something looks wrong, it is
recorded as a discrepancy rather than quietly corrected.

Verified against the working tree on 2026-09-04.

## Stack

React 18 and Vite 6. React Router 7, one `createBrowserRouter` in `src/App.jsx`.
Plain `.jsx` throughout, not TypeScript. Path alias `@/` to `src/`, declared in
both `vite.config.js` and `jsconfig.json` — change one, change the other.

Supabase for database, auth and storage, reached from the browser only.
There is no server of our own.

## Three surfaces, one router

**Public** — `/`, `/login`, `/signup`, `/forgot-password`, `/terms`, `/privacy`,
`/guidelines`, and `/admin`. The admin route is public at the router level and
guards itself with the `admin_console_access` RPC, so authorisation is a database
decision rather than a routing one.

**`PhotographerShell`** — `/feed`, `/discover`, `/compete`, `/compete/vote`,
`/compete/challenges`, `/leagues`, `/profile/:id`, `/analytics`, `/upload`,
`/settings`, `/inbox`, `/saved`, `/explore`.

**`ClientShell`** — `/client/home`, `/client/search`, `/client/saved`,
`/client/bookings`, `/client/inbox`, `/client/profile`.

Both shells sit inside `ProtectedRoute`, which redirects to `/login` unless
`useApp().currentUser` is set.

`/leaderboard` redirects to `/leagues`. That is a product decision, not an
oversight — see docs/PRODUCT.md. `LeaderboardPage.jsx` still exists and still
reads `get_leaderboard`, so it is cheap to revisit.

A profile's `role` is `photographer` or `client`. `AppContext.currentRole` is a
separately switchable view state driven by `RoleSwitcher`, so which shell you are
looking at is not the same question as what you are.

## State: AppContext is the spine

`src/context/AppContext.jsx` is one large provider, mounted in `src/main.jsx`
inside `ThemeProvider`. It exports exactly three things: `PROFILE_COLUMNS`,
`AppProvider` and `useApp`.

On mount it runs a single `syncFromSupabase()` that bulk-loads profiles,
portfolio items, battles and challenges, plus — when signed in — bookings,
message threads, follows, saved items and comments. It then subscribes to a
realtime channel on `messages`. Pages consume `useApp()` rather than querying
Supabase themselves.

`PROFILE_COLUMNS` is exported and reused rather than hand-copied per screen.
This matters more than it looks: `profiles.email` and `phone` are not readable by
the `anon` and `authenticated` roles, so `select('*')` fails RLS, and PostgREST
rejects an entire select when one named column is missing. A single screen with a
drifted column list therefore fails silently and falls back to mock data. That
exact failure is what migration v14 had to repair.

**`src/context/AuthContext.jsx` is legacy and is not mounted.** Nothing in `src/`
imports it. Do not wire new code into it.

`src/context/ThemeContext.jsx` pins a single dark theme: `toggleMode` is
deliberately a no-op that re-sets `dark`, and `data-theme="dark"` stays on the
root element.

## The offline-resilience pattern

Nearly every mutating action updates local state optimistically, attempts the
Supabase write, and rolls back on error. Reads fall back to in-memory mock lists.

`src/lib/supabaseClient.js` falls back to a placeholder client when
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are absent, so the app boots into
a local-mock mode where Supabase calls fail silently into mock data instead of
crashing. **A running dev server therefore does not imply a working backend** —
this is the single most misleading thing about the project to a newcomer.

Client-generated placeholder ids (`usr_`, `anon_`, `p_`, `bk_`) must never reach
Supabase; the code guards with checks like `!userId.startsWith('usr_')`. Preserve
this shape when adding features.

## UI

Tailwind 3 with shadcn components in `src/components/ui/` (style `base-nova`, JS
not TSX). Feature components are folder-per-component with a co-located stylesheet:
`src/components/<Name>/<Name>.jsx` plus `<Name>.css`. Icons from `lucide-react`.
`cn()` in `src/lib/utils.js` merges class names.

Design tokens live in `src/styles/tokens.css`, with `src/styles/globals.css` and
`src/index.css` alongside.

`src/lib/photography.js` holds the one category vocabulary, replacing four
disagreeing hardcoded arrays. Categories are platform-controlled and come from the
`categories` table; personal style is photographer-owned free text that nothing
filters or matches on. Keeping those two ideas apart is the design.

### Discrepancy: two typography systems

`src/styles/tokens.css` sets `--font-display` to Outfit, `--font-ui` to Inter and
`--font-mono` to JetBrains Mono, all loaded from Google Fonts by a `<link>` in
`index.html`.

Meanwhile `src/index.css` imports `@fontsource/geist-sans` and
`@fontsource/geist-mono`, and `tailwind.config.js` maps Tailwind's `font-sans` and
`font-mono` utilities onto them.

So an element styled by hand-written CSS renders in Outfit or Inter, and an
element styled by a Tailwind font utility renders in Geist. Both font sets ship:
the Geist woffs are about 135 kB of the build output. This is unresolved, not a
decision. Pick one before adding more typography.

## Tests, lint, build

Vitest with Testing Library, `jsdom` environment, setup at `src/test/setup.js`,
configured inside `vite.config.js`. Two suites today: `src/lib/photography.test.js`
and `src/components/FeedbackButton/FeedbackButton.test.jsx`, 23 tests.

    npm run dev           Vite dev server, http://localhost:5173
    npm run build         check-design-tokens.mjs, then vite build
    npm run preview       serve the built dist/
    npm test              vitest run
    npm run check:tokens  design-token check alone

`npm run build` runs `scripts/check-design-tokens.mjs` first and fails on literal
colours in JSX, so a hardcoded hex stops the build before Vite starts.

`.oxlintrc.json` exists and configures `react/rules-of-hooks` and
`react/only-export-components`, but **oxlint is not in `devDependencies` and there
is no `lint` script.** Run `npx oxlint`, or add it properly.

## Deployment

Vercel, configured by `vercel.json`: an SPA rewrite of everything to
`/index.html`, plus a strict header set — CSP limiting scripts to `'self'` and
connections to `https://*.supabase.co` and `wss://*.supabase.co`, `frame-ancestors
'none'`, `object-src 'none'`, HSTS with preload, `nosniff`, and a Permissions-Policy
that denies camera and microphone and allows geolocation only to self.

Any new external origin — analytics, a CDN, an image host — must be added there or
the browser will block it in production while everything still works locally.
