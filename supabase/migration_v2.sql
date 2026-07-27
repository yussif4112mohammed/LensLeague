-- ═══════════════════════════════════════════════════════════════════
-- LensLeague v2 Migration — Production Auth, Onboarding & Social
-- ═══════════════════════════════════════════════════════════════════
-- SAFE: Idempotent — uses IF NOT EXISTS, CREATE OR REPLACE, DROP IF EXISTS
-- SAFE: Does NOT drop or alter any existing tables/columns
-- SAFE: Adds new tables alongside existing ones (photos, challenges, etc.)
-- RUN:  Paste into Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════


-- ─── 1. EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ─── 2. CATEGORIES REFERENCE TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

INSERT INTO public.categories (name) VALUES
  ('Portrait'), ('Street'), ('Wildlife'), ('Fashion'), ('Sports'),
  ('Landscape'), ('Wedding'), ('Documentary'), ('Product'), ('Editorial')
ON CONFLICT (name) DO NOTHING;


-- ─── 2B. BASE SCHEMA TABLES (Idempotent creation for brand new Supabase projects) ───

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Anonymous',
  username TEXT UNIQUE,
  avatar TEXT,
  bio TEXT,
  location TEXT,
  role TEXT NOT NULL DEFAULT 'photographer' CHECK (role IN ('photographer', 'client')),
  verified BOOLEAN DEFAULT false,
  banned BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 0,
  global_rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
CREATE POLICY "Allow public read access to profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.profiles;
CREATE POLICY "Allow authenticated users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Allow users to insert their own profile record" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile record" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  caption TEXT,
  category TEXT,
  votes INTEGER DEFAULT 0,
  aspect_ratio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to photos" ON public.photos;
CREATE POLICY "Allow public read access to photos" ON public.photos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow creators to upload photos" ON public.photos;
CREATE POLICY "Allow creators to upload photos" ON public.photos FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Allow creators to delete their own photos" ON public.photos;
CREATE POLICY "Allow creators to delete their own photos" ON public.photos FOR DELETE USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.bookings (
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
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to read their own bookings" ON public.bookings;
CREATE POLICY "Allow users to read their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = client_id OR auth.uid() = photographer_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to read their own chats" ON public.messages;
CREATE POLICY "Allow users to read their own chats" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Allow users to send messages" ON public.messages;
CREATE POLICY "Allow users to send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE TABLE IF NOT EXISTS public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(voter_id, photo_id)
);
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prize TEXT,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.challenge_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  initiator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to follows" ON public.follows;
CREATE POLICY "Allow public read access to follows" ON public.follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow users to follow others" ON public.follows;
CREATE POLICY "Allow users to follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Allow users to unfollow others" ON public.follows;
CREATE POLICY "Allow users to unfollow others" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.comments;
CREATE POLICY "Allow public read access to comments" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to write comments" ON public.comments;
CREATE POLICY "Allow authenticated users to write comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_b_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_a_id, user_b_id)
);
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.saved_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
  collection_name TEXT DEFAULT 'Favorites',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, photo_id)
);
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- ─── 3. PROFILE TABLE — ADD NEW COLUMNS ────────────────────────
-- Existing columns preserved: id, name, username, avatar, bio,
-- location, role, verified, banned, points, global_rank, created_at

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS camera_gear TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photography_style TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posts_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS competitions_won INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Unique constraint on email (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_unique') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- Trigram indexes for fast user search
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON public.profiles USING gin (display_name gin_trgm_ops);


-- ─── 4. PROFILE CATEGORIES (onboarding interests) ──────────────
CREATE TABLE IF NOT EXISTS public.profile_categories (
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id INT REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, category_id)
);

ALTER TABLE public.profile_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_categories_select_all" ON public.profile_categories;
CREATE POLICY "profile_categories_select_all" ON public.profile_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profile_categories_owner_write" ON public.profile_categories;
CREATE POLICY "profile_categories_owner_write" ON public.profile_categories
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);


