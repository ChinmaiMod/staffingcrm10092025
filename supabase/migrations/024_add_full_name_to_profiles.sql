-- Migration: Add full_name column to profiles table
-- This allows users to have their full name stored and displayed

-- Add full_name column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name text;

-- Create index for faster lookups by name
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

-- Update the specific user
UPDATE profiles 
SET full_name = 'Pavan Pusarla'
WHERE email = 'pavan@intuites.com';

-- Add comment
COMMENT ON COLUMN profiles.full_name IS 'User''s full name for display throughout the application';
