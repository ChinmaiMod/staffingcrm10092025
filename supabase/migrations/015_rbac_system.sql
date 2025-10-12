-- ============================================
-- ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM
-- Implements hierarchical user roles with granular permissions
-- Run this AFTER 014_fix_registration_rls.sql
-- ============================================

-- ============================================
-- USER ROLES TABLE
-- Defines role hierarchy and permission levels
-- ============================================

CREATE TABLE IF NOT EXISTS user_roles (
  role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE NOT NULL,
  role_name text NOT NULL,
  role_code text NOT NULL, -- 'CEO', 'MANAGER', 'LEAD', 'RECRUITER', 'READ_ONLY', 'CUSTOM_1', etc.
  role_level integer NOT NULL CHECK (role_level >= 1 AND role_level <= 5), -- 1=Read-Only, 2=Recruiter, 3=Lead, 4=Manager, 5=CEO
  description text,
  
  -- Permission flags
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
  is_system_role boolean DEFAULT false, -- System roles cannot be deleted
  is_active boolean DEFAULT true,
  
  -- Metadata
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, role_code),
  UNIQUE(tenant_id, role_name)
);

-- ============================================
-- MENU ITEMS TABLE
-- Centralized menu/page definitions for permission assignment
-- ============================================

CREATE TABLE IF NOT EXISTS menu_items (
  menu_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text UNIQUE NOT NULL, -- 'DASHBOARD', 'CONTACTS', 'PIPELINES', 'DATA_ADMIN', etc.
  item_name text NOT NULL,
  item_path text, -- Route path: '/dashboard', '/contacts', etc.
  parent_item_id uuid REFERENCES menu_items(menu_item_id) ON DELETE CASCADE, -- For nested menus
  icon text, -- Icon name or emoji
  display_order integer DEFAULT 0,
  is_system_item boolean DEFAULT false, -- System items cannot be deleted
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ROLE MENU PERMISSIONS TABLE
-- Controls which pages/menu items each role can access
-- ============================================

CREATE TABLE IF NOT EXISTS role_menu_permissions (
  permission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES user_roles(role_id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(menu_item_id) ON DELETE CASCADE NOT NULL,
  can_access boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, menu_item_id)
);

-- ============================================
-- USER ROLE ASSIGNMENTS TABLE
-- Assigns roles to specific users
-- ============================================

CREATE TABLE IF NOT EXISTS user_role_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES user_roles(role_id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  
  -- Optional: time-limited role assignments
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  
  UNIQUE(user_id, role_id) -- One assignment per user per role
);

-- ============================================
-- ROLE BUSINESS ACCESS TABLE
-- Controls which businesses a role can access (for Lead/Manager levels)
-- ============================================

CREATE TABLE IF NOT EXISTS role_business_access (
  access_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES user_role_assignments(assignment_id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, business_id)
);

-- ============================================
-- ROLE CONTACT TYPE ACCESS TABLE
-- Controls which contact types a user can access within each business
-- ============================================

CREATE TABLE IF NOT EXISTS role_contact_type_access (
  access_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_access_id uuid REFERENCES role_business_access(access_id) ON DELETE CASCADE NOT NULL,
  contact_type text NOT NULL CHECK (contact_type IN ('IT_CANDIDATE','HEALTHCARE_CANDIDATE','VENDOR_CLIENT','VENDOR_EMPANELMENT','EMPLOYEE_INDIA','EMPLOYEE_USA')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_access_id, contact_type)
);

-- ============================================
-- ROLE PIPELINE ACCESS TABLE
-- Controls which pipelines a user can access within each business
-- ============================================

CREATE TABLE IF NOT EXISTS role_pipeline_access (
  access_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_access_id uuid REFERENCES role_business_access(access_id) ON DELETE CASCADE NOT NULL,
  pipeline_id uuid REFERENCES pipelines(pipeline_id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_access_id, pipeline_id)
);

-- ============================================
-- USER HIERARCHY TABLE
-- Defines manager-subordinate relationships
-- ============================================

CREATE TABLE IF NOT EXISTS user_hierarchy (
  hierarchy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subordinate_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  hierarchy_level integer DEFAULT 1, -- 1=direct report, 2=skip-level, etc.
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, subordinate_id),
  CHECK (manager_id != subordinate_id) -- Can't be your own manager
);