-- ─── 5. POSTS TABLE (new, alongside existing photos table) ─────
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  original_url TEXT,
  thumbnail_url TEXT,
  caption TEXT CHECK (char_length(caption) <= 2200),
  category_id INT REFERENCES public.categories(id),
  location TEXT,
  camera_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers', 'private')),
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  vote_count INT NOT NULL DEFAULT 0,
  booking_enabled BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_caption_trgm
  ON public.posts USING gin (caption gin_trgm_ops);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_visible" ON public.posts;
CREATE POLICY "posts_select_visible" ON public.posts
  FOR SELECT USING (
    visibility = 'public'
    OR author_id = auth.uid()
    OR (visibility = 'followers' AND EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = auth.uid() AND following_id = posts.author_id
    ))
  );

DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
CREATE POLICY "posts_insert_own" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;
CREATE POLICY "posts_delete_own" ON public.posts
  FOR DELETE USING (auth.uid() = author_id);


-- ─── 6. HASHTAGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hashtags (
  id SERIAL PRIMARY KEY,
  tag TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.post_hashtags (
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  hashtag_id INT REFERENCES public.hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON public.post_hashtags(hashtag_id);

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hashtags_select_all" ON public.hashtags;
CREATE POLICY "hashtags_select_all" ON public.hashtags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "hashtags_insert_authenticated" ON public.hashtags;
CREATE POLICY "hashtags_insert_authenticated" ON public.hashtags
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "post_hashtags_select_all" ON public.post_hashtags;
CREATE POLICY "post_hashtags_select_all" ON public.post_hashtags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_hashtags_owner_write" ON public.post_hashtags;
CREATE POLICY "post_hashtags_owner_write" ON public.post_hashtags
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid())
  );


-- ─── 7. LIKES TABLE (for new posts, PK prevents duplicates) ────
CREATE TABLE IF NOT EXISTS public.likes (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes(post_id);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_select_all" ON public.likes;
CREATE POLICY "likes_select_all" ON public.likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "likes_insert_own" ON public.likes;
CREATE POLICY "likes_insert_own" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "likes_delete_own" ON public.likes;
CREATE POLICY "likes_delete_own" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);


-- ─── 8. COMMENTS — ADD THREADING COLUMNS ───────────────────────
-- Existing columns preserved: id, photo_id, user_id, body, created_at
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID
    REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);


