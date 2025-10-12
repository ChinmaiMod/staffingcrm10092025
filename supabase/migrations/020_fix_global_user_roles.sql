-- ============================================
-- FIX: Make User Roles GLOBAL (not tenant-specific)
-- CRITICAL ARCHITECTURAL FIX
-- ============================================

-- Problem: user_roles table currently has tenant_id, making roles tenant-specific
-- Solution: Remove tenant_id from user_roles, add it to user_role_assignments
-- This makes role DEFINITIONS global, but role ASSIGNMENTS tenant-specific

-- ============================================
-- STEP 1: Drop dependent objects
-- ============================================

-- Drop RLS policies that reference tenant_id in user_roles
DROP POLICY IF EXISTS "user_roles_select_tenant" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage_ceo" ON user_roles;

-- Drop indexes that reference tenant_id
DROP INDEX IF EXISTS idx_user_roles_tenant;
DROP INDEX IF EXISTS idx_user_roles_level;

-- Drop unique constraints that reference tenant_id
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_tenant_id_role_code_key;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_tenant_id_role_name_key;

-- ============================================
-- STEP 2: Backup existing data
-- ============================================

-- Create temporary backup table
CREATE TABLE IF NOT EXISTS user_roles_backup AS
SELECT * FROM user_roles;

-- ============================================
-- STEP 3: Recreate user_roles as GLOBAL table
-- ============================================

-- Drop and recreate the table
DROP TABLE IF EXISTS user_roles CASCADE;

CREATE TABLE user_roles (
  role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- NO tenant_id - roles are now GLOBAL
  
  role_name text NOT NULL UNIQUE, -- 'CEO', 'Manager', 'Lead', 'Recruiter', 'Read-Only User'
  role_code text NOT NULL UNIQUE, -- 'CEO', 'MANAGER', 'LEAD', 'RECRUITER', 'READ_ONLY'
  role_level integer NOT NULL CHECK (role_level >= 1 AND role_level <= 5), -- 1=Read-Only, 2=Recruiter, 3=Lead, 4=Manager, 5=CEO
  description text,
  
  -- Permission flags (same as before)
  can_create_records boolean DEFAULT false,
  can_edit_own_records boolean DEFAULT false,
  can_edit_subordinate_records boolean DEFAULT false,
  can_edit_all_records boolean DEFAULT false,
  can_delete_own_records boolean DEFAULT false,
  can_delete_subordinate_records boolean DEFAULT false,
  can_delete_all_records boolean DEFAULT false,
  can_view_own_records boolean DEFAULT true,
  can_view_subordinate_records boolean DEFAULT false,
  can_view_all_records boolean DEFAULT false,
  
  -- User management permissions
  can_assign_roles boolean DEFAULT false,
  can_manage_users boolean DEFAULT false,
  can_manage_businesses boolean DEFAULT false,
  can_manage_roles boolean DEFAULT false, -- Only CEO/Super Admin
  
  -- System flags
  is_system_role boolean DEFAULT false, -- System roles cannot be deleted/modified
  is_active boolean DEFAULT true,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- STEP 4: Update user_role_assignments to be tenant-aware
-- ============================================

-- Drop and recreate user_role_assignments with tenant_id
DROP TABLE IF EXISTS user_role_assignments CASCADE;

CREATE TABLE user_role_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES user_roles(role_id) ON DELETE CASCADE NOT NULL,
  
  -- ADD tenant_id - role assignments are tenant-specific
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE NOT NULL,
  
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  
  -- Optional: time-limited role assignments
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  
  -- User can have same role in different tenants, but only one assignment per role per tenant
  UNIQUE(user_id, role_id, tenant_id)
);

-- ============================================
-- STEP 5: Recreate dependent tables
-- ============================================

-- Recreate role_menu_permissions
DROP TABLE IF EXISTS role_menu_permissions CASCADE;

CREATE TABLE role_menu_permissions (
  permission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES user_roles(role_id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(menu_item_id) ON DELETE CASCADE NOT NULL,
  can_access boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, menu_item_id)
);

-- Recreate role_business_access
DROP TABLE IF EXISTS role_business_access CASCADE;

CREATE TABLE role_business_access (
  access_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES user_role_assignments(assignment_id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, business_id)
);

-- Recreate role_contact_type_access
DROP TABLE IF EXISTS role_contact_type_access CASCADE;

CREATE TABLE role_contact_type_access (
  access_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_access_id uuid REFERENCES role_business_access(access_id) ON DELETE CASCADE NOT NULL,
  contact_type text NOT NULL CHECK (contact_type IN ('IT_CANDIDATE','HEALTHCARE_CANDIDATE','VENDOR_CLIENT','VENDOR_EMPANELMENT','EMPLOYEE_INDIA','EMPLOYEE_USA')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_access_id, contact_type)
);

