-- ============================================
-- Remove username column from profiles table
-- Username is not used for authentication (users sign in with email only)
-- ============================================

-- Drop username column from profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS username;

COMMENT ON TABLE profiles IS 'User profiles linked to auth.users with tenant association - authentication via email only';
