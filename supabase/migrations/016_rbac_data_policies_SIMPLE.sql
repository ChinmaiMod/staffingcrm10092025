-- ============================================
-- ROLE-BASED ACCESS CONTROL (RBAC) - SIMPLIFIED DATA POLICIES
-- Updates RLS policies for contacts, pipelines, businesses to enforce role-based permissions
-- Simplified version due to mixed schema (bigint users vs uuid profiles)
-- Fine-grained permissions will be enforced at application layer
-- Run this AFTER 015_rbac_system_FIXED.sql
-- ============================================

-- ============================================
-- CONTACTS POLICIES (SIMPLIFIED)
-- ============================================

DROP POLICY IF EXISTS "contacts_select_tenant" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_member" ON contacts;
DROP POLICY IF EXISTS "contacts_update_owner_or_admin" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_owner_or_admin" ON contacts;
DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their tenant" ON contacts;

-- SELECT: Anyone with an active role can view contacts
CREATE POLICY "contacts_select_rbac" ON contacts
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      WHERE p.id = auth.uid()
    )
  );

-- INSERT: Users with can_create_records permission
CREATE POLICY "contacts_insert_rbac" ON contacts
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND ur.can_create_records = true
    )
  );

-- UPDATE: Users with edit permissions
CREATE POLICY "contacts_update_rbac" ON contacts
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND (ur.can_edit_own_records OR ur.can_edit_subordinate_records OR ur.can_edit_all_records)
    )
  );

-- DELETE: Users with delete permissions
CREATE POLICY "contacts_delete_rbac" ON contacts
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND (ur.can_delete_own_records OR ur.can_delete_subordinate_records OR ur.can_delete_all_records)
    )
  );

-- ============================================
-- PIPELINES POLICIES
-- ============================================

DROP POLICY IF EXISTS "pipelines_select_tenant" ON pipelines;
DROP POLICY IF EXISTS "pipelines_insert_admin" ON pipelines;
DROP POLICY IF EXISTS "pipelines_update_admin" ON pipelines;
DROP POLICY IF EXISTS "pipelines_delete_admin" ON pipelines;
DROP POLICY IF EXISTS "Tenant members can view pipelines" ON pipelines;
DROP POLICY IF EXISTS "Admins can insert pipelines" ON pipelines;
DROP POLICY IF EXISTS "Admins can update pipelines" ON pipelines;
DROP POLICY IF EXISTS "Admins can delete pipelines" ON pipelines;

-- SELECT: Anyone with a role can view pipelines
CREATE POLICY "pipelines_select_rbac" ON pipelines
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      WHERE p.id = auth.uid()
    )
  );

-- INSERT: Managers (level 4) and above
CREATE POLICY "pipelines_insert_rbac" ON pipelines
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND ur.role_level >= 4
    )
  );

-- UPDATE: Managers (level 4) and above
CREATE POLICY "pipelines_update_rbac" ON pipelines
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND ur.role_level >= 4
    )
  );

-- DELETE: CEO only (level 5)
CREATE POLICY "pipelines_delete_rbac" ON pipelines
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND ur.role_level = 5
    )
  );

-- ============================================
-- PIPELINE STAGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Admins can insert pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Admins can update pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Admins can delete pipeline stages" ON pipeline_stages;

CREATE POLICY "pipeline_stages_select_rbac" ON pipeline_stages
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM pipelines p WHERE p.pipeline_id = pipeline_stages.pipeline_id)
  );

CREATE POLICY "pipeline_stages_insert_rbac" ON pipeline_stages
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid() AND ur.role_level >= 4
    )
  );

CREATE POLICY "pipeline_stages_update_rbac" ON pipeline_stages
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid() AND ur.role_level >= 4
    )
  );

CREATE POLICY "pipeline_stages_delete_rbac" ON pipeline_stages
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid() AND ur.role_level >= 4
    )
  );

-- ============================================
-- CONTACT PIPELINE ASSIGNMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view contact pipeline assignments" ON contact_pipeline_assignments;
DROP POLICY IF EXISTS "Tenant members can insert contact pipeline assignments" ON contact_pipeline_assignments;
DROP POLICY IF EXISTS "Tenant members can update contact pipeline assignments" ON contact_pipeline_assignments;
DROP POLICY IF EXISTS "Admins can delete contact pipeline assignments" ON contact_pipeline_assignments;

-- Inherit from contacts visibility
CREATE POLICY "contact_pipeline_select_rbac" ON contact_pipeline_assignments
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_pipeline_assignments.contact_id)
  );

CREATE POLICY "contact_pipeline_insert_rbac" ON contact_pipeline_assignments
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_pipeline_assignments.contact_id)
  );

CREATE POLICY "contact_pipeline_update_rbac" ON contact_pipeline_assignments
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_pipeline_assignments.contact_id)
  );

