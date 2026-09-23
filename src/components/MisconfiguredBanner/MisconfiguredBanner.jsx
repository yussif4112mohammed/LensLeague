import { isSupabaseConfigured } from '@/lib/supabaseClient';

/**
 * Says out loud that this build has no database.
 *
 * Without it, a production deploy missing its environment variables serves a
 * complete-looking application backed entirely by in-memory mock data: sign-in
 * appears to work, a feed appears, and nothing a visitor does is saved. The
 * only signal was a console warning.
 *
 * Deliberately not rendered during development, where running without keys is
 * a normal thing to do, and not in tests.
 */
export default function MisconfiguredBanner() {
  if (isSupabaseConfigured || import.meta.env.DEV) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[100] bg-red-500/15 border-b border-red-500/30 px-4 py-2 text-center text-sm text-red-400"
    >
      This deployment is not connected to its database. Nothing you do here will be saved.
    </div>
  );
}
