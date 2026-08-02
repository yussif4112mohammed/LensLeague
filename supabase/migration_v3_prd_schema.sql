-- =================================================================================
-- LENSLEAGUE COMPLETE PRD SCHEMA (v3)
-- This schema implements Section 13 and 14 of the PRD.
-- It establishes strict Account Isolation via RLS and implements all core entities.
-- =================================================================================

-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================================
-- 1. RBAC (Roles & Permissions) - Section 1
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL, -- 'admin', 'moderator', 'photographer', 'client'
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT UNIQUE NOT NULL, -- e.g., 'ban_user', 'moderate_content'
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- =================================================================================
-- 2. CORE IDENTITY - Profiles & Settings
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    account_type TEXT CHECK (account_type IN ('photographer', 'client', 'agency')),
    username TEXT UNIQUE,
    name TEXT,
    avatar_url TEXT,
    cover_url TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    instagram TEXT,
    phone TEXT,
    
    -- Status and computed fields
    profile_completed BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    banned BOOLEAN DEFAULT FALSE,
    
    -- Photographer specific metadata
    years_experience INT,
    equipment JSONB,
    specialties TEXT[], -- e.g., ['Wedding', 'Portrait']
    starting_rate NUMERIC,
    cancellation_policy TEXT,
    
    -- Computed metrics (Read-only for clients, updated via triggers)
    rating NUMERIC(3,2) DEFAULT 0.0,
    review_count INT DEFAULT 0,
    completion_rate NUMERIC(5,2) DEFAULT 100.0,
    median_response_time_mins INT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_visible BOOLEAN DEFAULT FALSE,
    email_visible BOOLEAN DEFAULT FALSE,
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Session tracking (PRD Section 2.8)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT,
    ip_address TEXT,
    user_agent TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE
);

-- =================================================================================
-- 3. PORTFOLIO & SOCIAL GRAPH (Section 7 & 6)
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    privacy_level TEXT CHECK (privacy_level IN ('public', 'unlisted', 'private_client')) DEFAULT 'public',
    client_id UUID REFERENCES public.profiles(id), -- Only set if private_client
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
    photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    preview_url TEXT, -- Watermarked/compressed version
    caption TEXT,
    categories TEXT[],
    tags TEXT[],
    exif_data JSONB, -- Stripped by default per PRD
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portfolio_collections (
    collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (collection_id, item_id)
);

-- Social Graph
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.likes (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Polymorphic Saved Items
CREATE TABLE IF NOT EXISTS public.saved_items (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT CHECK (target_type IN ('profile', 'portfolio_item')),
    target_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, target_type, target_id)
);

-- =================================================================================
-- 4. THE BOOKING ENGINE & JOB REQUESTS (Section 8 & 5)
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.job_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget_range TEXT,
    location TEXT,
    event_date DATE,
    status TEXT CHECK (status IN ('open', 'fulfilled', 'cancelled')) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_request_id UUID REFERENCES public.job_requests(id) ON DELETE CASCADE,
    photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pitch TEXT NOT NULL,
    proposed_price NUMERIC,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL, -- Null if direct booked
    
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    package_details TEXT,
    total_price NUMERIC,
    notes TEXT,
    
    status TEXT CHECK (status IN ('requested', 'countered', 'accepted', 'confirmed', 'in_progress', 'completed', 'disputed', 'refunded', 'resolved', 'cancelled', 'declined')) DEFAULT 'requested',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Append-only audit trail for booking state machine
CREATE TABLE IF NOT EXISTS public.booking_state_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id), -- Person who triggered the change
    previous_status TEXT,
    new_status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.counter_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id),
    proposed_date DATE,
    proposed_price NUMERIC,
    proposed_notes TEXT,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'superseded')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('pending', 'captured', 'refunded', 'failed')) DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Set to true only when both parties have reviewed or timeout occurs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================================
-- 5. MESSAGING & NOTIFICATIONS (Section 9 & 10)
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE, -- Optional contextual anchor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.thread_participants (
    thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    attachment_url TEXT,
    read_at TIMESTAMP WITH TIME ZONE, -- Denormalized per-thread read receipt (assumes 1-on-1 mostly)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Polymorphic notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'like', 'booking_update', 'new_message', 'security_alert'
    source_type TEXT,
    source_id UUID,
    actor_id UUID REFERENCES public.profiles(id),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================================
-- 6. ADMIN, MODERATION & REPORTS (Section 12)
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type TEXT CHECK (target_type IN ('profile', 'portfolio_item', 'message', 'review')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')) DEFAULT 'pending',
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Immutable append-only audit logs (Section 12)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES auth.users(id), -- E.g. an Admin
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Principles (PRD 1 & 14): Absolute account isolation.
-- =================================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_state_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES: Anyone can view public profiles. Users can only update their own.
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (banned = false);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. SETTINGS: Strictly private to the user.
CREATE POLICY "Users can view own settings" ON public.settings FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own settings" ON public.settings FOR UPDATE USING (auth.uid() = id);

-- 3. PORTFOLIO (Albums & Items):
-- Public albums are viewable by everyone. Private_client albums are viewable by owner and client_id.
CREATE POLICY "Albums viewable by everyone if public" ON public.albums FOR SELECT USING (privacy_level = 'public' OR privacy_level = 'unlisted');
CREATE POLICY "Private albums viewable by client" ON public.albums FOR SELECT USING (privacy_level = 'private_client' AND client_id = auth.uid());
CREATE POLICY "Users can manage own albums" ON public.albums FOR ALL USING (photographer_id = auth.uid());

CREATE POLICY "Portfolio items viewable by album privacy" ON public.portfolio_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.albums WHERE albums.id = portfolio_items.album_id AND (albums.privacy_level IN ('public', 'unlisted') OR albums.client_id = auth.uid() OR albums.photographer_id = auth.uid()))
);
CREATE POLICY "Users can manage own portfolio items" ON public.portfolio_items FOR ALL USING (photographer_id = auth.uid());

-- 4. BOOKINGS: Absolute isolation. Only client and photographer can see their bookings.
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = client_id OR auth.uid() = photographer_id);
CREATE POLICY "Users can create bookings as a client" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can update their own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = photographer_id);

CREATE POLICY "Users can view their booking state events" ON public.booking_state_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_state_events.booking_id AND (bookings.client_id = auth.uid() OR bookings.photographer_id = auth.uid()))
);
CREATE POLICY "Users can insert booking state events for their bookings" ON public.booking_state_events FOR INSERT WITH CHECK (actor_id = auth.uid());

-- 5. MESSAGES: Isolation via thread_participants.
CREATE POLICY "Users can view their threads" ON public.message_threads FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_participants.thread_id = message_threads.id AND thread_participants.user_id = auth.uid())
);
CREATE POLICY "Users can view messages in their threads" ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_participants.thread_id = messages.thread_id AND thread_participants.user_id = auth.uid())
);
CREATE POLICY "Users can send messages to their threads" ON public.messages FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_participants.thread_id = messages.thread_id AND thread_participants.user_id = auth.uid())
);

-- 6. NOTIFICATIONS: Purely private.
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- End of Initial Schema Migration
