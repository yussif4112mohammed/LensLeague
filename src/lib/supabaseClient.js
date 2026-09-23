import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Whether this build is actually talking to a database.
 *
 * WHY THIS IS EXPORTED. When the keys are absent the client below is still
 * constructed, against a placeholder host, and every call fails into the
 * in-memory mock data AppContext falls back to. The application then looks
 * completely normal. That is the single most misleading thing about this
 * project - migration v3 having never run went unnoticed for weeks for exactly
 * this reason - and a console warning nobody reads is not a fix. Anything that
 * needs to know can now ask, and `MisconfiguredBanner` puts it on the screen in
 * a production build.
 *
 * The fallback is kept rather than replaced with a throw, because the test
 * suite and CI both build with empty keys on purpose: a build proves the bundle
 * compiles without needing real credentials anywhere near a CI log.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase configuration keys are missing. Application will run in local-mock fallback mode. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY inside .env.local to connect to your live database.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key-value',
  {
    auth: {
      /**
       * PKCE, not the implicit flow.
       *
       * supabase-js defaults to implicit, which returns the access token in the
       * URL fragment after a Google sign-in. A fragment is not sent to the
       * server, but it does land in browser history, in anything reading
       * `location.hash` - extensions included - and in whatever the page does
       * with the URL afterwards. PKCE returns a single-use code instead and
       * exchanges it for the token over the wire, so the credential is never in
       * a URL at all.
       *
       * This changes the shape of the OAuth callback from `#access_token=...`
       * to `?code=...`; detectSessionInUrl below performs the exchange. The
       * redirect targets already registered in Supabase do not change.
       */
      flowType: 'pkce',

      // Stated rather than inherited. A future supabase-js release changing one
      // of these defaults should be a decision, not a surprise.
      autoRefreshToken: true,   // a session ends because it expired, not because a tab was open too long
      persistSession: true,     // survives a reload; localStorage, per Supabase's design
      detectSessionInUrl: true, // completes the PKCE exchange on the callback
      storageKey: 'lensleague.auth'
    },
    global: {
      headers: { 'x-client-info': 'lensleague-web' }
    },
    realtime: {
      // Caps how hard a single client can hammer the realtime socket. At eight
      // users this is invisible; it is the sort of bound that matters when a
      // reconnect storm hits every open tab at once.
      params: { eventsPerSecond: 10 }
    }
  }
);
