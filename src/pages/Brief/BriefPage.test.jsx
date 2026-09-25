import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The Brief, as the screen actually behaves.
 *
 * The spec's hardest edge case is "no open brief": the page must show the last
 * one and when the next opens, never an empty page. An empty page on the
 * feature whose entire job is to give somebody a reason to pick up a camera is
 * the failure that matters, and it is the state the page spends most of its
 * life in between briefs.
 */

let BRIEF_ROW = null;
let BRIEF_ERROR = null;
let ENTRY_ROWS = [];
const RPC_CALLS = [];

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
    channel: () => channel,
    removeChannel: () => {},
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null })
    },
    rpc: (name, args) => {
      RPC_CALLS.push({ name, args });
      if (name === 'get_current_brief') {
        return Promise.resolve(BRIEF_ERROR
          ? { data: null, error: { message: BRIEF_ERROR } }
          : { data: BRIEF_ROW ? [BRIEF_ROW] : [], error: null });
      }
      if (name === 'get_brief_entries')  return Promise.resolve({ data: ENTRY_ROWS, error: null });
      return Promise.resolve({ data: null, error: null });
    }
  }
}));

import { AppProvider } from '@/context/AppContext';
import BriefPage from './BriefPage';

const OPEN_BRIEF = {
  id: 'brief-1',
  title: 'Golden hour, no sun',
  prompt: 'Shoot in the last hour before sunset, and keep the sun out of the frame.',
  category: null,
  opens_at: '2026-09-14T00:00:00Z',
  closes_at: '2026-09-21T00:00:00Z',
  is_open: true,
  seconds_remaining: 2 * 86400 + 3 * 3600,
  entries_total: 2,
  photographers: 2,
  my_entries: 0,
  max_entries: 3,
  next_opens_at: null
};

const ENTRY = {
  item_id: 'item-1',
  media_url: 'https://example.test/one.jpg',
  caption: 'Long shadows',
  width: 1200, height: 1500,
  entered_at: '2026-09-15T18:00:00Z',
  owner_id: 'user-2',
  owner_name: 'Eben',
  owner_avatar: null
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <BriefPage />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('BriefPage', () => {
  beforeEach(() => {
    RPC_CALLS.length = 0;
    BRIEF_ROW = { ...OPEN_BRIEF };
    BRIEF_ERROR = null;
    ENTRY_ROWS = [ENTRY];
  });

  it('puts the constraint itself first, from the database', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Golden hour, no sun' })).toBeInTheDocument();
    expect(screen.getByText(/keep the sun out of the frame/i)).toBeInTheDocument();
    await waitFor(() => expect(RPC_CALLS.some(c => c.name === 'get_current_brief')).toBe(true));
  });

  it('states the upload-window rule where a photographer will read it BEFORE shooting', async () => {
    renderPage();
    // Being refused at the end of an upload, with no earlier warning, is how
    // this feature loses someone on their first attempt.
    expect(await screen.findByText(/only photographs uploaded while the brief is open/i)).toBeInTheDocument();
  });

  it('moves the call to action through its three states', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /shoot this/i })).toBeInTheDocument();
  });

  it('says how much time is left in an honest unit', async () => {
    renderPage();
    expect(await screen.findByText(/2d 3h left/)).toBeInTheDocument();
  });

  it('shows the last brief and the next date rather than an empty page', async () => {
    BRIEF_ROW = {
      ...OPEN_BRIEF,
      is_open: false,
      seconds_remaining: 0,
      next_opens_at: '2026-09-28T00:00:00Z'
    };
    ENTRY_ROWS = [ENTRY];

    renderPage();
    expect(await screen.findByRole('heading', { name: 'Golden hour, no sun' })).toBeInTheDocument();
    expect(screen.getByText(/last brief/i)).toBeInTheDocument();
    expect(screen.getByText(/the next brief opens/i)).toBeInTheDocument();
    // No call to action on a closed brief: there is nothing to enter.
    expect(screen.queryByRole('button', { name: /shoot this/i })).not.toBeInTheDocument();
  });

  it('says so plainly when no brief has ever run', async () => {
    BRIEF_ROW = null;
    ENTRY_ROWS = [];
    renderPage();
    expect(await screen.findByRole('heading', { name: /no brief yet/i })).toBeInTheDocument();
  });

  it('renders the entries that came back, attributed', async () => {
    renderPage();
    expect(await screen.findByText('Eben')).toBeInTheDocument();
  });

  it('SAYS THE CALL FAILED RATHER THAN PRETENDING NO BRIEF EXISTS', async () => {
    // get_current_brief raised on every call from the day it shipped - its
    // RETURNS TABLE columns collided with bare column references in its own
    // WHERE clauses. The client swallowed that and rendered "No brief yet",
    // which is what a healthy platform with no briefs looks like. The bug was
    // invisible because the failure had a friendly face.
    BRIEF_ERROR = 'column reference "opens_at" is ambiguous';
    BRIEF_ROW = null;

    renderPage();

    expect(await screen.findByRole('heading', { name: /could not load/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /no brief yet/i })).not.toBeInTheDocument();
    expect(screen.getByText(/opens_at" is ambiguous/)).toBeInTheDocument();
  });
});
