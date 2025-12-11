-- Allow users with can_manage_roles permission to view all profiles in their tenant
-- This is needed for the Assign User Roles page to work properly

-- Create a helper function to check if user can manage roles
CREATE OR REPLACE FUNCTION public.can_user_manage_roles()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.role_id
    WHERE ura.user_id = auth.uid()
      AND ur.can_manage_roles = true
      AND (ura.valid_until IS NULL OR ura.valid_until > now())
  )
$$;

-- Create a helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- Drop the restrictive select policy
DROP POLICY IF EXISTS profiles_select_own ON profiles;

-- Create new policy that allows users to see:
-- 1. Their own profile (always)
-- 2. All profiles in their tenant if they can manage roles
CREATE POLICY profiles_select_tenant_aware ON profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR (
      can_user_manage_roles()
      AND tenant_id = get_user_tenant_id()
    )
  );

-- Add comment
COMMENT ON FUNCTION public.can_user_manage_roles() IS 'Check if current user has can_manage_roles permission';
COMMENT ON FUNCTION public.get_user_tenant_id() IS 'Get the tenant_id of the current authenticated user';
