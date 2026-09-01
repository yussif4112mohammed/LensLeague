# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # production build to dist/
npm run preview    # serve the built dist/ locally
```

- **Lint:** `.oxlintrc.json` configures [Oxlint](https://oxc.rs) (`react/rules-of-hooks`, `react/only-export-components`), but Oxlint is **not** in `devDependencies` and there is no `lint` script. Run `npx oxlint` if you need it, or add it to `package.json` first.
- **Tests:** none. No test runner, no test files, no `test` script.

## Environment

Create `.env.local` (git-ignored; copy `.env.example`) with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`src/lib/supabaseClient.js` falls back to a placeholder client if these are missing — the app boots in "local-mock fallback mode" and every Supabase call fails silently into in-memory mock data instead of crashing. A running dev server does **not** imply a working backend.

## Architecture

React 18 + Vite 6 SPA. React Router 7 (`createBrowserRouter` in `src/App.jsx`). Path alias `@/` → `src/` (declared in both `vite.config.js` and `jsconfig.json`). Plain `.jsx`, not TypeScript.

### Routing & product surfaces

One router serves three surfaces:

- **Public:** `/`, `/login`, `/signup`, `/forgot-password`, and `/admin` (route is public; the page guards itself with the `admin_console_access` RPC).
- **`PhotographerShell`** (`src/layouts/PhotographerShell/`) — `/feed`, `/discover`, `/compete/vote`, `/compete/challenges`, `/leagues`, `/profile/:id`, `/analytics`, `/upload`, `/settings`, `/inbox`, `/saved`.
- **`ClientShell`** (`src/layouts/ClientShell/`) — `/client/*` (home, search, saved, bookings, inbox, profile).

Both shells are wrapped in `ProtectedRoute`, which redirects to `/login` unless `useApp().currentUser` is set. A profile's `role` is `'photographer'` or `'client'`; `AppContext.currentRole` is a separately switchable view state (`RoleSwitcher` component).

### State — `src/context/AppContext.jsx` is the spine

A single large provider (`useApp()` hook), mounted in `src/main.jsx`, that:

1. On mount runs one `syncFromSupabase()` that bulk-loads profiles, `portfolio_items`, battles, challenges, and — when logged in — bookings, message threads, follows, saved items, and comments into React state.
2. Subscribes to a realtime channel on the `messages` table.
3. Exposes ~50 action methods (auth, bookings, messaging, uploads, follows, comments, voting, moderation, search, settings).

Most pages consume `useApp()` rather than fetching directly. **`src/context/AuthContext.jsx` (`AuthProvider` / `useAuth`) is legacy and is NOT mounted** — do not wire new code into it; use `AppContext`.

`src/context/ThemeContext.jsx` forces a single dark theme: `toggleMode` is intentionally a no-op that re-sets `'dark'`, and `data-theme="dark"` is pinned on `<html>`.

### Offline-resilience pattern

Nearly every mutating action does an **optimistic local state update first**, then attempts the Supabase write, then **rolls back on error**. Reads fall back to in-memory mock lists. Client-generated placeholder ids (`usr_…`, `anon_…`, `p_…`, `bk_…`) must not be sent to Supabase — code guards with checks like `!userId.startsWith('usr_')`. Preserve this shape when adding features.

### Security model (migrations v7 + v11)

Privileged operations go through **Supabase RPCs / `SECURITY DEFINER` functions**, never direct table writes from the browser:

- Admin gate: `admin_console_access` (not an email comparison).
- Moderation: `admin_resolve_report`, `admin_set_user_verified`, `admin_set_user_banned`, `admin_resolve_dispute`.
- Voting: `cast_photo_battle_vote` — the server awards points/wins/`global_rank`; a guard trigger reverts any client-side write to those columns, so the client-side Elo path in `castBattleVote` is only for mock mode.
- Other RPCs: `is_username_available`, `search_users`, `search_posts`, `get_feed`, `get_or_create_thread`, `queue_portfolio_item_for_battle`.
- `profiles` reads must list explicit columns (`PROFILE_COLUMNS` in `AppContext.jsx`) — `email`/`phone` are no longer readable and `select('*')` fails RLS.

### Database — `supabase/` is raw SQL, applied by hand

`schema.sql` is the v1 baseline; `migration_v2.sql` … `migration_v12_recognition_tiers.sql` are run **in numerical order** through the Supabase SQL editor. No Supabase CLI, no generated types, no local Postgres. When you change data shape, add the next `migration_vN_*.sql` file rather than editing existing ones.

The schema has **drifted** — legacy and current tables coexist and some writes target both for backward compat:

| Legacy | Current |
| --- | --- |
| `photos` | `portfolio_items` + `albums` |
| `messages.recipient_id` | `message_threads` + `thread_participants` + `messages.thread_id` |
| (feed from `portfolio_items`) | `posts` + `get_feed` RPC |

### Competition domain

`src/lib/elo.js` is pure Elo math (K=32), used only as the mock-mode fallback. Persisted battles live in `photo_battles` (migration v10); without v10 applied, `AppContext` generates battles client-side by pairing photos of matching aspect ratio. `/leagues` (four-tier recognition, migration v12) deliberately replaces a ranked leaderboard — the product spec forbids public display of losses (`/leaderboard` redirects to `/leagues`).

### UI

Tailwind 3 + shadcn (`components.json`, style `base-nova`, JS not TSX) in `src/components/ui/`. Feature components are folder-per-component with a co-located CSS file: `src/components/<Name>/<Name>.jsx` + `<Name>.css`. Design tokens in `src/styles/tokens.css`, `src/styles/globals.css`, `src/index.css`. Icons: `lucide-react`. `cn()` from `src/lib/utils.js` merges class names. Fonts are loaded via Google Fonts `<link>` in `index.html` (Outfit / Inter / JetBrains Mono); the CSP in `vercel.json` only whitelists `fonts.googleapis.com` / `fonts.gstatic.com` and `*.supabase.co`.

### Deployment

Vercel (`vercel.json`): SPA rewrite to `/index.html` plus strict security headers — CSP restricts scripts to `'self'` and connections to `*.supabase.co` / `wss://*.supabase.co`. Any new external origin (analytics, CDN, image host) must be added there or requests are blocked in production.

## Repo notes

- Commit messages follow Conventional Commits (`feat:`, `fix:`).
- Root-level files that are **not** part of the app and can be ignored: `cleanAppCtx*.cjs`, `apple-design*.md`, `better-ui*.md`, `mock_context_reference.txt`.
- `src/utils/exif.js` and `src/utils/imageOptimizer.js` do client-side EXIF extraction and image downscaling before upload; `ExifBadge` renders the extracted camera/gear.
