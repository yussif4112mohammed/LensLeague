-- =================================================================================
-- PHASE 4: SEARCH SYSTEM & FEED RPCs
-- =================================================================================

-- 1. search_users
-- Full-text/ILIKE search across profiles, heavily weighting rating/reviews for relevance.
CREATE OR REPLACE FUNCTION public.search_users(query text, p_limit int DEFAULT 20)
RETURNS TABLE (
    id UUID,
    name TEXT,
    username TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    account_type TEXT,
    specialties TEXT[],
    rating NUMERIC,
    review_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.name, p.username, p.avatar_url, p.bio, p.location, p.account_type, p.specialties, p.rating, p.review_count
    FROM public.profiles p
    WHERE 
        p.banned = false AND
        (
            p.name ILIKE '%' || query || '%' OR
            p.username ILIKE '%' || query || '%' OR
            p.bio ILIKE '%' || query || '%' OR
            p.location ILIKE '%' || query || '%' OR
            query = ANY(p.specialties)
        )
    ORDER BY p.rating DESC NULLS LAST, p.review_count DESC NULLS LAST
    LIMIT p_limit;
END;
$$;

-- 2. search_posts
-- Full-text/ILIKE search across public portfolio items.
CREATE OR REPLACE FUNCTION public.search_posts(query text, p_limit int DEFAULT 20)
RETURNS TABLE (
    id UUID,
    url TEXT,
    caption TEXT,
    owner_id UUID,
    owner_name TEXT,
    owner_avatar TEXT,
    category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.media_url AS url,
        i.caption,
        i.photographer_id AS owner_id,
        pr.name AS owner_name,
        pr.avatar_url AS owner_avatar,
        i.categories[1] AS category
    FROM public.portfolio_items i
    JOIN public.albums a ON i.album_id = a.id
    JOIN public.profiles pr ON i.photographer_id = pr.id
    WHERE 
        a.privacy_level = 'public' AND
        pr.banned = false AND
        (
            i.caption ILIKE '%' || query || '%' OR
            query = ANY(i.categories) OR
            query = ANY(i.tags)
        )
    ORDER BY i.created_at DESC
    LIMIT p_limit;
END;
$$;
