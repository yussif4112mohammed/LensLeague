-- =================================================================================
-- LENSLEAGUE MIGRATION V8: MARKETPLACE FIELDS
-- Adds missing marketplace data fields to profiles to support hiring/booking
-- =================================================================================

-- 1. Add marketplace fields to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS starting_rate INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'Available for booking',
ADD COLUMN IF NOT EXISTS service_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb;

-- 2. Update existing profiles with sensible defaults based on their role
UPDATE public.profiles
SET 
  starting_rate = CASE WHEN role = 'photographer' THEN 150 ELSE 0 END,
  service_categories = CASE WHEN role = 'photographer' THEN ARRAY['Portrait', 'Lifestyle'] ELSE '{}' END
WHERE starting_rate = 0 AND role = 'photographer';
