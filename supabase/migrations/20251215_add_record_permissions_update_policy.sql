-- ============================================
-- FIX: Add missing UPDATE policy for record_permissions table
-- For completeness in RBAC system
-- Date: 2025-12-15
-- ============================================

-- Add UPDATE policy for users with role_level >= 4 (Manager/CEO)
CREATE POLICY "record_permissions_update" ON record_permissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_role(auth.uid()) ur
      JOIN user_roles role ON role.role_id = ur.role_id
      WHERE role.role_level >= 4
    )
  );
