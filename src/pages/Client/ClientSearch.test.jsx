import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

/**
 * Client search.
 *
 * THE BUG THIS EXISTS FOR: every filter on this page used to run over `users`
 * from AppContext, which is filled by a select capped at 100 profiles. The
 * filters were correct and were applied to the wrong hundred rows, so
 * photographer 101 could not be found by name by anybody, ever. An assertion
 * that "searching shows results" would have passed against that version.
 *
 * So the assertions here are: the page ASKS THE DATABASE, it passes the
 * filters to it rather than applying them locally, and it reports the
 * database's total rather than counting what it happens to be holding.
 */

const RPC_CALLS = [];
let RESULTS = [];

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
      if (name === 'search_photographers') return Promise.resolve({ data: RESULTS, error: null });
      return Promise.resolve({ data: null, error: null });
    }
  }
}));

import { AppProvider } from '@/context/AppContext';
import ClientSearch from './ClientSearch';

const RATED = {
  id: 'p-1', name: 'Eben Mensah', username: 'eben', avatar_url: null,
  bio: '', location: 'Accra', specialties: ['Portrait'], service_categories: ['Portrait'],
  starting_rate: 'GHS 800', availability_status: 'Available',
  rating: 4.8, review_count: 12, wins: 3, points: 40, verified: true, total_matches: 137
};

const UNRATED = {
  ...RATED, id: 'p-2', name: 'Ama Owusu', username: 'ama',
  rating: null, review_count: 0, wins: 0, verified: false
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <ClientSearch />
      </AppProvider>
    </MemoryRouter>
  );
}

const searchCalls = () => RPC_CALLS.filter(c => c.name === 'search_photographers');

describe('ClientSearch', () => {
  beforeEach(() => {
    RPC_CALLS.length = 0;
    RESULTS = [RATED, UNRATED];
  });

  it('asks the database instead of filtering a cached hundred profiles', async () => {
    renderPage();
    await waitFor(() => expect(searchCalls().length).toBeGreaterThan(0));
    expect(await screen.findByText('Eben Mensah')).toBeInTheDocument();
  });

  it('reports the real total, not the number of rows on screen', async () => {
    renderPage();
    // Two results are rendered; the database says 137 match.
    expect(await screen.findByText('137 photographers')).toBeInTheDocument();
  });

  it('sends the category filter to the database rather than applying it here', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(searchCalls().length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: 'Portrait' }));
    await waitFor(() => {
      const last = searchCalls()[searchCalls().length - 1];
      expect(last.args.p_category).toBe('Portrait');
    });
  });

  it('sends the minimum rating to the database', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(searchCalls().length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: '4+' }));
    await waitFor(() => {
      const last = searchCalls()[searchCalls().length - 1];
      expect(last.args.p_min_rating).toBe(4);
    });
  });

  it('says "no reviews yet" rather than showing an unrated photographer a score', async () => {
    renderPage();
    expect(await screen.findByText(/no reviews yet/i)).toBeInTheDocument();
  });

  it('puts the review count next to the star, not the battle wins', async () => {
    renderPage();
    // The old page rendered `({p.wins})` here, which every reader takes for a
    // review count. Eben has 12 reviews and 3 wins; both must say what they are.
    expect(await screen.findByText('(12 reviews)')).toBeInTheDocument();
    expect(screen.getByText('3 battles won')).toBeInTheDocument();
  });

  it('offers only sorts the database can actually honour', async () => {
    renderPage();
    const select = await screen.findByRole('combobox', { name: /sort results/i });
    const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent);
    // Nothing counts bookings and nothing stores a coordinate.
    expect(options).not.toContain('Most Booked');
    expect(options).not.toContain('Nearest');
    expect(options).toContain('Best rated');
  });
});
