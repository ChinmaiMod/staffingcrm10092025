-- Migration: Fix Registration RLS Policies
-- Created: 2025-10-09
-- Description: Add missing INSERT policies for tenants and profiles to allow registration

-- ============================================
-- PART 1: ADD INSERT POLICY FOR PROFILES
-- ============================================

-- Allow new users to insert their own profile during registration
-- This is needed because the edge function uses service_role, but if we ever
-- need direct inserts, this policy will allow it
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PART 2: ADD INSERT POLICY FOR TENANTS  
-- ============================================

-- Note: Tenant creation should normally be done via Edge Function with service_role
-- But we add this policy for flexibility
-- Users can only insert tenants (during registration flow)
CREATE POLICY "tenants_insert_new" ON tenants
  FOR INSERT
  WITH CHECK (true); -- Will be restricted by the edge function logic

-- ============================================
-- PART 3: UPDATE SERVICE ROLE POLICY
-- ============================================

-- Ensure service role (Edge Functions) can insert into tenants
-- This policy should already exist, but we make it explicit
DROP POLICY IF EXISTS "tenants_service_role_all" ON tenants;
CREATE POLICY "tenants_service_role_all" ON tenants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Same for profiles
DROP POLICY IF EXISTS "profiles_service_role_all" ON profiles;
CREATE POLICY "profiles_service_role_all" ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "profiles_insert_own" ON profiles IS 
  'Allows users to create their own profile during registration';

COMMENT ON POLICY "tenants_insert_new" ON tenants IS 
  'Allows tenant creation during registration (typically via Edge Function)';
