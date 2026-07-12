import { PHOTO_URLS, AVATAR_URLS } from './photographers.js';

export const battles = [
  {
    id: 'b1', status: 'open',
    photoA: { id: 'pa1', url: PHOTO_URLS[0], photographerId: '1', photographerName: 'Aria Nakamura', photographerAvatar: AVATAR_URLS[0], votes: 1842 },
    photoB: { id: 'pb1', url: PHOTO_URLS[1], photographerId: '2', photographerName: 'Marcus Osei', photographerAvatar: AVATAR_URLS[1], votes: 1103 },
    category: 'Portrait', totalVotes: 2945, endsIn: '4h 22m',
  },
  {
    id: 'b2', status: 'open',
    photoA: { id: 'pa2', url: PHOTO_URLS[2], photographerId: '3', photographerName: 'Sofia Reyes', photographerAvatar: AVATAR_URLS[2], votes: 2210 },
    photoB: { id: 'pb2', url: PHOTO_URLS[3], photographerId: '4', photographerName: 'Liam Chen', photographerAvatar: AVATAR_URLS[3], votes: 1890 },
    category: 'Landscape', totalVotes: 4100, endsIn: '11h 05m',
  },
  {
    id: 'b3', status: 'open',
    photoA: { id: 'pa3', url: PHOTO_URLS[4], photographerId: '5', photographerName: 'Zara Okonkwo', photographerAvatar: AVATAR_URLS[4], votes: 889 },
    photoB: { id: 'pb3', url: PHOTO_URLS[5], photographerId: '6', photographerName: 'Diego Vargas', photographerAvatar: AVATAR_URLS[5], votes: 1234 },
    category: 'Nature', totalVotes: 2123, endsIn: '22h 40m',
  },
  {
    id: 'b4', status: 'open',
    photoA: { id: 'pa4', url: PHOTO_URLS[6], photographerId: '7', photographerName: 'Priya Sharma', photographerAvatar: AVATAR_URLS[6], votes: 3412 },
    photoB: { id: 'pb4', url: PHOTO_URLS[7], photographerId: '8', photographerName: 'Noah Williams', photographerAvatar: AVATAR_URLS[7], votes: 2891 },
    category: 'Street', totalVotes: 6303, endsIn: '1d 6h',
  },
  {
    id: 'b5', status: 'open',
    photoA: { id: 'pa5', url: PHOTO_URLS[8], photographerId: '1', photographerName: 'Aria Nakamura', photographerAvatar: AVATAR_URLS[0], votes: 4100 },
    photoB: { id: 'pb5', url: PHOTO_URLS[9], photographerId: '3', photographerName: 'Sofia Reyes', photographerAvatar: AVATAR_URLS[2], votes: 3780 },
    category: 'Editorial', totalVotes: 7880, endsIn: '2d 14h',
  },
];
