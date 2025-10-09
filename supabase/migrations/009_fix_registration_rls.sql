-- ============================================
-- Fix RLS Policies for User Registration
-- Allow new users to create their tenant and profile
-- ============================================

-- ============================================
-- TENANTS: Allow INSERT for new registrations
-- ============================================

-- Allow authenticated users to insert a tenant if they're the owner
CREATE POLICY "tenants_insert_own" ON tenants
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- ============================================
-- PROFILES: Allow INSERT for new registrations
-- ============================================

-- Allow users to insert their own profile during registration
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- NOTE: These policies work alongside existing policies
-- Users can now:
-- 1. Create their own tenant during registration
-- 2. Create their own profile during registration
-- 3. View and update their data (from existing policies)
-- ============================================