-- ─── 9. SAVED POSTS (for new posts table) ──────────────────────
-- Existing saved_items table preserved for old photos
CREATE TABLE IF NOT EXISTS public.saved_posts (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_posts_owner_only" ON public.saved_posts;
CREATE POLICY "saved_posts_owner_only" ON public.saved_posts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── 10. POST SHARES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_shares_insert_own" ON public.post_shares;
CREATE POLICY "post_shares_insert_own" ON public.post_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_shares_select_own" ON public.post_shares;
CREATE POLICY "post_shares_select_own" ON public.post_shares
  FOR SELECT USING (auth.uid() = user_id);


-- ─── 11. MENTIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentioning_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_mentions_user
  ON public.mentions(mentioned_user_id, created_at DESC);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentions_select_involved" ON public.mentions;
CREATE POLICY "mentions_select_involved" ON public.mentions
  FOR SELECT USING (
    auth.uid() = mentioned_user_id OR auth.uid() = mentioning_user_id
  );

DROP POLICY IF EXISTS "mentions_insert_own" ON public.mentions;
CREATE POLICY "mentions_insert_own" ON public.mentions
  FOR INSERT WITH CHECK (auth.uid() = mentioning_user_id);


-- ─── 12. NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'like','comment','reply','follow','mention',
    'competition_result','booking_request','booking_update','message'
  )),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  booking_id UUID,  -- FK added below after we confirm bookings exists
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications(recipient_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Link notifications.booking_id → bookings.id (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_booking'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT fk_notifications_booking
      FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
END $$;


-- ─── 13. COMPETITIONS (new, alongside existing challenges) ─────
CREATE TABLE IF NOT EXISTS public.competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id INT NOT NULL REFERENCES public.categories(id),
  round INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','voting','closed')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitions_select_all" ON public.competitions;
CREATE POLICY "competitions_select_all" ON public.competitions
  FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.competition_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES public.categories(id),
  round INT NOT NULL DEFAULT 1,
  vote_count INT NOT NULL DEFAULT 0,
  ranking INT,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (competition_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_entries
  ON public.competition_entries(competition_id, category_id, round);

ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entries_select_all" ON public.competition_entries;
CREATE POLICY "entries_select_all" ON public.competition_entries
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "entries_insert_own_post" ON public.competition_entries;
CREATE POLICY "entries_insert_own_post" ON public.competition_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid())
  );

-- Enforce: entry category must match post's category
CREATE OR REPLACE FUNCTION public.check_entry_category_matches_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_id <> (
    SELECT category_id FROM public.posts WHERE id = NEW.post_id
  ) THEN
    RAISE EXCEPTION 'Competition entry category must match the post category';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entry_category_check ON public.competition_entries;
CREATE TRIGGER trg_entry_category_check
  BEFORE INSERT OR UPDATE ON public.competition_entries
  FOR EACH ROW EXECUTE FUNCTION public.check_entry_category_matches_post();

-- Head-to-head battles
CREATE TABLE IF NOT EXISTS public.competition_battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  round INT NOT NULL,
  entry_a_id UUID NOT NULL REFERENCES public.competition_entries(id) ON DELETE CASCADE,
  entry_b_id UUID NOT NULL REFERENCES public.competition_entries(id) ON DELETE CASCADE,
  winner_entry_id UUID REFERENCES public.competition_entries(id),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.competition_battles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "battles_select_all" ON public.competition_battles;
CREATE POLICY "battles_select_all" ON public.competition_battles
  FOR SELECT USING (true);

-- Competition votes (unique per voter per battle)
CREATE TABLE IF NOT EXISTS public.competition_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES public.competition_battles(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voted_entry_id UUID NOT NULL REFERENCES public.competition_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (battle_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_votes_battle
  ON public.competition_votes(battle_id);

ALTER TABLE public.competition_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comp_votes_select_all" ON public.competition_votes;
CREATE POLICY "comp_votes_select_all" ON public.competition_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "comp_votes_insert_own" ON public.competition_votes;
CREATE POLICY "comp_votes_insert_own" ON public.competition_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);


-- ─── 14. BOOKING TABLE — ADD NEW COLUMNS ───────────────────────
-- Existing columns preserved: id, client_id, photographer_id, date,
-- budget, location, message, status, created_at
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS time_slot TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS format TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS requirements TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


-- ─── 15. BOOKING MESSAGES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking
  ON public.booking_messages(booking_id, created_at);

ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_messages_select_involved" ON public.booking_messages;
CREATE POLICY "booking_messages_select_involved" ON public.booking_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "booking_messages_insert_involved" ON public.booking_messages;
CREATE POLICY "booking_messages_insert_involved" ON public.booking_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid())
    )
  );


-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS & FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════


-- ─── 16. AUTH TRIGGER — Auto-create Profile on Signup ───────────
-- Compatible with existing code: if no username in metadata,
-- derives one from the email. Skips if profile already exists.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  chosen_username TEXT;
  chosen_name TEXT;
  chosen_role TEXT;
  chosen_location TEXT;
