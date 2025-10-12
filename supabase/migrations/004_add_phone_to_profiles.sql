-- ============================================
-- Add phone_number column to profiles table
-- ============================================

-- Add phone_number column to profiles
ALTER TABLE profiles 
ADD COLUMN phone_number TEXT;

-- Add comment
COMMENT ON COLUMN profiles.phone_number IS 'User contact phone number';

-- Create index for phone number searches (optional but useful for lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number) WHERE phone_number IS NOT NULL;
