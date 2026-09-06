import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The test that would have prevented the 2026-09-06 outage.
 *
 * WHAT HAPPENED
 * A notifications realtime subscription was added to an effect in AppProvider
 * that runs on mount whether or not anyone is signed in. It read
 * `currentUser.id` to build a channel filter. Signed out, currentUser is null,
 * so it threw synchronously inside the effect, React unmounted the tree, and
 * every visitor to the production site saw a blank page.
 *
 * `npm run build` passed, because compiling is not rendering. All 23 tests
 * passed, because none of them mounted the application. The bug was found by a
 * user asking why the site was empty.
 *
 * So: mount the provider as a signed-out visitor and assert that its children
 * survive. It is a low bar. Nothing else in this suite clears it, and today
 * proved the bar is where the failures actually happen.
 */

// A Supabase test double. Every builder method returns the chain, and awaiting
// the chain resolves to an empty, error-free result - which is exactly what a
// signed-out visitor gets from a database where they can read nothing.
function queryChain() {
  const settled = Promise.resolve({ data: [], error: null, count: 0 });
  const proxy = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return settled.then.bind(settled);
        if (prop === 'catch') return settled.catch.bind(settled);
        if (prop === 'finally') return settled.finally.bind(settled);
        return () => proxy;
      },
    }
  );
  return proxy;
}

const channel = {
  on: () => channel,
  subscribe: () => channel,
};

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: () => queryChain(),
    rpc: () => queryChain(),
    channel: () => channel,
    removeChannel: () => {},
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    auth: {
      // No session. This is the whole point of the test.
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signOut: async () => ({ error: null }),
    },
  },
}));

import { AppProvider, useApp } from './AppContext';

function Probe() {
  const { currentUser, notifications, unreadNotificationCount } = useApp();
  return (
    <div>
      <span data-testid="rendered">rendered</span>
      <span data-testid="user">{currentUser ? 'signed-in' : 'signed-out'}</span>
      <span data-testid="notif-count">{notifications.length}</span>
      <span data-testid="unread">{unreadNotificationCount}</span>
    </div>
  );
}

describe('AppProvider, signed out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders its children instead of taking the tree down', async () => {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    // If any effect throws synchronously, React unmounts and this is never found.
    expect(await screen.findByTestId('rendered')).toBeInTheDocument();
    expect(screen.getByTestId('user')).toHaveTextContent('signed-out');
  });

  it('exposes an empty notification state rather than reading a null user', async () => {
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await screen.findByTestId('rendered');
    expect(screen.getByTestId('notif-count')).toHaveTextContent('0');
    expect(screen.getByTestId('unread')).toHaveTextContent('0');
  });

  it('does not log an uncaught error while mounting', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await screen.findByTestId('rendered');

    // React reports a crash-on-mount through console.error before unmounting,
    // so this catches the failure even where a throw is swallowed elsewhere.
    const shouted = spy.mock.calls.some(args =>
      args.some(a => typeof a === 'string' && /Cannot read propert|is not a function|undefined/i.test(a))
    );
    expect(shouted).toBe(false);
    spy.mockRestore();
  });
});
