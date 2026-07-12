import { PHOTO_URLS, AVATAR_URLS } from './photographers.js';

export const challenges = [
  {
    id: 'ch1', title: 'Golden Hour Portraits',
    theme: 'Capture human subjects bathed in golden hour light — that magical 30-minute window before sunset.',
    endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    entries: 847, prizePoints: 2500, status: 'active', featured: true,
    coverUrl: PHOTO_URLS[0],
    winners: [],
  },
  {
    id: 'ch2', title: 'Urban Geometry',
    theme: 'Find patterns, lines, and shapes hidden in city architecture and street scenes.',
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    entries: 423, prizePoints: 1500, status: 'active', featured: false,
    coverUrl: PHOTO_URLS[5],
    winners: [],
  },
  {
    id: 'ch3', title: 'Silence & Motion',
    theme: 'Explore the contrast between absolute stillness and dynamic movement in a single frame.',
    endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    entries: 218, prizePoints: 2000, status: 'active', featured: false,
    coverUrl: PHOTO_URLS[7],
    winners: [],
  },
  {
    id: 'ch4', title: 'Street Stories',
    theme: 'Documentary street photography — real people, real moments, unposed.',
    endsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    entries: 1204, prizePoints: 3000, status: 'past', featured: false,
    coverUrl: PHOTO_URLS[8],
    winners: [
      { photographerId: '2', photographerName: 'Marcus Osei', photographerAvatar: AVATAR_URLS[1], photoUrl: PHOTO_URLS[8], rank: 1 },
      { photographerId: '6', photographerName: 'Diego Vargas', photographerAvatar: AVATAR_URLS[5], photoUrl: PHOTO_URLS[5], rank: 2 },
      { photographerId: '7', photographerName: 'Priya Sharma', photographerAvatar: AVATAR_URLS[6], photoUrl: PHOTO_URLS[6], rank: 3 },
    ],
  },
  {
    id: 'ch5', title: 'The Blue Hour',
    theme: 'Capture the world in that brief twilight period when everything turns deep blue.',
    endsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    entries: 956, prizePoints: 2000, status: 'past', featured: false,
    coverUrl: PHOTO_URLS[9],
    winners: [
      { photographerId: '1', photographerName: 'Aria Nakamura', photographerAvatar: AVATAR_URLS[0], photoUrl: PHOTO_URLS[0], rank: 1 },
      { photographerId: '4', photographerName: 'Liam Chen', photographerAvatar: AVATAR_URLS[3], photoUrl: PHOTO_URLS[3], rank: 2 },
      { photographerId: '8', photographerName: 'Noah Williams', photographerAvatar: AVATAR_URLS[7], photoUrl: PHOTO_URLS[7], rank: 3 },
    ],
  },
];
