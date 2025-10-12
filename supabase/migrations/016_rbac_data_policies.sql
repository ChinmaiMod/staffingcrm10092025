-- ============================================
-- ROLE-BASED ACCESS CONTROL (RBAC) - DATA POLICIES
-- Updates RLS policies for contacts, pipelines, etc. to enforce role-based permissions
-- Run this AFTER 015_rbac_system.sql
-- ============================================

-- ============================================
-- DROP EXISTING CONTACT POLICIES
-- ============================================

DROP POLICY IF EXISTS "contacts_select_tenant" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_member" ON contacts;
DROP POLICY IF EXISTS "contacts_update_owner_or_admin" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_owner_or_admin" ON contacts;

-- ============================================
-- NEW ROLE-BASED CONTACT POLICIES
-- ============================================

-- SELECT: Based on role level and data scope
CREATE POLICY "contacts_select_rbac" ON contacts
  FOR SELECT
  USING (
    -- Service role bypass
    auth.jwt()->>'role' = 'service_role' OR
    
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND p.tenant_id = contacts.tenant_id
        AND ura.is_active = true
        AND (
          -- Level 1 (Read Only): View records created by recruiters (assigned users)
          (ur.role_level = 1 AND contacts.created_by IN (
            SELECT created_by FROM contacts -- This will be refined based on actual recruiter assignments
          ))
          OR
          -- Level 2 (Recruiter): View own records only
          (ur.role_level = 2 AND ur.can_view_own_records AND contacts.created_by = p.id)
          OR
          -- Level 3 (Lead): View own + subordinates' records + business/contact type scope
          (ur.role_level = 3 AND (
            (ur.can_view_own_records AND contacts.created_by = p.id) OR
            (ur.can_view_subordinate_records AND contacts.created_by IN (
              SELECT subordinate_id FROM get_all_subordinates(p.id)
            ))
          ) AND (
            -- Check business access
            contacts.business_id IN (SELECT business_id FROM get_user_accessible_businesses(p.id))
          ) AND (
            -- Check contact type access (if specified)
            NOT EXISTS (
              SELECT 1 FROM role_business_access rba
              JOIN role_contact_type_access rcta ON rcta.business_access_id = rba.access_id
              WHERE rba.assignment_id = ura.assignment_id
                AND rba.business_id = contacts.business_id
            ) OR
            contacts.contact_type IN (
              SELECT contact_type FROM get_user_accessible_contact_types(p.id, contacts.business_id)
            )
          ))
          OR
          -- Level 4 (Manager): View own + all subordinates + business/contact type scope
          (ur.role_level = 4 AND (
            (ur.can_view_own_records AND contacts.created_by = p.id) OR
            (ur.can_view_subordinate_records AND contacts.created_by IN (
              SELECT subordinate_id FROM get_all_subordinates(p.id)
            ))
          ) AND (
            contacts.business_id IN (SELECT business_id FROM get_user_accessible_businesses(p.id))
          ) AND (
            NOT EXISTS (
              SELECT 1 FROM role_business_access rba
              JOIN role_contact_type_access rcta ON rcta.business_access_id = rba.access_id
              WHERE rba.assignment_id = ura.assignment_id
                AND rba.business_id = contacts.business_id
            ) OR
            contacts.contact_type IN (
              SELECT contact_type FROM get_user_accessible_contact_types(p.id, contacts.business_id)
            )
          ))
          OR
          -- Level 5 (CEO): View all records
          (ur.role_level = 5 AND ur.can_view_all_records)
          OR
          -- Special record permissions granted by CEO
          EXISTS (
            SELECT 1 FROM record_permissions rp
            WHERE rp.user_id = p.id
              AND rp.record_type = 'CONTACT'
              AND rp.record_id = contacts.contact_id
              AND rp.permission_level IN ('VIEW', 'EDIT', 'DELETE')
              AND (rp.expires_at IS NULL OR rp.expires_at > now())
          )
        )
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
      JOIN user_role_assignments ura ON ura.user_id = p.id
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND p.tenant_id = contacts.tenant_id
        AND ura.is_active = true
        AND ur.can_create_records = true
        AND (
          -- For Lead/Manager, check business access
          (ur.role_level < 3) OR -- Recruiter and below: no business restriction
          (ur.role_level >= 3 AND contacts.business_id IN (
            SELECT business_id FROM get_user_accessible_businesses(p.id)
          )) AND (
            -- Check contact type access
            NOT EXISTS (
              SELECT 1 FROM role_business_access rba
              JOIN role_contact_type_access rcta ON rcta.business_access_id = rba.access_id
              WHERE rba.assignment_id = ura.assignment_id
                AND rba.business_id = contacts.business_id
            ) OR
            contacts.contact_type IN (
              SELECT contact_type FROM get_user_accessible_contact_types(p.id, contacts.business_id)
            )
          )
        )
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
      JOIN user_role_assignments ura ON ura.user_id = p.id
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND p.tenant_id = contacts.tenant_id
        AND ura.is_active = true
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
              AND rp.record_id = contacts.contact_id
              AND rp.permission_level IN ('EDIT', 'DELETE')
              AND (rp.expires_at IS NULL OR rp.expires_at > now())
          )
        )
    )
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role' OR
    
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND p.tenant_id = contacts.tenant_id
        AND ura.is_active = true
        AND (
          (ur.can_edit_own_records AND contacts.created_by = p.id) OR
          (ur.can_edit_subordinate_records AND contacts.created_by IN (
            SELECT subordinate_id FROM get_all_subordinates(p.id)
          )) OR
          (ur.can_edit_all_records) OR
          EXISTS (
            SELECT 1 FROM record_permissions rp
            WHERE rp.user_id = p.id
              AND rp.record_type = 'CONTACT'
              AND rp.record_id = contacts.contact_id
              AND rp.permission_level IN ('EDIT', 'DELETE')
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
      JOIN user_role_assignments ura ON ura.user_id = p.id
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND p.tenant_id = contacts.tenant_id
        AND ura.is_active = true
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
              AND rp.record_id = contacts.contact_id
              AND rp.permission_level = 'DELETE'
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

-- SELECT: Based on role and business access
CREATE POLICY "pipelines_select_rbac" ON pipelines
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND p.tenant_id = pipelines.tenant_id
        AND ura.is_active = true
        AND (
          -- Level 1-2: Can view pipelines in their scope
          (ur.role_level <= 2) OR
          -- Level 3-4: Can view if pipeline is in accessible business and pipeline list
          (ur.role_level IN (3, 4) AND (
            pipelines.business_id IN (SELECT business_id FROM get_user_accessible_businesses(p.id))
          ) AND (
            NOT EXISTS (
              SELECT 1 FROM role_business_access rba
              JOIN role_pipeline_access rpa ON rpa.business_access_id = rba.access_id
              WHERE rba.assignment_id = ura.assignment_id
                AND rba.business_id = pipelines.business_id
            ) OR
            pipelines.pipeline_id IN (
              SELECT pipeline_id FROM get_user_accessible_pipelines(p.id, pipelines.business_id)
            )
          )) OR
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
      JOIN user_role_assignments ura ON ura.user_id = p.id
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND p.tenant_id = pipelines.tenant_id
        AND ura.is_active = true
        AND ur.role_level >= 4 -- Manager or CEO only
        AND (
          ur.role_level = 5 OR -- CEO can create anywhere
          pipelines.business_id IN (SELECT business_id FROM get_user_accessible_businesses(p.id))
        )
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
      JOIN user_role_assignments ura ON ura.user_id = p.id
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND p.tenant_id = pipelines.tenant_id
        AND ura.is_active = true
        AND ur.role_level >= 4
        AND (
          ur.role_level = 5 OR
          pipelines.business_id IN (SELECT business_id FROM get_user_accessible_businesses(p.id))
        )
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
      JOIN user_role_assignments ura ON ura.user_id = p.id
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
        AND p.tenant_id = pipelines.tenant_id
        AND ura.is_active = true
        AND ur.role_level = 5 -- CEO only
    )
  );

-- ============================================
-- UPDATE CONTACT PIPELINE ASSIGNMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "contact_pipeline_select_tenant" ON contact_pipeline_assignments;
DROP POLICY IF EXISTS "contact_pipeline_insert_member" ON contact_pipeline_assignments;
DROP POLICY IF EXISTS "contact_pipeline_update_member" ON contact_pipeline_assignments;
DROP POLICY IF EXISTS "contact_pipeline_delete_admin" ON contact_pipeline_assignments;

-- Same visibility as contacts
CREATE POLICY "contact_pipeline_select_rbac" ON contact_pipeline_assignments
  FOR SELECT
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
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
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
      -- Inherits contact edit permission via contact RLS
    )
  );

CREATE POLICY "contact_pipeline_update_rbac" ON contact_pipeline_assignments
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
    )
  );

CREATE POLICY "contact_pipeline_delete_rbac" ON contact_pipeline_assignments
  FOR DELETE
  USING (
    auth.jwt()->>'role' = 'service_role' OR
    
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
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

COMMENT ON POLICY "contacts_select_rbac" ON contacts IS 'Role-based SELECT: Level 1 sees recruiter records, Level 2 sees own, Level 3-4 see subordinates with business/type scope, Level 5 sees all';
COMMENT ON POLICY "contacts_insert_rbac" ON contacts IS 'Role-based INSERT: Any role with can_create_records, respecting business/contact type scope for Level 3+';
COMMENT ON POLICY "contacts_update_rbac" ON contacts IS 'Role-based UPDATE: Based on ownership, subordinate relationship, or explicit permission';
COMMENT ON POLICY "contacts_delete_rbac" ON contacts IS 'Role-based DELETE: Based on ownership, subordinate relationship, or explicit permission';

COMMENT ON VIEW user_permissions IS 'Convenient view of user permissions combining profile, role assignment, and role details';

-- ============================================
-- END
-- ============================================
