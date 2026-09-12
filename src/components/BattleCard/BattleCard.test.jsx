import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * These two components were the ones nothing in the suite ever mounted.
 *
 * That is not an abstract gap. On 2026-09-06 a change that compiled cleanly and
 * left all tests green took production to a blank page for every visitor,
 * because compiling is not rendering and no test rendered anything. The same
 * blind spot covered PhotoCard and BattleCard while they were printing invented
 * camera gear on every screen in the product.
 *
 * So the bar here is deliberately low and deliberately behavioural: mount them,
 * and assert that what a viewer reads is true.
 */

// Hoisted so the tests below can decide what a vote returns.
const castBattleVoteMock = vi.hoisted(() => vi.fn());

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ castBattleVote: castBattleVoteMock }),
}));

beforeEach(() => {
  castBattleVoteMock.mockReset();
  castBattleVoteMock.mockResolvedValue({
    success: true, status: 'active', winnerId: null, votesA: 0, votesB: 0,
  });
});

import BattleCard from './BattleCard';

// The six bodies src/utils/exif.js used to choose between. None of them may
// appear unless a row actually says so.
const FABRICATIONS = [
  'Sony α7R V', 'Fujifilm X-T5', 'Canon EOS R5',
  'Nikon Z8', 'Leica Q3', 'Hasselblad X2D 100C',
];

const side = (over = {}) => ({
  id: 'ph_' + Math.random().toString(36).slice(2),
  url: 'https://example.test/a.jpg',
  photographerName: 'Ama',
  photographerAvatar: 'https://example.test/av.jpg',
  votes: 0,
  ...over,
});

const battleOf = (a, b) => ({ id: 'b1', category: 'Portrait', photoA: a, photoB: b });

describe('BattleCard', () => {
  it('mounts', () => {
    render(<BattleCard battle={battleOf(side(), side({ photographerName: 'Kofi' }))} />);
    expect(screen.getByRole('button', { name: /vote for ama/i })).toBeInTheDocument();
  });

  it('invents no camera for photographs that carry no metadata', () => {
    render(<BattleCard battle={battleOf(side(), side({ photographerName: 'Kofi' }))} />);
    for (const body of FABRICATIONS) {
      expect(screen.queryByText(body)).not.toBeInTheDocument();
    }
    expect(screen.queryByText('Aperture')).not.toBeInTheDocument();
    expect(screen.queryByText('ISO')).not.toBeInTheDocument();
  });

  it('shows the real details of one frame without borrowing them for the other', () => {
    const a = side({ exif_data: { camera: 'Pixel 8 Pro', aperture: 'f/1.7' } });
    const b = side({ photographerName: 'Kofi' });
    render(<BattleCard battle={battleOf(a, b)} />);

    expect(screen.getByText('Pixel 8 Pro')).toBeInTheDocument();
    expect(screen.getByText('f/1.7')).toBeInTheDocument();
    // One aperture pill on the page, not two - B has no metadata and gets none.
    expect(screen.getAllByText('Aperture')).toHaveLength(1);
    expect(screen.queryByText('ISO')).not.toBeInTheDocument();
  });

  it('reads the gear the photographer typed when the file carried none', () => {
    const a = side({ gear: 'Canon EOS R5 + RF 50mm f/1.2' });
    render(<BattleCard battle={battleOf(a, side({ photographerName: 'Kofi' }))} />);
    expect(screen.getByText('Canon EOS R5')).toBeInTheDocument();
    expect(screen.getByText('RF 50mm f/1.2')).toBeInTheDocument();
  });
});

/**
 * The vote path, which took production down the day it first had battles to vote on.
 *
 * castBattleVote returns { success, status, winnerId, votesA, votesB }. The card
 * read eloResults.changeA.startsWith('+') - a field the server stopped sending
 * when the invented Elo ratings were removed - so the FIRST vote anybody cast
 * threw on undefined and React unmounted the page.
 *
 * Four render tests existed for this component and none of them clicked
 * anything. That is the gap these close.
 */
describe('BattleCard, voting', () => {
  const okVote = { success: true, status: 'active', winnerId: null, votesA: 1, votesB: 0 };

  it('does not crash when a vote succeeds', async () => {
    const user = userEvent.setup();
    castBattleVoteMock.mockResolvedValueOnce(okVote);
    render(<BattleCard battle={battleOf(side(), side({ photographerName: 'Kofi' }))} />);
    await user.click(screen.getByRole('button', { name: /vote for ama/i }));

    // Scoped to Ama's side of the card. The count is now shown in two true
    // places - beside the photographer and in the results bar - so an unscoped
    // query matches both and fails for the wrong reason.
    const amaSide = screen.getByRole('button', { name: /vote for ama/i });
    expect(await within(amaSide).findByText(/^1 vote$/)).toBeInTheDocument();
  });

  it('shows the real tally the server returned, not an invented rating', async () => {
    const user = userEvent.setup();
    castBattleVoteMock.mockResolvedValueOnce({ ...okVote, votesA: 3, votesB: 2 });
    render(<BattleCard battle={battleOf(side(), side({ photographerName: 'Kofi' }))} />);
    await user.click(screen.getByRole('button', { name: /vote for ama/i }));

    const amaSide = screen.getByRole('button', { name: /vote for ama/i });
    const kofiSide = screen.getByRole('button', { name: /vote for kofi/i });
    expect(await within(amaSide).findByText(/^3 votes$/)).toBeInTheDocument();
    expect(within(kofiSide).getByText(/^2 votes$/)).toBeInTheDocument();
    // The total is the server's, not local arithmetic.
    expect(screen.getByText(/^5 total$/)).toBeInTheDocument();
    // And no trace of the invented 1200 rating this used to show.
    expect(screen.queryByText(/1200/)).not.toBeInTheDocument();
  });

  it('tells the voter why a refused vote was refused', async () => {
    // `if (results)` was always true - a refusal is an object too - so the
    // error was stored as though it were a result and never shown.
    const user = userEvent.setup();
    castBattleVoteMock.mockResolvedValueOnce({ success: false, error: 'You have already voted on this battle.' });
    render(<BattleCard battle={battleOf(side(), side({ photographerName: 'Kofi' }))} />);
    await user.click(screen.getByRole('button', { name: /vote for ama/i }));
    expect(await screen.findByText(/already voted/i)).toBeInTheDocument();
  });

  it('lets the voter try again after a refusal', async () => {
    const user = userEvent.setup();
    castBattleVoteMock.mockResolvedValueOnce({ success: false, error: 'Network error.' });
    render(<BattleCard battle={battleOf(side(), side({ photographerName: 'Kofi' }))} />);
    const voteA = screen.getByRole('button', { name: /vote for ama/i });
    await user.click(voteA);
    await screen.findByText(/network error/i);
    // A refused vote must not leave the card locked.
    expect(voteA).not.toBeDisabled();
  });
});
