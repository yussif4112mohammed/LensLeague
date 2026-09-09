import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * PhotoCard renders on nearly every screen in the product, and until now
 * nothing mounted it. See the note in BattleCard.test.jsx for why that matters.
 *
 * Two behaviours are pinned here, both of which were wrong in production:
 * the camera details must be the photograph's own or absent, and the frame must
 * be shown in the shape it was shot in.
 */

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    follows: [],
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    currentUser: null,
    comments: [],
    toggleLikePost: vi.fn(),
    toggleSavedItem: vi.fn(),
    savedItemIds: [],
    users: [],
  }),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../CommentSheet/CommentSheet', () => ({ default: () => null }));
vi.mock('../SmartImage/SmartImage', () => ({
  default: ({ alt }) => <img alt={alt} />,
}));

import PhotoCard from './PhotoCard';

const FABRICATIONS = [
  'Sony α7R V', 'Fujifilm X-T5', 'Canon EOS R5',
  'Nikon Z8', 'Leica Q3', 'Hasselblad X2D 100C',
];

const photoOf = (over = {}) => ({
  id: 'ph_1',
  url: 'https://example.test/a.jpg',
  ownerId: 'u1',
  ownerName: 'Ama',
  ownerAvatar: 'https://example.test/av.jpg',
  caption: 'Harmattan morning',
  likes: 0,
  ...over,
});

describe('PhotoCard', () => {
  it('mounts', () => {
    const { container } = render(<PhotoCard photo={photoOf()} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('invents no camera for a photograph that carries no metadata', () => {
    render(<PhotoCard photo={photoOf()} />);
    for (const body of FABRICATIONS) {
      expect(screen.queryByText(body)).not.toBeInTheDocument();
    }
    expect(screen.queryByText('Aperture')).not.toBeInTheDocument();
    expect(screen.queryByText('Shutter')).not.toBeInTheDocument();
    expect(screen.queryByText('ISO')).not.toBeInTheDocument();
  });

  it('shows only the fields the photograph does carry', () => {
    render(<PhotoCard photo={photoOf({ exif_data: { camera: 'Pixel 8 Pro', iso: 'ISO 400' } })} />);
    expect(screen.getByText('Pixel 8 Pro')).toBeInTheDocument();
    expect(screen.getByText('ISO 400')).toBeInTheDocument();
    expect(screen.getByText('ISO')).toBeInTheDocument();
    // No aperture in the row, so no aperture pill.
    expect(screen.queryByText('Aperture')).not.toBeInTheDocument();
  });

  it('renders the frame in its measured shape rather than a square', () => {
    const { container } = render(
      <PhotoCard photo={photoOf({ width: 3000, height: 2000, aspectRatio: '3000 / 2000' })} compact />
    );
    const tile = container.firstChild;
    expect(tile.style.aspectRatio).toBe('3000 / 2000');
    expect(tile.className).not.toMatch(/aspect-square/);
  });

  it('falls back to a square only when the shape is genuinely unknown', () => {
    const { container } = render(<PhotoCard photo={photoOf()} compact />);
    const tile = container.firstChild;
    expect(tile.className).toMatch(/aspect-square/);
    expect(tile.style.aspectRatio).toBe('');
  });

  it('names the shape when the file carried no camera details', () => {
    render(<PhotoCard photo={photoOf({ width: 1920, height: 1080 })} />);
    expect(screen.getByText('16:9 landscape')).toBeInTheDocument();
  });
});
