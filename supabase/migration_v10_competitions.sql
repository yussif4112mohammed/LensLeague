-- LensLeague competitions: every published portfolio item is queued automatically.
-- The database owns pairing, one-vote-per-person enforcement, and score awards.
-- This is compatible with the original LensLeague `photos` schema as well.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the gallery schema when upgrading an older installation that only has
-- public.photos. Existing rows are copied below; none are removed.
CREATE TABLE IF NOT EXISTS public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Portfolio',
  privacy_level TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  caption TEXT,
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  exif_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make one public Portfolio album per existing photographer, then copy legacy
-- photos once. ON CONFLICT / NOT EXISTS makes this safe to re-run.
INSERT INTO public.albums (photographer_id, title, privacy_level)
SELECT DISTINCT photos.owner_id, 'Portfolio', 'public'
FROM public.photos AS photos
WHERE NOT EXISTS (
  SELECT 1 FROM public.albums AS albums
  WHERE albums.photographer_id = photos.owner_id
    AND albums.title = 'Portfolio'
    AND albums.privacy_level = 'public'
);

INSERT INTO public.portfolio_items (id, album_id, photographer_id, media_url, caption, categories, created_at)
SELECT photos.id, albums.id, photos.owner_id, photos.url, photos.caption,
  ARRAY[COALESCE(photos.category, 'General')], photos.created_at
FROM public.photos AS photos
JOIN public.albums AS albums
  ON albums.photographer_id = photos.owner_id
 AND albums.title = 'Portfolio'
 AND albums.privacy_level = 'public'
WHERE NOT EXISTS (
  SELECT 1 FROM public.portfolio_items AS items WHERE items.id = photos.id
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wins INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS custom_style TEXT,
  ADD COLUMN IF NOT EXISTS exif_data JSONB;

CREATE TABLE IF NOT EXISTS public.photo_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_a_id UUID NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  photo_b_id UUID REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'General',
  votes_a INTEGER NOT NULL DEFAULT 0,
  votes_b INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'active', 'finalized')),
  closes_at TIMESTAMPTZ,
  winner_id UUID REFERENCES public.portfolio_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS photo_battles_open_a_idx
  ON public.photo_battles(photo_a_id) WHERE status IN ('queued', 'active');
CREATE UNIQUE INDEX IF NOT EXISTS photo_battles_open_b_idx
  ON public.photo_battles(photo_b_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.photo_battle_votes (
  battle_id UUID NOT NULL REFERENCES public.photo_battles(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_photo_id UUID NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (battle_id, voter_id)
);

ALTER TABLE public.photo_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_battle_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view battles" ON public.photo_battles;
DROP POLICY IF EXISTS "Public can view battle votes" ON public.photo_battle_votes;
CREATE POLICY "Public can view battles" ON public.photo_battles FOR SELECT USING (true);
CREATE POLICY "Public can view battle votes" ON public.photo_battle_votes FOR SELECT USING (true);

-- Called after upload.  It pairs work only within the same top-level category,
-- and leaves an item queued until a fair opponent arrives.
CREATE OR REPLACE FUNCTION public.queue_portfolio_item_for_battle(p_item_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item_category TEXT;
  queued_battle public.photo_battles;
  battle_id UUID;
BEGIN
  SELECT COALESCE(categories[1], 'General') INTO item_category
  FROM portfolio_items WHERE id = p_item_id;
  IF item_category IS NULL THEN RAISE EXCEPTION 'Portfolio item not found'; END IF;

  SELECT * INTO queued_battle FROM photo_battles
  WHERE status = 'queued' AND category = item_category AND photo_a_id <> p_item_id
  ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    UPDATE photo_battles SET photo_b_id = p_item_id, status = 'active',
      closes_at = NOW() + INTERVAL '24 hours'
    WHERE id = queued_battle.id RETURNING id INTO battle_id;
  ELSE
    INSERT INTO photo_battles(photo_a_id, category) VALUES (p_item_id, item_category)
    RETURNING id INTO battle_id;
  END IF;
  RETURN battle_id;
END;
$$;

-- A battle closes after ten votes. The winner receives one win and ten points.
CREATE OR REPLACE FUNCTION public.cast_photo_battle_vote(p_battle_id UUID, p_selected_photo_id UUID)
RETURNS TABLE (votes_a INTEGER, votes_b INTEGER, status TEXT, winner_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE battle public.photo_battles;
DECLARE winning_photo UUID;
DECLARE winning_owner UUID;
BEGIN
  SELECT * INTO battle FROM photo_battles WHERE id = p_battle_id FOR UPDATE;
  IF NOT FOUND OR battle.status <> 'active' THEN RAISE EXCEPTION 'This battle is not active'; END IF;
  IF p_selected_photo_id NOT IN (battle.photo_a_id, battle.photo_b_id) THEN RAISE EXCEPTION 'Invalid selection'; END IF;
  IF EXISTS (SELECT 1 FROM portfolio_items WHERE id IN (battle.photo_a_id, battle.photo_b_id) AND photographer_id = auth.uid()) THEN
    RAISE EXCEPTION 'You cannot vote in your own battle';
  END IF;
  INSERT INTO photo_battle_votes(battle_id, voter_id, selected_photo_id)
  VALUES (p_battle_id, auth.uid(), p_selected_photo_id);
  UPDATE photo_battles SET votes_a = votes_a + CASE WHEN p_selected_photo_id = battle.photo_a_id THEN 1 ELSE 0 END,
    votes_b = votes_b + CASE WHEN p_selected_photo_id = battle.photo_b_id THEN 1 ELSE 0 END
  WHERE id = p_battle_id RETURNING * INTO battle;
  IF battle.votes_a + battle.votes_b >= 10 THEN
    winning_photo := CASE WHEN battle.votes_a >= battle.votes_b THEN battle.photo_a_id ELSE battle.photo_b_id END;
    SELECT photographer_id INTO winning_owner FROM portfolio_items WHERE id = winning_photo;
    UPDATE photo_battles SET status = 'finalized', winner_id = winning_photo, finalized_at = NOW() WHERE id = p_battle_id;
    UPDATE profiles SET wins = wins + 1, points = points + 10 WHERE id = winning_owner;
    battle.status := 'finalized'; battle.winner_id := winning_photo;
  END IF;
  RETURN QUERY SELECT battle.votes_a, battle.votes_b, battle.status, battle.winner_id;
END;
$$;
