import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import MisconfiguredBanner from './components/MisconfiguredBanner/MisconfiguredBanner';

/**
 * Routes are code-split.
 *
 * The build was one 986 kB chunk, ~281 kB gzipped, and every visitor paid for
 * every screen before seeing one - the admin console, the upload flow with its
 * EXIF reader and image resizer, the whole client marketplace - to read the
 * landing page. On the connections most of this audience is actually on, that
 * is the difference between the site appearing and the site being abandoned.
 *
 * The landing page, sign-in and the shells stay eager: they are on the first
 * paint of nearly every visit, and lazily loading the thing you are already
 * looking at only adds a spinner.
 */

// Layouts — eager: every authenticated route renders inside one of these.
import PhotographerShell from './layouts/PhotographerShell/PhotographerShell';
import ClientShell from './layouts/ClientShell/ClientShell';

// Eager: the first screen of almost every session.
import LandingPage from './pages/Landing/LandingPage';
import { LoginPage, SignUpPage } from './pages/Auth/AuthPages';

// Lazy: everything reached by navigating.
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const FeedPage           = lazy(() => import('./pages/Feed/FeedPage'));
const DiscoverPage       = lazy(() => import('./pages/Discover/DiscoverPage'));
const VotePage           = lazy(() => import('./pages/Vote/VotePage'));
const ChallengesPage     = lazy(() => import('./pages/Challenges/ChallengesPage'));
const LeaguesPage        = lazy(() => import('./pages/Leagues/LeaguesPage'));
const BriefPage          = lazy(() => import('./pages/Brief/BriefPage'));
const ProfilePage        = lazy(() => import('./pages/Profile/ProfilePage'));
const AnalyticsPage      = lazy(() => import('./pages/Analytics/AnalyticsPage'));
const UploadPage         = lazy(() => import('./pages/Upload/UploadPage'));
const SettingsPage       = lazy(() => import('./pages/Settings/SettingsPage'));

const ClientHome     = lazy(() => import('./pages/Client/ClientHome'));
const ClientSearch   = lazy(() => import('./pages/Client/ClientSearch'));
const ClientSaved    = lazy(() => import('./pages/Client/ClientSaved'));
const ClientBookings = lazy(() => import('./pages/Client/ClientBookings'));

const InboxPage = lazy(() => import('./pages/Inbox/InboxPage'));

// The admin console is the clearest case of all: it is code almost nobody on
// the platform will ever run, and it was in the first byte everybody downloaded.
const AdminPage = lazy(() => import('./pages/Admin/AdminPage'));

const TermsPage      = lazy(() => import('./pages/Legal/LegalPages').then(m => ({ default: m.TermsPage })));
const PrivacyPage    = lazy(() => import('./pages/Legal/LegalPages').then(m => ({ default: m.PrivacyPage })));
const GuidelinesPage = lazy(() => import('./pages/Legal/LegalPages').then(m => ({ default: m.GuidelinesPage })));

/**
 * What a visitor sees for the moment a route chunk is in flight.
 *
 * Deliberately not a spinner: a chunk on a warm cache resolves in a few
 * milliseconds, and a spinner that flashes for 40ms reads as a glitch. A quiet
 * hold of the layout is calmer and, on a slow connection, the delay is long
 * enough that the text below is genuinely useful.
 */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background">
      <span className="text-sm font-medium text-muted-foreground">Loading…</span>
    </div>
  );
}

const router = createBrowserRouter([
  // ────── Public routes ──────
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/guidelines', element: <GuidelinesPage /> },

  // ────── Admin (Protected) ──────
  // Deliberately NOT in the public block, where it used to sit. AdminPage
  // guards itself on admin_console_access() and every action behind it is
  // independently authorised in the database, so this was never an access
  // hole - but an "Access Denied" screen served to anyone who guessed the URL
  // announces that an admin console exists, which is free information for an
  // attacker and looks unfinished besides. Signed-out visitors now get the
  // login screen like every other private route.
  { path: '/admin', element: <ProtectedRoute><AdminPage /></ProtectedRoute> },

  // ────── Photographer SPA (Protected) ──────
  {
    element: <ProtectedRoute><PhotographerShell /></ProtectedRoute>,
    children: [
      { path: '/feed', element: <FeedPage /> },
      { path: '/discover', element: <DiscoverPage /> },
      // Compete section
      { path: '/compete/vote', element: <VotePage /> },
      { path: '/compete/challenges', element: <ChallengesPage /> },
      // Redirect /compete → /compete/vote
      { path: '/compete', element: <Navigate to="/compete/vote" replace /> },
      // Leagues — category rooms with four-tier recognition (replaces the
      // ranked leaderboard, per the product spec's "no public display of losses")
      // The Brief — one weekly constraint everybody shoots to. First in the
      // build order in docs/PRODUCT.md, because the platform's problem is an
      // empty gallery, not an unrewarded one.
      { path: '/brief', element: <BriefPage /> },
      { path: '/leagues', element: <LeaguesPage /> },
      // Deliberately NOT routed. A global ranked ladder is the wrong shape for
      // photography: it ranks a wedding photographer against a wildlife one on a
      // single axis, it cements the same names at the top so newcomers see an
      // unreachable wall, and it rewards upload frequency over craft. /leagues
      // does the winnable version. The page component is kept, and reads
      // get_leaderboard rather than ranking in the browser, so it is ready if
      // the product decision is ever revisited. See docs/PRODUCT.md.
      { path: '/leaderboard', element: <Navigate to="/leagues" replace /> },
      // Profile (own or others)
      { path: '/profile/:id', element: <ProfilePage /> },
      { path: '/profile', element: <Navigate to="/profile/me" replace /> },
      // Analytics
      { path: '/analytics', element: <AnalyticsPage /> },
      // Upload
      { path: '/upload', element: <UploadPage /> },
      // Settings
      { path: '/settings', element: <SettingsPage /> },
      // Inbox
      { path: '/inbox', element: <InboxPage /> },
      // Saved — rail destination from mockup 2a
      { path: '/saved', element: <ClientSaved /> },
      // Explore is the mockups' name for Discover; keep both entry points
      { path: '/explore', element: <Navigate to="/discover" replace /> },
    ]
  },

  // ────── Client SPA (Protected) ──────
  {
    element: <ProtectedRoute><ClientShell /></ProtectedRoute>,
    children: [
      { path: '/client/home', element: <ClientHome /> },
      { path: '/client/search', element: <ClientSearch /> },
      { path: '/client/saved', element: <ClientSaved /> },
      { path: '/client/bookings', element: <ClientBookings /> },
      // Clients can also view photographer profiles
      { path: '/client/profile', element: <ProfilePage /> },
      // Inbox
      { path: '/client/inbox', element: <InboxPage /> },
    ]
  },

  // ────── Fallback ──────
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function App() {
  return (
    <div className="w-full min-h-screen">
      <MisconfiguredBanner />
      <ErrorBoundary>
        {/* One boundary around the router rather than one per route: a lazy
            chunk can suspend during any navigation, and a missed boundary is a
            blank screen rather than a caught error. */}
        <Suspense fallback={<RouteFallback />}>
          <RouterProvider router={router} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
