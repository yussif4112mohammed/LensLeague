# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

This file is the map. The detail lives in `docs/`, and where the two disagree,
`docs/` is newer.

| | |
| --- | --- |
| `docs/PRODUCT.md` | What the product is for, what it deliberately is not, what gets built next |
| `docs/ARCHITECTURE.md` | Stack, routing, state, UI, tests, deployment |
| `docs/DATABASE.md` | How migrations work here, schema drift, the competition domain |
| `docs/SECURITY.md` | The security model and the audit findings behind it |
| `docs/SPEC-the-brief.md` | The next feature, specified |

There is no separate `ROADMAP.md`; the build order is in `docs/PRODUCT.md`.

## Read this first

Three things about this project are counter-intuitive enough to cause real damage
if you assume otherwise.

**A running dev server does not imply a working backend.**
`src/lib/supabaseClient.js` falls back to a placeholder client when
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are missing. The app then boots
into local-mock mode where every Supabase call fails silently into in-memory mock
data. It looks completely fine. Migration v3 having never run went unnoticed for
weeks for exactly this reason.

**A migration file on disk is not evidence the database is in that state.**
Migrations are applied by hand and there is no migrations table. Run
`supabase/CHECK_migration_state.sql` to find out what is actually live.

**Business logic belongs in SQL, not the client.** A control that lives in
JavaScript is a control an attacker skips by calling the API directly. Points,
battle results, ranking and eligibility are all decided in the database.

## Commands

    npm run dev           Vite dev server, http://localhost:5173
    npm run build         check-design-tokens.mjs, then vite build
    npm run preview       serve the built dist/
    npm test              vitest run
    npm run test:watch    vitest
    npm run check:tokens  design-token check on its own

`npm run build` runs the design-token check first, so a literal colour in JSX
fails the build before Vite starts.

Tests: Vitest and Testing Library, jsdom, configured in `vite.config.js`, setup at
`src/test/setup.js`. Two suites, 23 tests: `src/lib/photography.test.js` and
`src/components/FeedbackButton/FeedbackButton.test.jsx`.

Lint: `.oxlintrc.json` configures Oxlint, but Oxlint is not in `devDependencies`
and there is no `lint` script. Run `npx oxlint`, or add it properly first.

## Environment

Create `.env.local` (git-ignored, copy `.env.example`):

    VITE_SUPABASE_URL=...
    VITE_SUPABASE_ANON_KEY=...

## Shape of the code

React 18, Vite 6, React Router 7 (`createBrowserRouter` in `src/App.jsx`). Plain
`.jsx`. Path alias `@/` to `src/`, declared in both `vite.config.js` and
`jsconfig.json`.

One router serves three surfaces: public routes, `PhotographerShell`, and
`ClientShell` at `/client/*`. Both shells sit inside `ProtectedRoute`.

`src/context/AppContext.jsx` is the spine — one provider, `useApp()`, a single
bulk `syncFromSupabase()` on mount, a realtime subscription on `messages`, and
roughly fifty action methods. Pages consume `useApp()` rather than querying
Supabase directly.

`src/context/AuthContext.jsx` is legacy and **is not mounted**. Nothing imports
it. Do not wire new code into it.

`src/context/ThemeContext.jsx` pins a single dark theme on purpose; `toggleMode`
is a no-op that re-sets `dark`.

Feature components are folder-per-component with a co-located stylesheet:
`src/components/<Name>/<Name>.jsx` plus `<Name>.css`. shadcn primitives live in
`src/components/ui/`. Tokens in `src/styles/tokens.css`.

`src/lib/photography.js` holds the one category vocabulary. Do not add a fifth
hardcoded category array; there were four, and they disagreed.

## Conventions worth preserving

**The offline-resilience pattern.** Mutating actions update local state
optimistically, attempt the Supabase write, and roll back on error. Reads fall
back to mock lists. Keep this shape.

**Placeholder ids never reach Supabase.** Client-generated ids (`usr_`, `anon_`,
`p_`, `bk_`) are guarded with checks like `!userId.startsWith('usr_')`.

**Name profile columns explicitly.** Use the exported `PROFILE_COLUMNS`.
`select('*')` fails RLS, and PostgREST rejects an entire select when one named
column is absent — so a drifted column list fails silently and falls back to mock
data rather than erroring usefully.

**Add the next migration; never edit an applied one.** And write its
`VERIFY_vN.sql` before believing it worked.

**Commit messages follow Conventional Commits** (`feat:`, `fix:`).

## Known issues, recorded rather than hidden

- **Two typography systems.** Tokens use Outfit, Inter and JetBrains Mono from
  Google Fonts; `tailwind.config.js` maps `font-sans` and `font-mono` onto Geist
  via `@fontsource`. Both ship. Which one an element gets depends on how it was
  styled. Unresolved — see `docs/ARCHITECTURE.md`.
- **`reviews` table.** Migration v17 states it does not exist, but `schema.sql`
  and `migration_v2.sql` both create it. Verify before relying on either.
- **Bundle size.** One 961 kB chunk, no code splitting.

## Files that are not part of the app

`cleanAppCtx*.cjs`, `apple-design*.md`, `better-ui*.md`,
`mock_context_reference.txt`. Ignore them.

`src/utils/exif.js` and `src/utils/imageOptimizer.js` do client-side EXIF
extraction and image downscaling before upload; `ExifBadge` renders the extracted
camera and gear.
