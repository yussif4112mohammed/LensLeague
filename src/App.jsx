import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import PhotographerShell from './layouts/PhotographerShell/PhotographerShell';
import ClientShell from './layouts/ClientShell/ClientShell';

// Pages — Photographer
import LandingPage from './pages/Landing/LandingPage';
import { LoginPage, SignUpPage } from './pages/Auth/AuthPages';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import FeedPage from './pages/Feed/FeedPage';
import DiscoverPage from './pages/Discover/DiscoverPage';
import VotePage from './pages/Vote/VotePage';
import ChallengesPage from './pages/Challenges/ChallengesPage';
import LeaguesPage from './pages/Leagues/LeaguesPage';
import LeaderboardPage from './pages/Leaderboard/LeaderboardPage';
import ProfilePage from './pages/Profile/ProfilePage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import UploadPage from './pages/Upload/UploadPage';
import SettingsPage from './pages/Settings/SettingsPage';

// Pages — Client
import ClientHome from './pages/Client/ClientHome';
import ClientSearch from './pages/Client/ClientSearch';
import ClientSaved from './pages/Client/ClientSaved';
import ClientBookings from './pages/Client/ClientBookings';

// Pages — Inbox (Shared)
import InboxPage from './pages/Inbox/InboxPage';

// Pages — Admin
import AdminPage from './pages/Admin/AdminPage';

// Pages — Legal (public, real routes rather than modal placeholders)
import { TermsPage, PrivacyPage, GuidelinesPage } from './pages/Legal/LegalPages';

const router = createBrowserRouter([
  // ────── Public routes ──────
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/guidelines', element: <GuidelinesPage /> },

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
      { path: '/leagues', element: <LeaguesPage /> },
      // Was a redirect to /leagues, which is why nobody ever saw this page.
      { path: '/leaderboard', element: <LeaderboardPage /> },
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
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </div>
  );
}
