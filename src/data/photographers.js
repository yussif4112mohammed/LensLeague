// Unsplash photography images (reliable, free, no auth required)
export const PHOTO_URLS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
  'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&q=80',
  'https://images.unsplash.com/photo-1543731068-7e0f5beff43a?w=800&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
  'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80',
  'https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?w=800&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=800&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
];

export const AVATAR_URLS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=100&h=100&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=100&h=100&fit=crop&q=80',
];

export const CATEGORIES = [
  'Portrait', 'Landscape', 'Street', 'Wedding', 'Product',
  'Nature', 'Editorial', 'Architecture', 'Sports', 'Documentary'
];

export const photographers = [
  {
    id: '1', name: 'Aria Nakamura', username: 'aria.lens',
    avatar: AVATAR_URLS[0], cover: PHOTO_URLS[0],
    location: 'Tokyo, Japan', categories: ['Portrait', 'Editorial'],
    bio: 'Chasing light across continents. Portrait photographer & visual storyteller based in Tokyo. 10+ years, 3 continents.',
    globalRank: 1, categoryRank: 1, points: 48200,
    followers: 18400, following: 342, wins: 87, avgRating: 4.97,
    bookingRequests: 34, verified: true,
    startingPrice: '$800',
  },
  {
    id: '2', name: 'Marcus Osei', username: 'marcusosei',
    avatar: AVATAR_URLS[1], cover: PHOTO_URLS[1],
    location: 'Lagos, Nigeria', categories: ['Street', 'Documentary'],
    bio: 'Documentary photographer with a passion for authentic human stories. National Geographic contributor.',
    globalRank: 2, categoryRank: 1, points: 42100,
    followers: 14200, following: 510, wins: 64, avgRating: 4.92,
    bookingRequests: 21, verified: true,
    startingPrice: '$600',
  },
  {
    id: '3', name: 'Sofia Reyes', username: 'sofiareyes.ph',
    avatar: AVATAR_URLS[2], cover: PHOTO_URLS[2],
    location: 'Mexico City, Mexico', categories: ['Wedding', 'Portrait'],
    bio: 'Wedding & portrait photographer. Capturing love stories across Latin America since 2018.',
    globalRank: 3, categoryRank: 1, points: 38700,
    followers: 11900, following: 780, wins: 52, avgRating: 4.95,
    bookingRequests: 42, verified: true,
    startingPrice: '$1200',
  },
  {
    id: '4', name: 'Liam Chen', username: 'liamchen.photo',
    avatar: AVATAR_URLS[3], cover: PHOTO_URLS[3],
    location: 'San Francisco, USA', categories: ['Landscape', 'Nature'],
    bio: 'Landscape & nature photographer. If I\'m not in the mountains, I\'m planning to be.',
    globalRank: 4, categoryRank: 2, points: 35400,
    followers: 9800, following: 420, wins: 48, avgRating: 4.88,
    bookingRequests: 15, verified: true,
    startingPrice: '$500',
  },
  {
    id: '5', name: 'Zara Okonkwo', username: 'zaraokonkwo',
    avatar: AVATAR_URLS[4], cover: PHOTO_URLS[4],
    location: 'London, UK', categories: ['Editorial', 'Product'],
    bio: 'Commercial & editorial photographer. London-based, globally minded. Clients include VOGUE, Adidas, and Apple.',
    globalRank: 5, categoryRank: 1, points: 31200,
    followers: 8200, following: 290, wins: 39, avgRating: 4.91,
    bookingRequests: 28, verified: true,
    startingPrice: '$1500',
  },
  {
    id: '6', name: 'Diego Vargas', username: 'diegovargas',
    avatar: AVATAR_URLS[5], cover: PHOTO_URLS[5],
    location: 'Buenos Aires, Argentina', categories: ['Street', 'Architecture'],
    bio: 'Street and architecture photographer. The city is my canvas.',
    globalRank: 6, categoryRank: 3, points: 27800,
    followers: 6700, following: 650, wins: 31, avgRating: 4.82,
    bookingRequests: 12, verified: false,
    startingPrice: '$400',
  },
  {
    id: '7', name: 'Priya Sharma', username: 'priyasharma.lens',
    avatar: AVATAR_URLS[6], cover: PHOTO_URLS[6],
    location: 'Mumbai, India', categories: ['Portrait', 'Wedding'],
    bio: 'Celebrating love and culture through photography. Weddings, portraits, and everything in between.',
    globalRank: 7, categoryRank: 2, points: 24500,
    followers: 5300, following: 410, wins: 27, avgRating: 4.85,
    bookingRequests: 19, verified: true,
    startingPrice: '$350',
  },
  {
    id: '8', name: 'Noah Williams', username: 'noahwilliams.ph',
    avatar: AVATAR_URLS[7], cover: PHOTO_URLS[7],
    location: 'Sydney, Australia', categories: ['Sports', 'Documentary'],
    bio: 'Sports and action photographer. Capturing the decisive moment in sport and life.',
    globalRank: 8, categoryRank: 1, points: 21900,
    followers: 4600, following: 380, wins: 22, avgRating: 4.79,
    bookingRequests: 9, verified: false,
    startingPrice: '$600',
  },
];

export const ME = photographers[0]; // Logged-in user (photographer view)

export const ME_CLIENT = {
  id: 'c1', name: 'Jordan Blake', username: 'jordanblake',
  avatar: AVATAR_URLS[3], role: 'client',
  location: 'New York, USA',
  company: 'Blake Creative Agency',
};
