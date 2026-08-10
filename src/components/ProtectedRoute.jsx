import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Loader2 } from 'lucide-react';

/**
 * ProtectedRoute – wraps any route that requires authentication.
 * While the auth state is being resolved (initial session check),
 * it shows a minimal branded loading spinner. Once resolved, it
 * either renders children or redirects to /login.
 */
export default function ProtectedRoute({ children }) {
  const { currentUser, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground tracking-wide">Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
