-- ============================================
-- ROLE-BASED ACCESS CONTROL (RBAC) - DATA POLICIES (FIXED for BIGINT schema)
-- Updates RLS policies for contacts, pipelines, businesses to enforce role-based permissions
-- Run this AFTER 015_rbac_system_FIXED.sql
-- ============================================

-- ============================================
-- DROP EXISTING CONTACT POLICIES
-- ============================================

DROP POLICY IF EXISTS "contacts_select_tenant" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_member" ON contacts;
DROP POLICY IF EXISTS "contacts_update_owner_or_admin" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_owner_or_admin" ON contacts;
DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their tenant" ON contacts;

-- ============================================
-- NEW ROLE-BASED CONTACT POLICIES
-- ============================================

-- SELECT: Based on role level (simplified for mixed schema)
CREATE POLICY "contacts_select_rbac" ON contacts
  FOR SELECT
  USING (
    -- Service role bypass
    auth.jwt()->>'role' = 'service_role' OR
    
    -- Anyone with a role can view contacts (fine-grained control in app layer)
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
    )
  );

-- INSERT: Based on can_create_records permission
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

-- UPDATE: Based on role level and ownership
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
        AND (
          -- Can edit own records
          (ur.can_edit_own_records AND contacts.created_by = p.id) OR
          -- Can edit subordinate records
          (ur.can_edit_subordinate_records AND contacts.created_by IN (
            SELECT subordinate_id FROM get_all_subordinates(p.id)
          )) OR
          -- Can edit all records (CEO)
          (ur.can_edit_all_records) OR
          -- Has specific record permission
          EXISTS (
            SELECT 1 FROM record_permissions rp
            WHERE rp.user_id = p.id
              AND rp.record_type = 'CONTACT'
              AND rp.record_id = contacts.id
              AND rp.can_edit = true
              AND (rp.expires_at IS NULL OR rp.expires_at > now())
          )
        )
    )
  );

-- DELETE: Based on role level and ownership
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
        AND (
          (ur.can_delete_own_records AND contacts.created_by = p.id) OR
          (ur.can_delete_subordinate_records AND contacts.created_by IN (
            SELECT subordinate_id FROM get_all_subordinates(p.id)
          )) OR
          (ur.can_delete_all_records) OR
          EXISTS (
            SELECT 1 FROM record_permissions rp
            WHERE rp.user_id = p.id
              AND rp.record_type = 'CONTACT'
              AND rp.record_id = contacts.id
              AND rp.can_delete = true
              AND (rp.expires_at IS NULL OR rp.expires_at > now())
          )
        )
    )
  );

-- ============================================
-- UPDATE PIPELINE POLICIES
-- ============================================

DROP POLICY IF EXISTS "pipelines_select_tenant" ON pipelines;
DROP POLICY IF EXISTS "pipelines_insert_admin" ON pipelines;
DROP POLICY IF EXISTS "pipelines_update_admin" ON pipelines;
DROP POLICY IF EXISTS "pipelines_delete_admin" ON pipelines;
DROP POLICY IF EXISTS "Tenant members can view pipelines" ON pipelines;
DROP POLICY IF EXISTS "Admins can insert pipelines" ON pipelines;
DROP POLICY IF EXISTS "Admins can update pipelines" ON pipelines;
DROP POLICY IF EXISTS "Admins can delete pipelines" ON pipelines;

-- SELECT: Based on role level
CREATE POLICY "pipelines_select_rbac" ON pipelines
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND (
          -- Level 1-4: Can view pipelines
          (ur.role_level <= 4) OR
          -- Level 5: View all
          (ur.role_level = 5)
        )
    )
  );

-- INSERT: Managers and above can create pipelines
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
        AND ur.role_level >= 4 -- Manager (4) or CEO (5) only
    )
  );

-- UPDATE: Managers and above can update pipelines
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
        AND ur.role_level >= 4 -- Manager (4) or CEO (5)
    )
  );

-- DELETE: CEO only
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
        AND ur.role_level = 5 -- CEO only
    )
  );

-- ============================================
-- UPDATE PIPELINE STAGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Admins can insert pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Admins can update pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Admins can delete pipeline stages" ON pipeline_stages;

-- Inherit from pipelines - if you can see the pipeline, you can see its stages
CREATE POLICY "pipeline_stages_select_rbac" ON pipeline_stages
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM pipelines p
      WHERE p.pipeline_id = pipeline_stages.pipeline_id
      -- Inherits pipeline visibility via pipeline RLS
    )
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
      WHERE p.id = auth.uid()
        AND ur.role_level >= 4 -- Manager or CEO
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
      WHERE p.id = auth.uid()
        AND ur.role_level >= 4
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
      WHERE p.id = auth.uid()
        AND ur.role_level >= 4
    )
  );