-- ============================================
-- RECORD PERMISSIONS TABLE (Optional)
-- CEO can grant specific record access to other users
-- ============================================

CREATE TABLE IF NOT EXISTS record_permissions (
  permission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  record_type text NOT NULL CHECK (record_type IN ('CONTACT','PIPELINE','BUSINESS')),
  record_id uuid NOT NULL, -- ID of the contact, pipeline, or business
  granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  permission_level text NOT NULL CHECK (permission_level IN ('VIEW','EDIT','DELETE')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(user_id, record_type, record_id, permission_level)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX idx_user_roles_level ON user_roles(tenant_id, role_level);
CREATE INDEX idx_user_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_active ON user_role_assignments(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_role_menu_permissions_role ON role_menu_permissions(role_id);
CREATE INDEX idx_role_business_access_assignment ON role_business_access(assignment_id);
CREATE INDEX idx_role_business_access_business ON role_business_access(business_id);
CREATE INDEX idx_role_contact_type_access_business ON role_contact_type_access(business_access_id);
CREATE INDEX idx_role_pipeline_access_business ON role_pipeline_access(business_access_id);
CREATE INDEX idx_user_hierarchy_manager ON user_hierarchy(manager_id);
CREATE INDEX idx_user_hierarchy_subordinate ON user_hierarchy(subordinate_id);
CREATE INDEX idx_record_permissions_user ON record_permissions(user_id);
CREATE INDEX idx_record_permissions_record ON record_permissions(record_type, record_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatically update hierarchy levels when hierarchy changes
CREATE OR REPLACE FUNCTION update_hierarchy_levels()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate hierarchy levels for this subordinate's chain
  WITH RECURSIVE hierarchy_chain AS (
    -- Start with the new/updated relationship
    SELECT 
      NEW.manager_id,
      NEW.subordinate_id,
      1 as level
    UNION ALL
    -- Find all managers above this manager
    SELECT 
      uh.manager_id,
      hc.subordinate_id,
      hc.level + 1
    FROM user_hierarchy uh
    JOIN hierarchy_chain hc ON hc.manager_id = uh.subordinate_id
    WHERE hc.level < 10 -- Prevent infinite loops
  )
  UPDATE user_hierarchy
  SET hierarchy_level = hc.level
  FROM hierarchy_chain hc
  WHERE user_hierarchy.manager_id = hc.manager_id
    AND user_hierarchy.subordinate_id = hc.subordinate_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hierarchy_levels_trigger
  AFTER INSERT OR UPDATE ON user_hierarchy
  FOR EACH ROW
  EXECUTE FUNCTION update_hierarchy_levels();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get user's active role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
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
    AND ura.is_active = true
    AND ur.is_active = true
    AND (ura.valid_until IS NULL OR ura.valid_until > now())
  ORDER BY ur.role_level DESC
  LIMIT 1; -- Return highest level role if user has multiple
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has permission for a menu item
CREATE OR REPLACE FUNCTION user_can_access_menu(p_user_id uuid, p_menu_item_code text)
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
      AND ura.is_active = true
      AND mi.item_code = p_menu_item_code
      AND rmp.can_access = true
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get all subordinates for a manager (recursive)
CREATE OR REPLACE FUNCTION get_all_subordinates(p_manager_id uuid)
RETURNS TABLE (subordinate_id uuid, hierarchy_level integer) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinate_chain AS (
    -- Direct reports
    SELECT 
      uh.subordinate_id,
      uh.hierarchy_level
    FROM user_hierarchy uh
    WHERE uh.manager_id = p_manager_id
    
    UNION ALL
    
    -- Indirect reports
    SELECT 
      uh.subordinate_id,
      sc.hierarchy_level + 1
    FROM user_hierarchy uh
    JOIN subordinate_chain sc ON sc.subordinate_id = uh.manager_id
    WHERE sc.hierarchy_level < 10 -- Prevent infinite loops
  )
  SELECT DISTINCT sc.subordinate_id, MIN(sc.hierarchy_level) as hierarchy_level
  FROM subordinate_chain sc
  GROUP BY sc.subordinate_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user can assign a specific role (based on hierarchy)
CREATE OR REPLACE FUNCTION can_assign_role(
  p_assigner_id uuid,
  p_target_role_level integer
)
RETURNS boolean AS $$
DECLARE
  assigner_role_level integer;
BEGIN
  -- Get assigner's role level
  SELECT role_level INTO assigner_role_level
  FROM get_user_role(p_assigner_id);
  
  -- Can only assign roles of lower level than own role
  RETURN (assigner_role_level > p_target_role_level);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get accessible businesses for a user
CREATE OR REPLACE FUNCTION get_user_accessible_businesses(p_user_id uuid)
RETURNS TABLE (business_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT rba.business_id
  FROM user_role_assignments ura
  JOIN role_business_access rba ON rba.assignment_id = ura.assignment_id
  WHERE ura.user_id = p_user_id
    AND ura.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get accessible contact types for a user in a business
CREATE OR REPLACE FUNCTION get_user_accessible_contact_types(
  p_user_id uuid,
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
    AND ura.is_active = true
    AND rba.business_id = p_business_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get accessible pipelines for a user in a business
CREATE OR REPLACE FUNCTION get_user_accessible_pipelines(
  p_user_id uuid,
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
    AND ura.is_active = true
    AND rba.business_id = p_business_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_business_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_contact_type_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_pipeline_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Service role bypass
CREATE POLICY "service_role_all_user_roles" ON user_roles FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_menu_items" ON menu_items FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_role_menu_permissions" ON role_menu_permissions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_user_role_assignments" ON user_role_assignments FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_role_business_access" ON role_business_access FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_role_contact_type_access" ON role_contact_type_access FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_role_pipeline_access" ON role_pipeline_access FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_user_hierarchy" ON user_hierarchy FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_record_permissions" ON record_permissions FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- USER ROLES: CEO/Super Admin can manage, all can view
CREATE POLICY "user_roles_select_tenant" ON user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = user_roles.tenant_id
    )
  );

CREATE POLICY "user_roles_manage_ceo" ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_role_assignments ura ON ura.user_id = p.id
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE p.id = auth.uid()
      AND p.tenant_id = user_roles.tenant_id
      AND ur.role_level = 5 -- CEO level
      AND ura.is_active = true
    )
  );

-- MENU ITEMS: All users can view (system-wide)
CREATE POLICY "menu_items_select_all" ON menu_items FOR SELECT USING (true);

-- ROLE MENU PERMISSIONS: Managed by CEO
CREATE POLICY "role_menu_permissions_select_role_holder" ON role_menu_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      WHERE ura.user_id = auth.uid()
      AND ura.role_id = role_menu_permissions.role_id
      AND ura.is_active = true
    )
  );

CREATE POLICY "role_menu_permissions_manage_ceo" ON role_menu_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.role_id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.role_level = 5
      AND ura.is_active = true
    )
  );

