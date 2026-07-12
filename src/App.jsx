import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

// Layouts
import PhotographerShell from './layouts/PhotographerShell/PhotographerShell';
import ClientShell from './layouts/ClientShell/ClientShell';

// Pages — Photographer
import LandingPage from './pages/Landing/LandingPage';
import { LoginPage, SignUpPage } from './pages/Auth/AuthPages';
import FeedPage from './pages/Feed/FeedPage';
import DiscoverPage from './pages/Discover/DiscoverPage';
import VotePage from './pages/Vote/VotePage';
import ChallengesPage from './pages/Challenges/ChallengesPage';
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

const router = createBrowserRouter([
  // ────── Public routes ──────
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },

  // ────── Photographer SPA ──────
  {
    element: <PhotographerShell />,
    children: [
      { path: '/feed', element: <FeedPage /> },
      { path: '/discover', element: <DiscoverPage /> },
      // Compete section
      { path: '/compete/vote', element: <VotePage /> },
      { path: '/compete/challenges', element: <ChallengesPage /> },
      // Redirect /compete → /compete/vote
      { path: '/compete', element: <Navigate to="/compete/vote" replace /> },
      // Leaderboard
      { path: '/leaderboard', element: <LeaderboardPage /> },
      // Profile (own or others)
      { path: '/profile/:id', element: <ProfilePage /> },
      { path: '/profile', element: <Navigate to="/profile/1" replace /> },
      // Analytics
      { path: '/analytics', element: <AnalyticsPage /> },
      // Upload
      { path: '/upload', element: <UploadPage /> },
      // Settings
      { path: '/settings', element: <SettingsPage /> },
    ]
  },

  // ────── Client SPA ──────
  {
    element: <ClientShell />,
    children: [
      { path: '/client/home', element: <ClientHome /> },
      { path: '/client/search', element: <ClientSearch /> },
      { path: '/client/saved', element: <ClientSaved /> },
      { path: '/client/bookings', element: <ClientBookings /> },
      // Clients can also view photographer profiles
      { path: '/client/profile', element: <ProfilePage /> },
    ]
  },

  // ────── Fallback ──────
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