CREATE POLICY "contact_pipeline_delete_rbac" ON contact_pipeline_assignments
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_pipeline_assignments.contact_id)
  );

-- ============================================
-- PIPELINE STAGE HISTORY POLICIES
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view pipeline stage history" ON pipeline_stage_history;
DROP POLICY IF EXISTS "Tenant members can insert pipeline stage history" ON pipeline_stage_history;

CREATE POLICY "pipeline_stage_history_select_rbac" ON pipeline_stage_history
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM contact_pipeline_assignments cpa WHERE cpa.assignment_id = pipeline_stage_history.assignment_id)
  );

CREATE POLICY "pipeline_stage_history_insert_rbac" ON pipeline_stage_history
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM contact_pipeline_assignments cpa WHERE cpa.assignment_id = pipeline_stage_history.assignment_id)
  );

-- ============================================
-- BUSINESSES POLICIES
-- ============================================

DROP POLICY IF EXISTS "businesses_select_tenant" ON businesses;
DROP POLICY IF EXISTS "businesses_insert_admin" ON businesses;
DROP POLICY IF EXISTS "businesses_update_admin" ON businesses;
DROP POLICY IF EXISTS "businesses_delete_admin" ON businesses;
DROP POLICY IF EXISTS "Users can view businesses in their tenant" ON businesses;
DROP POLICY IF EXISTS "Admins can insert businesses" ON businesses;
DROP POLICY IF EXISTS "Admins can update businesses" ON businesses;
DROP POLICY IF EXISTS "Admins can delete businesses" ON businesses;

-- SELECT: Anyone with a role
CREATE POLICY "businesses_select_rbac" ON businesses
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      WHERE p.id = auth.uid()
    )
  );

-- INSERT: Users with can_manage_businesses
CREATE POLICY "businesses_insert_rbac" ON businesses
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND ur.can_manage_businesses = true
    )
  );

-- UPDATE: Users with can_manage_businesses
CREATE POLICY "businesses_update_rbac" ON businesses
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND ur.can_manage_businesses = true
    )
  );

-- DELETE: CEO only (level 5)
CREATE POLICY "businesses_delete_rbac" ON businesses
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND ur.role_level = 5
    )
  );

-- ============================================
-- CONTACT STATUS HISTORY POLICIES
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view contact status history" ON contact_status_history;
DROP POLICY IF EXISTS "Tenant members can insert contact status history" ON contact_status_history;

-- Inherit from contacts
CREATE POLICY "contact_status_history_select_rbac" ON contact_status_history
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_status_history.contact_id)
  );

CREATE POLICY "contact_status_history_insert_rbac" ON contact_status_history
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (SELECT 1 FROM contacts c WHERE c.id = contact_status_history.contact_id)
  );

-- ============================================
-- HELPER VIEW FOR EASIER QUERYING
-- ============================================

CREATE OR REPLACE VIEW user_permissions AS
SELECT 
  p.id as user_id,
  p.tenant_id,
  ur.role_id,
  ur.role_code,
  ur.role_name,
  ur.role_level,
  ur.can_create_records,
  ur.can_edit_own_records,
  ur.can_edit_subordinate_records,
  ur.can_edit_all_records,
  ur.can_delete_own_records,
  ur.can_delete_subordinate_records,
  ur.can_delete_all_records,
  ur.can_view_own_records,
  ur.can_view_subordinate_records,
  ur.can_view_all_records,
  ur.can_assign_roles,
  ur.can_manage_users,
  ur.can_manage_businesses,
  ur.can_manage_roles
FROM profiles p
JOIN user_role_assignments ura ON ura.user_id = p.id
JOIN user_roles ur ON ur.role_id = ura.role_id
WHERE ura.is_active = true
  AND (ura.valid_until IS NULL OR ura.valid_until > now());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "contacts_select_rbac" ON contacts IS 'RBAC: Any user with an active role can view contacts. Fine-grained filtering done at app layer due to schema limitations.';
COMMENT ON POLICY "contacts_insert_rbac" ON contacts IS 'RBAC: Users with can_create_records permission can insert contacts';
COMMENT ON POLICY "contacts_update_rbac" ON contacts IS 'RBAC: Users with any edit permission can update contacts. Ownership checks done at app layer.';
COMMENT ON POLICY "contacts_delete_rbac" ON contacts IS 'RBAC: Users with any delete permission can delete contacts. Ownership checks done at app layer.';

COMMENT ON VIEW user_permissions IS 'Convenient view of user permissions combining profile, role assignment, and role details';

-- ============================================
-- NOTE: Schema Limitation
-- ============================================
-- Due to mixed schema (contacts.created_by = bigint referencing old users table,
-- vs profiles.id = uuid referencing auth.users), fine-grained ownership-based
-- permissions (own vs subordinate vs all) cannot be enforced at RLS level.
-- These checks must be performed at the application layer using the role
-- permission flags and user hierarchy.
-- ============================================
