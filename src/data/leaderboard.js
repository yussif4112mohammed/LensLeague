import { photographers } from './photographers.js';

export const leaderboard = {
  global: photographers.map((p, i) => ({
    ...p,
    rank: i + 1,
    trend: i === 0 ? 0 : i === 1 ? 1 : i === 2 ? -1 : Math.floor(Math.random() * 10) - 5,
    weeklyPoints: Math.floor(p.points * 0.04 * Math.random()),
  })),
  category: {
    Portrait: photographers.filter(p => p.categories.includes('Portrait')),
    Landscape: photographers.filter(p => p.categories.includes('Landscape')),
    Street: photographers.filter(p => p.categories.includes('Street')),
    Wedding: photographers.filter(p => p.categories.includes('Wedding')),
  },
};

export const myRank = {
  global: 1,
  country: 1,
  category: 1,
  trend: 3,
  points: 48200,
  weeklyChange: '+1,240 pts this week',
};