-- Recreate role_pipeline_access
DROP TABLE IF EXISTS role_pipeline_access CASCADE;

CREATE TABLE role_pipeline_access (
  access_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_access_id uuid REFERENCES role_business_access(access_id) ON DELETE CASCADE NOT NULL,
  pipeline_id uuid REFERENCES pipelines(pipeline_id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_access_id, pipeline_id)
);

-- ============================================
-- STEP 6: Create new indexes
-- ============================================

-- user_roles indexes (no tenant_id)
CREATE INDEX idx_user_roles_level ON user_roles(role_level);
CREATE INDEX idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;

-- user_role_assignments indexes (with tenant_id)
CREATE INDEX idx_user_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_tenant ON user_role_assignments(tenant_id);
CREATE INDEX idx_user_role_assignments_role ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_active ON user_role_assignments(user_id, tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_role_assignments_user_tenant ON user_role_assignments(user_id, tenant_id);

-- Other indexes
CREATE INDEX idx_role_menu_permissions_role ON role_menu_permissions(role_id);
CREATE INDEX idx_role_business_access_assignment ON role_business_access(assignment_id);
CREATE INDEX idx_role_business_access_business ON role_business_access(business_id);
CREATE INDEX idx_role_contact_type_access_business ON role_contact_type_access(business_access_id);
CREATE INDEX idx_role_pipeline_access_business ON role_pipeline_access(business_access_id);

-- ============================================
-- STEP 7: Recreate triggers
-- ============================================

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 8: Insert GLOBAL system roles
-- ============================================

INSERT INTO user_roles (role_name, role_code, role_level, description, 
  can_create_records, can_edit_own_records, can_edit_subordinate_records, can_edit_all_records,
  can_delete_own_records, can_delete_subordinate_records, can_delete_all_records,
  can_view_own_records, can_view_subordinate_records, can_view_all_records,
  can_assign_roles, can_manage_users, can_manage_businesses, can_manage_roles, is_system_role)
VALUES
  -- Level 5: CEO
  ('CEO', 'CEO', 5, 'Chief Executive Officer - Full system access within tenant',
   true, true, true, true, true, true, true, true, true, true, true, true, true, true, true),
   
  -- Level 4: Manager
  ('Manager', 'MANAGER', 4, 'Manager - Can manage leads and recruiters within tenant',
   true, true, true, false, true, true, false, true, true, false, true, true, false, false, true),
   
  -- Level 3: Lead
  ('Lead', 'LEAD', 3, 'Lead - Can manage recruiters within tenant',
   true, true, true, false, true, true, false, true, true, false, true, false, false, false, true),
   
  -- Level 2: Recruiter
  ('Recruiter', 'RECRUITER', 2, 'Recruiter - Can manage own records within tenant',
   true, true, false, false, true, false, false, true, false, false, false, false, false, false, true),
   
  -- Level 1: Read Only
  ('Read Only User', 'READ_ONLY', 1, 'Read-only access to selected pages within tenant',
   false, false, false, false, false, false, false, true, false, false, false, false, false, false, true)
ON CONFLICT (role_code) DO NOTHING;

-- ============================================
-- STEP 9: Assign default menu permissions
-- ============================================

-- CEO gets all pages
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  (SELECT role_id FROM user_roles WHERE role_code = 'CEO'),
  menu_item_id,
  true
FROM menu_items
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- Manager gets most pages (except USER_ROLES management)
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  (SELECT role_id FROM user_roles WHERE role_code = 'MANAGER'),
  menu_item_id,
  true
FROM menu_items
WHERE item_code IN ('DASHBOARD', 'CONTACTS', 'PIPELINES', 'DATA_ADMIN', 'ASSIGN_ROLES', 'EMAIL_TEMPLATES', 'BUSINESSES', 'REPORTS', 'SETTINGS')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- Lead gets operational pages
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  (SELECT role_id FROM user_roles WHERE role_code = 'LEAD'),
  menu_item_id,
  true
FROM menu_items
WHERE item_code IN ('DASHBOARD', 'CONTACTS', 'PIPELINES', 'ASSIGN_ROLES', 'REPORTS', 'SETTINGS')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- Recruiter gets core pages
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  (SELECT role_id FROM user_roles WHERE role_code = 'RECRUITER'),
  menu_item_id,
  true
FROM menu_items
WHERE item_code IN ('DASHBOARD', 'CONTACTS', 'PIPELINES', 'REPORTS')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- Read Only gets basic pages
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  (SELECT role_id FROM user_roles WHERE role_code = 'READ_ONLY'),
  menu_item_id,
  true
FROM menu_items
WHERE item_code IN ('DASHBOARD', 'CONTACTS', 'PIPELINES')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- ============================================
-- STEP 10: Enable RLS
-- ============================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_business_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_contact_type_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_pipeline_access ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 11: Recreate RLS policies
-- ============================================

-- Service role bypass
CREATE POLICY "service_role_all_user_roles" ON user_roles FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_role_menu_permissions" ON role_menu_permissions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_user_role_assignments" ON user_role_assignments FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_role_business_access" ON role_business_access FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_role_contact_type_access" ON role_contact_type_access FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_role_pipeline_access" ON role_pipeline_access FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- USER ROLES: System roles are global - all authenticated users can view
CREATE POLICY "user_roles_select_all" ON user_roles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only system can manage global roles (via service_role)
-- Application should not allow regular users to modify role definitions

-- ROLE MENU PERMISSIONS: All users can view (to check their permissions)
CREATE POLICY "role_menu_permissions_select_all" ON role_menu_permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- USER ROLE ASSIGNMENTS: Users can view own, CEOs can view all in tenant, managers can view subordinates
CREATE POLICY "user_role_assignments_select_own" ON user_role_assignments
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_role_assignments ura2
      JOIN user_roles ur ON ur.role_id = ura2.role_id
      WHERE ura2.user_id = auth.uid()
      AND ura2.tenant_id = user_role_assignments.tenant_id
      AND ur.role_level >= 4 -- Manager or CEO
      AND ura2.is_active = true
    )
  );

