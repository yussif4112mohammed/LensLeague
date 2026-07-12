import { AVATAR_URLS } from './photographers.js';

// Deliberately mixed aspect ratios to showcase the full-photo battle layout:
// Some are 9:16 portrait, some 16:9 landscape, some 1:1 square, some 4:5
const BATTLE_PHOTOS = {
  // 16:9 landscape
  landscape1: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=675&fit=crop&q=85',
  landscape2: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=675&fit=crop&q=85',
  landscape3: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&h=675&fit=crop&q=85',
  landscape4: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&h=675&fit=crop&q=85',

  // 9:16 portrait (tall)
  portrait1: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=675&h=1200&fit=crop&q=85',
  portrait2: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=675&h=1200&fit=crop&q=85',
  portrait3: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=675&h=1200&fit=crop&q=85',

  // 1:1 square
  square1: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=900&h=900&fit=crop&q=85',
  square2: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=900&h=900&fit=crop&q=85',

  // 4:5 (Instagram-style)
  insta1: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&h=1000&fit=crop&q=85',
  insta2: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=1000&fit=crop&q=85',
};

export const battles = [
  {
    // 9:16 portrait vs 16:9 landscape — the toughest case
    id: 'b1', status: 'open',
    photoA: {
      id: 'pa1', url: BATTLE_PHOTOS.portrait1,
      aspectRatio: '9/16',
      photographerId: '1', photographerName: 'Aria Nakamura',
      photographerAvatar: AVATAR_URLS[0], votes: 1842,
    },
    photoB: {
      id: 'pb1', url: BATTLE_PHOTOS.landscape1,
      aspectRatio: '16/9',
      photographerId: '2', photographerName: 'Marcus Osei',
      photographerAvatar: AVATAR_URLS[1], votes: 1103,
    },
    category: 'Portrait', totalVotes: 2945, endsIn: '4h 22m',
  },
  {
    // landscape vs landscape
    id: 'b2', status: 'open',
    photoA: {
      id: 'pa2', url: BATTLE_PHOTOS.landscape2,
      aspectRatio: '16/9',
      photographerId: '3', photographerName: 'Sofia Reyes',
      photographerAvatar: AVATAR_URLS[2], votes: 2210,
    },
    photoB: {
      id: 'pb2', url: BATTLE_PHOTOS.landscape3,
      aspectRatio: '16/9',
      photographerId: '4', photographerName: 'Liam Chen',
      photographerAvatar: AVATAR_URLS[3], votes: 1890,
    },
    category: 'Landscape', totalVotes: 4100, endsIn: '11h 05m',
  },
  {
    // 1:1 square vs 4:5 portrait
    id: 'b3', status: 'open',
    photoA: {
      id: 'pa3', url: BATTLE_PHOTOS.square1,
      aspectRatio: '1/1',
      photographerId: '5', photographerName: 'Zara Okonkwo',
      photographerAvatar: AVATAR_URLS[4], votes: 889,
    },
    photoB: {
      id: 'pb3', url: BATTLE_PHOTOS.insta1,
      aspectRatio: '4/5',
      photographerId: '6', photographerName: 'Diego Vargas',
      photographerAvatar: AVATAR_URLS[5], votes: 1234,
    },
    category: 'Nature', totalVotes: 2123, endsIn: '22h 40m',
  },
  {
    // 4:5 vs 9:16 — both portrait but different ratios
    id: 'b4', status: 'open',
    photoA: {
      id: 'pa4', url: BATTLE_PHOTOS.insta2,
      aspectRatio: '4/5',
      photographerId: '7', photographerName: 'Priya Sharma',
      photographerAvatar: AVATAR_URLS[6], votes: 3412,
    },
    photoB: {
      id: 'pb4', url: BATTLE_PHOTOS.portrait2,
      aspectRatio: '9/16',
      photographerId: '8', photographerName: 'Noah Williams',
      photographerAvatar: AVATAR_URLS[7], votes: 2891,
    },
    category: 'Street', totalVotes: 6303, endsIn: '1d 6h',
  },
  {
    // square vs landscape
    id: 'b5', status: 'open',
    photoA: {
      id: 'pa5', url: BATTLE_PHOTOS.square2,
      aspectRatio: '1/1',
      photographerId: '1', photographerName: 'Aria Nakamura',
      photographerAvatar: AVATAR_URLS[0], votes: 4100,
    },
    photoB: {
      id: 'pb5', url: BATTLE_PHOTOS.landscape4,
      aspectRatio: '16/9',
      photographerId: '3', photographerName: 'Sofia Reyes',
      photographerAvatar: AVATAR_URLS[2], votes: 3780,
    },
    category: 'Editorial', totalVotes: 7880, endsIn: '2d 14h',
  },
];
