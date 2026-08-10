-- Migration to add settings and deactivation fields to the profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifs BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifs BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN DEFAULT false;
