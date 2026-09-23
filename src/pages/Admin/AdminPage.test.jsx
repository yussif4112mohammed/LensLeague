import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

/**
 * The tests that would have caught the two admin-console failures.
 *
 * FAILURE 1 — the queue was never read from the database. `reports` was
 * useState([]) and admin_get_reports, which had existed since migration v7, was
 * never called. A report filed by a user was invisible to every moderator
 * forever, and the console looked completely normal: an empty queue reads as
 * "nothing to do", not as "this screen is not connected to anything".
 *
 * So: put a report in the database double and assert it reaches the screen.
 *
 * FAILURE 2 — "Remove Photo" did not remove a photo. It called
 * admin_resolve_report, which writes a status onto the REPORT row. The
 * photograph stayed public. The moderator saw the queue clear.
 *
 * So: assert the removal button calls admin_remove_content. Asserting that the
 * button exists, or that the card disappears, would have passed against the
 * broken version - which is exactly why neither is the assertion here.
 */

const RPC_CALLS = [];
// The moderation queue the database will hand back. A test rebinds this to
// prove the screen renders whatever the database says, rather than a shape it
// was written around.
let REPORTS_IN_DB = [];

const REPORT = {
  id: 'rep-1',
  reporter_id: 'user-2',
  reporter_name: 'Ama',
  target_type: 'portfolio_item',
  target_id: 'item-9',
  target_label: 'Harmattan morning',
  target_preview: 'https://example.test/photo.jpg',
  target_owner_id: 'user-3',
  target_owner_name: 'Eben',
  target_removed: false,
  reason: 'Not their photograph',
  status: 'pending',
  resolution_notes: null,
  created_at: '2026-09-01T10:00:00Z'
};

const STATS = {
  users_total: 412, photographers_total: 380, clients_total: 32,
  banned_total: 3, verified_total: 11, items_total: 2890, items_removed: 4,
  battles_active: 17, bookings_total: 22, reports_pending: 1,
  disputes_pending: 0, signups_last_7_days: 19
};

function queryChain() {
  const settled = Promise.resolve({ data: [], error: null, count: 0 });
  const proxy = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') return settled.then.bind(settled);
      if (prop === 'catch') return settled.catch.bind(settled);
      if (prop === 'finally') return settled.finally.bind(settled);
      return () => proxy;
    }
  });
  return proxy;
}

const channel = { on: () => channel, subscribe: () => channel };

vi.mock('@/lib/supabaseClient', () => ({
  // The real module exports this too; a mock that omits it makes any
  // component reading it throw at render.
  isSupabaseConfigured: true,
  supabase: {
    from: () => queryChain(),
    channel: () => channel,
    removeChannel: () => {},
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    auth: {
      // A signed-in operator. admin_console_access is what decides whether they
      // get in; this only gets far enough for that RPC to be asked.
      getSession: async () => ({
        data: { session: { user: { id: 'user-1', email: 'op@lensleague.app' } } },
        error: null
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null })
    },
    rpc: (name, args) => {
      RPC_CALLS.push({ name, args });
      switch (name) {
        case 'admin_console_access':      return Promise.resolve({ data: true,     error: null });
        case 'admin_get_reports':         return Promise.resolve({ data: REPORTS_IN_DB, error: null });
        case 'admin_get_disputes':        return Promise.resolve({ data: [],       error: null });
        case 'admin_get_audit_log':       return Promise.resolve({ data: [],       error: null });
        case 'admin_get_platform_stats':  return Promise.resolve({ data: [STATS],  error: null });
        case 'admin_remove_content':
          return Promise.resolve({ data: [{ removed_item_id: 'item-9', battles_voided: 1 }], error: null });
        default:                          return Promise.resolve({ data: null,     error: null });
      }
    }
  }
}));

import { AppProvider } from '@/context/AppContext';
import AdminPage from './AdminPage';

function renderConsole() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <AdminPage />
      </AppProvider>
    </MemoryRouter>
  );
}

const called = (name) => RPC_CALLS.filter(c => c.name === name);

describe('AdminPage', () => {
  beforeEach(() => {
    RPC_CALLS.length = 0;
    REPORTS_IN_DB = [REPORT];
  });

  it('asks the database for every queue it shows', async () => {
    renderConsole();
    await waitFor(() => expect(called('admin_get_reports').length).toBeGreaterThan(0));

    for (const rpc of ['admin_get_reports', 'admin_get_disputes', 'admin_get_audit_log', 'admin_get_platform_stats']) {
      expect(called(rpc).length, `${rpc} was never called`).toBeGreaterThan(0);
    }
  });

  it('shows a report that exists in the database and not only in this tab', async () => {
    renderConsole();
    expect(await screen.findByText('Harmattan morning')).toBeInTheDocument();
    expect(screen.getByText(/Not their photograph/)).toBeInTheDocument();
    expect(screen.getByText(/Flagged by Ama/)).toBeInTheDocument();
  });

  it('counts the platform, not the profiles this browser happens to hold', async () => {
    renderConsole();
    // 412 people exist; AppContext loads at most 100 profiles. A console that
    // derived this from local state would show a number no larger than 100.
    expect(await screen.findByText('412')).toBeInTheDocument();
    expect(screen.getByText('2890')).toBeInTheDocument();
  });

  it('REMOVES THE PHOTOGRAPH rather than only resolving the report', async () => {
    const user = userEvent.setup();
    renderConsole();

    await user.click(await screen.findByRole('button', { name: /remove photograph/i }));
    await user.click(await screen.findByRole('button', { name: /yes, take it down/i }));

    await waitFor(() => expect(called('admin_remove_content').length).toBe(1));
    expect(called('admin_remove_content')[0].args).toMatchObject({ p_report_id: 'rep-1' });

    // The old, broken implementation called this instead. If it ever comes
    // back, the photograph survives the removal and this fails.
    expect(called('admin_resolve_report')).toHaveLength(0);
  });

  it('asks for a reason before taking something down', async () => {
    const user = userEvent.setup();
    renderConsole();

    await user.click(await screen.findByRole('button', { name: /remove photograph/i }));
    // Nothing has been removed yet: the first click opens a confirmation.
    expect(called('admin_remove_content')).toHaveLength(0);
    expect(screen.getByPlaceholderText(/why is this being removed/i)).toBeInTheDocument();
  });

  it('does not offer content removal for a report about an account', async () => {
    REPORTS_IN_DB = [{
      ...REPORT,
      id: 'rep-2',
      target_type: 'profile',
      target_preview: null,
      target_label: 'Eben'
    }];

    renderConsole();
    await screen.findByText('Eben');
    expect(screen.queryByRole('button', { name: /remove photograph/i })).not.toBeInTheDocument();
    expect(screen.getByText(/use the people tab/i)).toBeInTheDocument();
  });
});
