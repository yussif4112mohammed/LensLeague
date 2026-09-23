import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Does the application still render after the routes were made lazy?
 *
 * Code splitting introduces exactly the failure this project has already been
 * burned by once: a change that compiles, passes every unit test, and shows
 * every visitor a blank page. A lazy route with no Suspense boundary above it
 * throws on first navigation; a bad dynamic import resolves to undefined and
 * React renders nothing. `npm run build` catches neither, because compiling is
 * not rendering.
 *
 * So: mount the real App, with the real router, and assert something is on the
 * screen.
 */

function queryChain() {
  const settled = Promise.resolve({ data: [], error: null, count: 0 });
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') return settled.then.bind(settled);
      if (prop === 'catch') return settled.catch.bind(settled);
      if (prop === 'finally') return settled.finally.bind(settled);
      return () => queryChain();
    }
  });
}
const channel = { on: () => channel, subscribe: () => channel };

vi.mock('@/lib/supabaseClient', () => ({
  // The real module exports this too; a mock that omits it makes any
  // component reading it throw at render.
  isSupabaseConfigured: true,
  supabase: {
    from: () => queryChain(),
    rpc: () => queryChain(),
    channel: () => channel,
    removeChannel: () => {},
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null })
    }
  }
}));

import App from './App';
import { AppProvider } from '@/context/AppContext';

describe('App', () => {
  it('renders the landing route for a signed-out visitor', async () => {
    render(<AppProvider><App /></AppProvider>);
    // The landing page is eager, so it must be on screen without waiting for a
    // chunk. Anything at all here means the router mounted and Suspense did
    // not swallow the tree.
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('does not crash the tree while a lazy chunk resolves', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<AppProvider><App /></AppProvider>);
    await screen.findByRole('button', { name: /sign in/i });

    const crashed = spy.mock.calls.some(args =>
      args.some(a => typeof a === 'string' && /lazy|Suspense|Cannot read propert|is not a function/i.test(a))
    );
    expect(crashed).toBe(false);
    spy.mockRestore();
  });
});