BEGIN
  -- Extract from signup metadata
  chosen_username := LOWER(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'username',
    ''
  )));
  chosen_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  chosen_role := COALESCE(NEW.raw_user_meta_data->>'role', 'photographer');
  chosen_location := NEW.raw_user_meta_data->>'location';

  -- Fallback: derive username from email if not provided
  IF chosen_username = '' OR char_length(chosen_username) < 3 THEN
    chosen_username := LOWER(REGEXP_REPLACE(
      SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9_.]', '', 'g'
    ));
    IF char_length(chosen_username) < 3 THEN
      chosen_username := 'user_' || SUBSTR(NEW.id::text, 1, 8);
    END IF;
    -- Ensure uniqueness by appending suffix if taken
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = chosen_username) LOOP
      chosen_username := chosen_username || '_' || SUBSTR(md5(random()::text), 1, 4);
    END LOOP;
  END IF;

  -- Fallback: name from username
  IF chosen_name = '' THEN
    chosen_name := chosen_username;
  END IF;

  -- Validate role
  IF chosen_role NOT IN ('photographer', 'client') THEN
    chosen_role := 'photographer';
  END IF;

  -- Skip if profile already exists (backward compat with old signup flow)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    -- Update email/display_name if not set
    UPDATE public.profiles SET
      email = COALESCE(email, NEW.email),
      display_name = COALESCE(display_name, chosen_name),
      updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  -- Insert new profile (will fail on duplicate username → rollback auth row)
  INSERT INTO public.profiles (
    id, username, name, display_name, email,
    role, location, created_at, updated_at
  ) VALUES (
    NEW.id, chosen_username, chosen_name, chosen_name, NEW.email,
    chosen_role, chosen_location, NOW(), NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── 17. USERNAME AVAILABILITY CHECK ────────────────────────────

CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = LOWER(TRIM(check_username))
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO anon, authenticated;


-- ─── 18. COUNTER SYNC TRIGGERS ─────────────────────────────────

-- Likes → posts.like_count + notification
CREATE OR REPLACE FUNCTION public.on_like_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts SET like_count = like_count + 1
  WHERE id = NEW.post_id;

  INSERT INTO public.notifications (recipient_id, actor_id, type, post_id)
  SELECT author_id, NEW.user_id, 'like', NEW.post_id
  FROM public.posts
  WHERE id = NEW.post_id AND author_id <> NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_like_insert ON public.likes;
CREATE TRIGGER trg_like_insert AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.on_like_insert();

CREATE OR REPLACE FUNCTION public.on_like_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_like_delete ON public.likes;
CREATE TRIGGER trg_like_delete AFTER DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.on_like_delete();

-- Follows → profiles counters + notification
CREATE OR REPLACE FUNCTION public.on_follow_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    UPDATE public.profiles SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;

    INSERT INTO public.notifications (recipient_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_follow_change ON public.follows;
CREATE TRIGGER trg_follow_change AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.on_follow_change();

-- Posts → profiles.posts_count
CREATE OR REPLACE FUNCTION public.on_post_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET posts_count = posts_count + 1
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_post_insert ON public.posts;
CREATE TRIGGER trg_post_insert AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.on_post_insert();

-- Competition votes → entry.vote_count
CREATE OR REPLACE FUNCTION public.on_competition_vote_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.competition_entries SET vote_count = vote_count + 1
  WHERE id = NEW.voted_entry_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_comp_vote_insert ON public.competition_votes;
CREATE TRIGGER trg_comp_vote_insert AFTER INSERT ON public.competition_votes
  FOR EACH ROW EXECUTE FUNCTION public.on_competition_vote_insert();

-- Booking insert → notify photographer
CREATE OR REPLACE FUNCTION public.on_booking_insert_notify()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (recipient_id, actor_id, type, booking_id)
  VALUES (NEW.photographer_id, NEW.client_id, 'booking_request', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_booking_insert_notify ON public.bookings;
CREATE TRIGGER trg_booking_insert_notify AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.on_booking_insert_notify();

-- Booking status change → notify the other party
CREATE OR REPLACE FUNCTION public.on_booking_update_notify()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, booking_id)
    VALUES (
      CASE
        WHEN auth.uid() = NEW.client_id THEN NEW.photographer_id
        ELSE NEW.client_id
      END,
      COALESCE(auth.uid(), NEW.client_id),
      'booking_update',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_booking_update_notify ON public.bookings;
CREATE TRIGGER trg_booking_update_notify AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.on_booking_update_notify();


-- ═══════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════


-- ─── 19. FEED RANKING ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_feed(
  p_user_id UUID,
  p_cursor TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS SETOF public.posts AS $$
  SELECT p.*
  FROM public.posts p
  WHERE p.visibility = 'public'
    AND (p_cursor IS NULL OR p.created_at < p_cursor)
  ORDER BY
    (
      (p.like_count * 1.0 + p.comment_count * 2.0 + p.vote_count * 3.0)
      / POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.5)
    )
    + (CASE WHEN EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = p_user_id AND f.following_id = p.author_id
      ) THEN 50 ELSE 0 END)
    DESC,
    p.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_feed(UUID, TIMESTAMPTZ, INT) TO authenticated;


-- ─── 20. SEARCH ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_users(
  query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID, username TEXT, display_name TEXT, name TEXT,
  avatar TEXT, avatar_url TEXT, bio TEXT, location TEXT,
  role TEXT, points INT, followers_count INT,
  posts_count INT, competitions_won INT
) AS $$
  SELECT
    p.id, p.username, p.display_name, p.name,
    p.avatar, p.avatar_url, p.bio, p.location,
    p.role, p.points, p.followers_count,
    p.posts_count, p.competitions_won
  FROM public.profiles p
  WHERE p.username ILIKE '%' || query || '%'
     OR p.display_name ILIKE '%' || query || '%'
     OR p.name ILIKE '%' || query || '%'
  ORDER BY similarity(p.username, query) DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.search_users(TEXT, INT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_posts(
  query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS SETOF public.posts AS $$
  SELECT DISTINCT p.*
  FROM public.posts p
  LEFT JOIN public.post_hashtags ph ON ph.post_id = p.id
  LEFT JOIN public.hashtags h ON h.id = ph.hashtag_id
  WHERE p.visibility = 'public'
    AND (p.caption ILIKE '%' || query || '%' OR h.tag ILIKE query)
  ORDER BY p.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.search_posts(TEXT, INT) TO anon, authenticated;


-- ─── 21. PUBLIC PROFILES VIEW ──────────────────────────────────
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id, username, name, display_name, bio,
  avatar, avatar_url, website, location,
  camera_gear, photography_style, role, points,
  followers_count, following_count,
  posts_count, competitions_won, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS & POLICIES
-- ═══════════════════════════════════════════════════════════════════


-- ─── 22. STORAGE BUCKETS ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('post-media', 'post-media', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('post-originals', 'post-originals', false)
  ON CONFLICT (id) DO NOTHING;

-- Avatars: public read, owner-only write
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_write" ON storage.objects;
CREATE POLICY "avatars_owner_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Post media: public read, owner-only write
DROP POLICY IF EXISTS "post_media_public_read" ON storage.objects;
CREATE POLICY "post_media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post_media_owner_write" ON storage.objects;
CREATE POLICY "post_media_owner_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "post_media_owner_delete" ON storage.objects;
CREATE POLICY "post_media_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Post originals: PRIVATE — owner-only read AND write
DROP POLICY IF EXISTS "post_originals_owner_read" ON storage.objects;
CREATE POLICY "post_originals_owner_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'post-originals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "post_originals_owner_write" ON storage.objects;
CREATE POLICY "post_originals_owner_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-originals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ═══════════════════════════════════════════════════════════════════
-- BACKFILL EXISTING DATA
-- ═══════════════════════════════════════════════════════════════════


-- ─── 23. BACKFILL ──────────────────────────────────────────────
-- Populate display_name from name where not set
UPDATE public.profiles
SET display_name = name
WHERE display_name IS NULL AND name IS NOT NULL;

-- Sync followers_count from actual follows table
UPDATE public.profiles p SET followers_count = sub.cnt
FROM (
  SELECT following_id AS uid, COUNT(*) AS cnt
  FROM public.follows GROUP BY following_id
) sub
WHERE p.id = sub.uid AND p.followers_count <> sub.cnt;

-- Sync following_count from actual follows table
UPDATE public.profiles p SET following_count = sub.cnt
FROM (
  SELECT follower_id AS uid, COUNT(*) AS cnt
  FROM public.follows GROUP BY follower_id
) sub
WHERE p.id = sub.uid AND p.following_count <> sub.cnt;
