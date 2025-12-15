-- ============================================
-- FIX: Add missing UPDATE RLS policies for role access tables
-- For completeness and future-proofing
-- Current code uses DELETE+INSERT pattern but UPDATE may be needed later
-- Date: 2025-12-15
-- ============================================

-- Add UPDATE policy for role_business_access
CREATE POLICY "role_business_access_update" ON role_business_access
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_role(auth.uid()) ur
      JOIN user_roles role ON role.role_id = ur.role_id
      WHERE role.can_assign_roles = true
    )
  );

-- Add UPDATE policy for role_contact_type_access
CREATE POLICY "role_contact_type_access_update" ON role_contact_type_access
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_role(auth.uid()) ur
      JOIN user_roles role ON role.role_id = ur.role_id
      WHERE role.can_assign_roles = true
    )
  );

-- Add UPDATE policy for role_pipeline_access
CREATE POLICY "role_pipeline_access_update" ON role_pipeline_access
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_role(auth.uid()) ur
      JOIN user_roles role ON role.role_id = ur.role_id
      WHERE role.can_assign_roles = true
    )
  );
