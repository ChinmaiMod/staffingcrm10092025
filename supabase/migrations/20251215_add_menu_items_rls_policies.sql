-- ============================================
-- FIX: Add missing RLS policies for menu_items table
-- Issue: CEO users could not create/update/delete menu items
-- because only SELECT policy existed
-- Date: 2025-12-15
-- ============================================

-- Add INSERT policy for users with can_manage_roles permission
CREATE POLICY "menu_items_insert" ON menu_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_role(auth.uid()) ur
      JOIN user_roles role ON role.role_id = ur.role_id
      WHERE role.can_manage_roles = true
    )
  );

-- Add UPDATE policy for users with can_manage_roles permission  
CREATE POLICY "menu_items_update" ON menu_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_role(auth.uid()) ur
      JOIN user_roles role ON role.role_id = ur.role_id
      WHERE role.can_manage_roles = true
    )
  );

-- Add DELETE policy for users with can_manage_roles permission
-- Note: The code already checks for is_system_item before deleting
CREATE POLICY "menu_items_delete" ON menu_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_role(auth.uid()) ur
      JOIN user_roles role ON role.role_id = ur.role_id
      WHERE role.can_manage_roles = true
    )
  );