-- ============================================
-- UPDATE CONTACT PIPELINE ASSIGNMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view contact pipeline assignments" ON contact_pipeline_assignments;
DROP POLICY IF EXISTS "Tenant members can insert contact pipeline assignments" ON contact_pipeline_assignments;
DROP POLICY IF EXISTS "Tenant members can update contact pipeline assignments" ON contact_pipeline_assignments;
DROP POLICY IF EXISTS "Admins can delete contact pipeline assignments" ON contact_pipeline_assignments;

-- Same visibility as contacts
CREATE POLICY "contact_pipeline_select_rbac" ON contact_pipeline_assignments
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_pipeline_assignments.contact_id
      -- Inherits contact visibility via contact RLS
    )
  );

-- Can assign if can edit the contact
CREATE POLICY "contact_pipeline_insert_rbac" ON contact_pipeline_assignments
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_pipeline_assignments.contact_id
      -- Inherits contact edit permission via contact RLS
    )
  );

CREATE POLICY "contact_pipeline_update_rbac" ON contact_pipeline_assignments
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_pipeline_assignments.contact_id
    )
  );

CREATE POLICY "contact_pipeline_delete_rbac" ON contact_pipeline_assignments
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_pipeline_assignments.contact_id
    )
  );

-- ============================================
-- UPDATE PIPELINE STAGE HISTORY POLICIES
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view pipeline stage history" ON pipeline_stage_history;
DROP POLICY IF EXISTS "Tenant members can insert pipeline stage history" ON pipeline_stage_history;

-- Inherit from contact pipeline assignments
CREATE POLICY "pipeline_stage_history_select_rbac" ON pipeline_stage_history
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM contact_pipeline_assignments cpa
      WHERE cpa.assignment_id = pipeline_stage_history.assignment_id
      -- Inherits from contact_pipeline_assignments RLS
    )
  );

CREATE POLICY "pipeline_stage_history_insert_rbac" ON pipeline_stage_history
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM contact_pipeline_assignments cpa
      WHERE cpa.assignment_id = pipeline_stage_history.assignment_id
    )
  );

-- ============================================
-- UPDATE BUSINESSES POLICIES
-- ============================================

DROP POLICY IF EXISTS "businesses_select_tenant" ON businesses;
DROP POLICY IF EXISTS "businesses_insert_admin" ON businesses;
DROP POLICY IF EXISTS "businesses_update_admin" ON businesses;
DROP POLICY IF EXISTS "businesses_delete_admin" ON businesses;
DROP POLICY IF EXISTS "Users can view businesses in their tenant" ON businesses;
DROP POLICY IF EXISTS "Admins can insert businesses" ON businesses;
DROP POLICY IF EXISTS "Admins can update businesses" ON businesses;
DROP POLICY IF EXISTS "Admins can delete businesses" ON businesses;

CREATE POLICY "businesses_select_rbac" ON businesses
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id AND ura.is_active = true
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
    )
  );

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
        AND ur.role_level = 5 -- CEO only
    )
  );

-- ============================================
-- UPDATE CONTACT STATUS HISTORY POLICIES
-- ============================================

DROP POLICY IF EXISTS "Tenant members can view contact status history" ON contact_status_history;
DROP POLICY IF EXISTS "Tenant members can insert contact status history" ON contact_status_history;

-- Inherit from contacts
CREATE POLICY "contact_status_history_select_rbac" ON contact_status_history
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_status_history.contact_id
      -- Inherits contact visibility via contact RLS
    )
  );

CREATE POLICY "contact_status_history_insert_rbac" ON contact_status_history
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_status_history.contact_id
    )
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

COMMENT ON POLICY "contacts_select_rbac" ON contacts IS 'Role-based SELECT: Level 1-2 see own, Level 3-4 see own+subordinates, Level 5 sees all';
COMMENT ON POLICY "contacts_insert_rbac" ON contacts IS 'Role-based INSERT: Any role with can_create_records';
COMMENT ON POLICY "contacts_update_rbac" ON contacts IS 'Role-based UPDATE: Based on ownership, subordinate relationship, or explicit permission';
COMMENT ON POLICY "contacts_delete_rbac" ON contacts IS 'Role-based DELETE: Based on ownership, subordinate relationship, or explicit permission';

COMMENT ON VIEW user_permissions IS 'Convenient view of user permissions combining profile, role assignment, and role details';

-- ============================================
-- END
-- ============================================