-- USER ROLE ASSIGNMENTS: Users can view own, managers can view subordinates
CREATE POLICY "user_role_assignments_select_own" ON user_role_assignments
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM get_all_subordinates(auth.uid()) gs
      WHERE gs.subordinate_id = user_role_assignments.user_id
    )
  );

CREATE POLICY "user_role_assignments_manage_hierarchical" ON user_role_assignments
  FOR ALL
  USING (
    -- Can manage if target user is subordinate or self
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM get_all_subordinates(auth.uid()) gs
      WHERE gs.subordinate_id = user_role_assignments.user_id
    )
  );

-- ============================================
-- SEED DATA: System Roles
-- ============================================

-- Insert system menu items
INSERT INTO menu_items (item_code, item_name, item_path, icon, display_order, is_system_item) VALUES
  ('DASHBOARD', 'Dashboard', '/dashboard', '📊', 1, true),
  ('CONTACTS', 'Contacts', '/contacts', '👥', 2, true),
  ('PIPELINES', 'Pipelines', '/pipelines', '🔄', 3, true),
  ('DATA_ADMIN', 'Data Administration', '/data-administration', '⚙️', 4, true),
  ('USER_ROLES', 'User Roles', '/data-administration/user-roles', '🔐', 41, true),
  ('ASSIGN_ROLES', 'Assign Roles', '/data-administration/assign-roles', '👤', 42, true),
  ('EMAIL_TEMPLATES', 'Email Templates', '/data-administration/email-templates', '📧', 43, true),
  ('BUSINESSES', 'Businesses', '/data-administration/businesses', '🏢', 44, true),
  ('REPORTS', 'Reports', '/reports', '📈', 5, true),
  ('SETTINGS', 'Settings', '/settings', '⚙️', 6, true)
