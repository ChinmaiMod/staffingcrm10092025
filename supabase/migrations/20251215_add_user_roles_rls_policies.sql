-- ============================================
-- FIX: Add missing RLS policies for user_roles table
-- Issue: CEO users could not update/insert/delete roles
-- because only SELECT policy existed
-- Date: 2025-12-15
-- ============================================

-- Add INSERT policy for users with can_manage_roles permission
CREATE POLICY "user_roles_insert" ON user_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_role(auth.uid()) ur
      JOIN user_roles role ON role.role_id = ur.role_id
      WHERE role.can_manage_roles = true
    )
  );

-- Add UPDATE policy for users with can_manage_roles permission  
CREATE POLICY "user_roles_update" ON user_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_role(auth.uid()) ur
      JOIN user_roles role ON role.role_id = ur.role_id
      WHERE role.can_manage_roles = true
    )
  );

-- Add DELETE policy for users with can_manage_roles permission
-- Only allow deletion of non-system roles
CREATE POLICY "user_roles_delete" ON user_roles
  FOR DELETE
  USING (
    is_system_role = false AND
    EXISTS (
      SELECT 1 FROM get_user_role(auth.uid()) ur
      JOIN user_roles role ON role.role_id = ur.role_id
      WHERE role.can_manage_roles = true
    )
  );
