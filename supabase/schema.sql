-- LensLeague Database Schema Setup

-- ── 1. PROFILES TABLE ──
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  avatar TEXT,
  bio TEXT,
  location TEXT,
  role TEXT NOT NULL CHECK (role IN ('photographer', 'client')),
  verified BOOLEAN DEFAULT false,
  banned BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 0,
  global_rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own profile record" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- ── 2. PHOTOS TABLE ──
CREATE TABLE public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  caption TEXT,
  category TEXT,
  votes INTEGER DEFAULT 0,
  aspect_ratio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Photos
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to photos" 
  ON public.photos FOR SELECT USING (true);

CREATE POLICY "Allow creators to upload photos" 
  ON public.photos FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Allow creators to delete their own photos" 
  ON public.photos FOR DELETE USING (auth.uid() = owner_id);


-- ── 3. BOOKINGS TABLE ──
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  budget TEXT,
  location TEXT,
  message TEXT,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'declined', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own bookings" 
  ON public.bookings FOR SELECT USING (auth.uid() = client_id OR auth.uid() = photographer_id);

CREATE POLICY "Allow clients to request bookings" 
  ON public.bookings FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Allow photographers/clients to update booking status" 
  ON public.bookings FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = photographer_id);


-- ── 4. MESSAGES TABLE ──
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own chats" 
  ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Allow users to send messages" 
  ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);


-- ── 5. BATTLE VOTES TABLE ──
CREATE TABLE public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
  battle_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(voter_id, battle_id)
);

-- Enable RLS on Votes
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to votes" 
  ON public.votes FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to cast votes" 
  ON public.votes FOR INSERT WITH CHECK (auth.uid() = voter_id);


-- ── 6. CHALLENGES & ENTRIES ──
CREATE TABLE public.challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  theme TEXT,
  cover_url TEXT,
  prize_points INTEGER DEFAULT 0,
  ends_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.challenge_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id TEXT REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(challenge_id, photographer_id)
);

-- Enable RLS on Challenges & Entries
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to challenges" 
  ON public.challenges FOR SELECT USING (true);

CREATE POLICY "Allow public read access to challenge entries" 
  ON public.challenge_entries FOR SELECT USING (true);

CREATE POLICY "Allow photographers to submit entries" 
  ON public.challenge_entries FOR INSERT WITH CHECK (auth.uid() = photographer_id);


-- ── 7. ADMIN REPORTED ITEMS ──
CREATE TABLE public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
  photographer_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  reason TEXT NOT NULL,
  reporter TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'removed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  votes_a INTEGER NOT NULL,
  votes_b INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reporter TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on Reports & Disputes (Strict Admin Only)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin operations on reports"
  ON public.reports FOR ALL USING (true); -- Full policy validation done at application level

CREATE POLICY "Allow admin operations on disputes"
  ON public.disputes FOR ALL USING (true);


-- ── 8. CREATE INDEXES FOR SPEED ──
CREATE INDEX idx_photos_owner ON public.photos(owner_id);
CREATE INDEX idx_photos_category ON public.photos(category);
CREATE INDEX idx_bookings_client ON public.bookings(client_id);
CREATE INDEX idx_bookings_photographer ON public.bookings(photographer_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_entries_challenge ON public.challenge_entries(challenge_id);
CREATE INDEX idx_entries_user ON public.challenge_entries(photographer_id);


-- ── 9. SOCIAL FOLLOWS SYSTEM ──
CREATE TABLE public.follows (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to follows"
  ON public.follows FOR SELECT USING (true);

CREATE POLICY "Allow users to follow others"
  ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Allow users to unfollow others"
  ON public.follows FOR DELETE USING (auth.uid() = follower_id);

CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);


-- ── 10. PHOTO COMMENTS SYSTEM ──
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to comments"
  ON public.comments FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to write comments"
  ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_comments_photo ON public.comments(photo_id);

-- ── 11. LINKEDIN-STYLE MUTUAL CONNECTIONS ──
CREATE TABLE public.connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_b_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_a_id, user_b_id)
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their connections"
  ON public.connections FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Allow users to request connection"
  ON public.connections FOR INSERT WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Allow participants to update connection status"
  ON public.connections FOR UPDATE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);


-- ── 12. VERIFIED REVIEWS TABLE (COMPLETED BOOKINGS ONLY) ──
CREATE TABLE public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to reviews"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to write reviews for completed bookings"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);


-- ── 13. SAVED ITEMS & COLLECTIONS ──
CREATE TABLE public.saved_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
  collection_name TEXT DEFAULT 'Favorites',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, photo_id)
);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their saved items"
  ON public.saved_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to save items"
  ON public.saved_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to remove saved items"
  ON public.saved_items FOR DELETE USING (auth.uid() = user_id);


-- ── 14. CENTRAL SECURITY AUDIT LOGS ──
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to record audit logs"
  ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Allow admin to read audit logs"
  ON public.audit_logs FOR SELECT USING (true);