ON CONFLICT (item_code) DO NOTHING;

-- Note: System roles should be created per tenant by application logic or setup script
-- Example seed for a specific tenant (run after tenant creation):

/*
-- Get your tenant_id first
SELECT tenant_id FROM tenants WHERE company_name = 'Your Company';

-- Create system roles for tenant
INSERT INTO user_roles (tenant_id, role_name, role_code, role_level, description, 
  can_create_records, can_edit_own_records, can_edit_subordinate_records, can_edit_all_records,
  can_delete_own_records, can_delete_subordinate_records, can_delete_all_records,
  can_view_own_records, can_view_subordinate_records, can_view_all_records,
  can_assign_roles, can_manage_users, can_manage_businesses, can_manage_roles, is_system_role)
VALUES
  -- Level 5: CEO
  ('YOUR_TENANT_ID', 'CEO', 'CEO', 5, 'Chief Executive Officer - Full system access',
   true, true, true, true, true, true, true, true, true, true, true, true, true, true, true),
   
  -- Level 4: Manager
  ('YOUR_TENANT_ID', 'Manager', 'MANAGER', 4, 'Manager - Can manage leads and recruiters',
   true, true, true, false, true, true, false, true, true, false, true, true, false, false, true),
   
  -- Level 3: Lead
  ('YOUR_TENANT_ID', 'Lead', 'LEAD', 3, 'Lead - Can manage recruiters',
   true, true, true, false, true, true, false, true, true, false, true, false, false, false, true),
   
  -- Level 2: Recruiter
  ('YOUR_TENANT_ID', 'Recruiter', 'RECRUITER', 2, 'Recruiter - Can manage own records',
   true, true, false, false, true, false, false, true, false, false, false, false, false, false, true),
   
  -- Level 1: Read Only
  ('YOUR_TENANT_ID', 'Read Only User', 'READ_ONLY', 1, 'Read-only access to selected pages',
   false, false, false, false, false, false, false, true, false, false, false, false, false, false, true);

-- Assign default menu permissions for CEO (all pages)
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  (SELECT role_id FROM user_roles WHERE tenant_id = 'YOUR_TENANT_ID' AND role_code = 'CEO'),
  menu_item_id,
  true
FROM menu_items;

-- Assign default menu permissions for Read Only (Dashboard, Contacts, Pipelines only)
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  (SELECT role_id FROM user_roles WHERE tenant_id = 'YOUR_TENANT_ID' AND role_code = 'READ_ONLY'),
  menu_item_id,
  true
FROM menu_items
WHERE item_code IN ('DASHBOARD', 'CONTACTS', 'PIPELINES');
*/

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE user_roles IS 'Defines user roles with hierarchical permission levels (1-5)';
COMMENT ON TABLE menu_items IS 'Centralized menu/page definitions for permission assignment';
COMMENT ON TABLE role_menu_permissions IS 'Controls which pages each role can access';
COMMENT ON TABLE user_role_assignments IS 'Assigns roles to users with optional time limits';
COMMENT ON TABLE role_business_access IS 'Controls business-level data access for Lead/Manager roles';
COMMENT ON TABLE role_contact_type_access IS 'Controls contact type access within businesses';
COMMENT ON TABLE role_pipeline_access IS 'Controls pipeline access within businesses';
COMMENT ON TABLE user_hierarchy IS 'Defines manager-subordinate relationships';
COMMENT ON TABLE record_permissions IS 'CEO can grant specific record access to users';

COMMENT ON FUNCTION get_user_role(uuid) IS 'Returns active role for a user (highest level if multiple)';
COMMENT ON FUNCTION user_can_access_menu(uuid, text) IS 'Checks if user has permission for a menu item';
COMMENT ON FUNCTION get_all_subordinates(uuid) IS 'Returns all direct and indirect subordinates for a manager';
COMMENT ON FUNCTION can_assign_role(uuid, integer) IS 'Checks if user can assign a role based on hierarchy';
COMMENT ON FUNCTION get_user_accessible_businesses(uuid) IS 'Returns businesses user can access';
COMMENT ON FUNCTION get_user_accessible_contact_types(uuid, uuid) IS 'Returns contact types user can access in a business';
COMMENT ON FUNCTION get_user_accessible_pipelines(uuid, uuid) IS 'Returns pipelines user can access in a business';

-- ============================================
-- END
-- ============================================
