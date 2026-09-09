import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    castBattleVote: vi.fn().mockResolvedValue({ success: true }),
  }),
}));

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