-- Only CEOs can manage role assignments in their tenant
CREATE POLICY "user_role_assignments_manage_ceo" ON user_role_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura2
      JOIN user_roles ur ON ur.role_id = ura2.role_id
      WHERE ura2.user_id = auth.uid()
      AND ura2.tenant_id = user_role_assignments.tenant_id
      AND ur.role_level = 5 -- CEO only
      AND ura2.is_active = true
    )
  );

-- Business/contact/pipeline access policies
CREATE POLICY "role_business_access_select" ON role_business_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      WHERE ura.assignment_id = role_business_access.assignment_id
      AND ura.user_id = auth.uid()
    )
  );

CREATE POLICY "role_contact_type_access_select" ON role_contact_type_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM role_business_access rba
      JOIN user_role_assignments ura ON ura.assignment_id = rba.assignment_id
      WHERE rba.access_id = role_contact_type_access.business_access_id
      AND ura.user_id = auth.uid()
    )
  );

CREATE POLICY "role_pipeline_access_select" ON role_pipeline_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM role_business_access rba
      JOIN user_role_assignments ura ON ura.assignment_id = rba.assignment_id
      WHERE rba.access_id = role_pipeline_access.business_access_id
      AND ura.user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 12: Update helper functions
-- ============================================

-- Get user's active role IN A SPECIFIC TENANT
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid, p_tenant_id uuid)
RETURNS TABLE (
  role_id uuid,
  role_code text,
  role_level integer,
  role_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.role_id,
    ur.role_code,
    ur.role_level,
    ur.role_name
  FROM user_role_assignments ura
  JOIN user_roles ur ON ur.role_id = ura.role_id
  WHERE ura.user_id = p_user_id
    AND ura.tenant_id = p_tenant_id
    AND ura.is_active = true
    AND ur.is_active = true
    AND (ura.valid_until IS NULL OR ura.valid_until > now())
  ORDER BY ur.role_level DESC
  LIMIT 1; -- Return highest level role if user has multiple
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has permission for a menu item
CREATE OR REPLACE FUNCTION user_can_access_menu(p_user_id uuid, p_tenant_id uuid, p_menu_item_code text)
RETURNS boolean AS $$
DECLARE
  has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN role_menu_permissions rmp ON rmp.role_id = ura.role_id
    JOIN menu_items mi ON mi.menu_item_id = rmp.menu_item_id
    WHERE ura.user_id = p_user_id
      AND ura.tenant_id = p_tenant_id
      AND ura.is_active = true
      AND mi.item_code = p_menu_item_code
      AND rmp.can_access = true
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user can assign a specific role (based on hierarchy) IN A TENANT
CREATE OR REPLACE FUNCTION can_assign_role(
  p_assigner_id uuid,
  p_tenant_id uuid,
  p_target_role_level integer
)
RETURNS boolean AS $$
DECLARE
  assigner_role_level integer;
BEGIN
  -- Get assigner's role level in this tenant
  SELECT role_level INTO assigner_role_level
  FROM get_user_role(p_assigner_id, p_tenant_id);
  
  -- Can only assign roles of lower level than own role
  RETURN (assigner_role_level > p_target_role_level);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get accessible businesses for a user IN A TENANT
CREATE OR REPLACE FUNCTION get_user_accessible_businesses(p_user_id uuid, p_tenant_id uuid)
RETURNS TABLE (business_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT rba.business_id
  FROM user_role_assignments ura
  JOIN role_business_access rba ON rba.assignment_id = ura.assignment_id
  WHERE ura.user_id = p_user_id
    AND ura.tenant_id = p_tenant_id
    AND ura.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get accessible contact types for a user in a business IN A TENANT
CREATE OR REPLACE FUNCTION get_user_accessible_contact_types(
  p_user_id uuid,
  p_tenant_id uuid,
  p_business_id uuid
)
RETURNS TABLE (contact_type text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT rcta.contact_type
  FROM user_role_assignments ura
  JOIN role_business_access rba ON rba.assignment_id = ura.assignment_id
  JOIN role_contact_type_access rcta ON rcta.business_access_id = rba.access_id
  WHERE ura.user_id = p_user_id
    AND ura.tenant_id = p_tenant_id
    AND ura.is_active = true
    AND rba.business_id = p_business_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get accessible pipelines for a user in a business IN A TENANT
CREATE OR REPLACE FUNCTION get_user_accessible_pipelines(
  p_user_id uuid,
  p_tenant_id uuid,
  p_business_id uuid
)
RETURNS TABLE (pipeline_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT rpa.pipeline_id
  FROM user_role_assignments ura
  JOIN role_business_access rba ON rba.assignment_id = ura.assignment_id
  JOIN role_pipeline_access rpa ON rpa.business_access_id = rba.access_id
  WHERE ura.user_id = p_user_id
    AND ura.tenant_id = p_tenant_id
    AND ura.is_active = true
    AND rba.business_id = p_business_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- STEP 13: Update comments
-- ============================================

COMMENT ON TABLE user_roles IS 'GLOBAL role definitions (not tenant-specific). Same roles apply to all tenants.';
COMMENT ON TABLE user_role_assignments IS 'Tenant-specific role assignments. Links users to roles within their tenant.';
COMMENT ON COLUMN user_role_assignments.tenant_id IS 'Tenant context for this role assignment. User can have different roles in different tenants.';

COMMENT ON FUNCTION get_user_role(uuid, uuid) IS 'Returns active role for a user IN A SPECIFIC TENANT (highest level if multiple)';
COMMENT ON FUNCTION user_can_access_menu(uuid, uuid, text) IS 'Checks if user has permission for a menu item IN A SPECIFIC TENANT';
COMMENT ON FUNCTION can_assign_role(uuid, uuid, integer) IS 'Checks if user can assign a role IN A SPECIFIC TENANT based on hierarchy';
COMMENT ON FUNCTION get_user_accessible_businesses(uuid, uuid) IS 'Returns businesses user can access IN A SPECIFIC TENANT';
COMMENT ON FUNCTION get_user_accessible_contact_types(uuid, uuid, uuid) IS 'Returns contact types user can access in a business IN A SPECIFIC TENANT';
COMMENT ON FUNCTION get_user_accessible_pipelines(uuid, uuid, uuid) IS 'Returns pipelines user can access in a business IN A SPECIFIC TENANT';

-- ============================================
-- SUMMARY
-- ============================================

-- This migration transforms the RBAC system from:
--   ❌ Tenant-specific role definitions (each tenant defines "CEO", "Manager", etc.)
-- To:
--   ✅ Global role definitions (system-wide "CEO", "Manager", etc.)
--   ✅ Tenant-specific role assignments (user X is CEO of tenant A)
--
-- Benefits:
--   ✅ Consistent role definitions across all tenants
--   ✅ Easier to maintain and update permissions
--   ✅ Users can have different roles in different tenants
--   ✅ Single source of truth for role definitions
--
-- Breaking Changes:
--   ⚠️ All existing role assignments will be LOST (user_role_assignments recreated)
--   ⚠️ All business/pipeline access assignments will be LOST
--   ⚠️ Need to reassign roles to users after this migration
--
-- Next Steps:
--   1. Run this migration in Supabase
--   2. Update createTenantAndProfile Edge Function to assign CEO role
--   3. Create admin UI to assign roles to users
--   4. Test role-based access control

-- ============================================
-- END
-- ============================================
