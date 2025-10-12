-- ============================================
-- ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM - FIXED FOR BIGINT
-- Implements hierarchical user roles with granular permissions
-- Modified to use bigint for contacts/businesses/pipelines compatibility
-- ============================================

-- ============================================
-- USER ROLES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_roles (
  role_id bigserial PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE NOT NULL,
  role_name text NOT NULL,
  role_code text NOT NULL,
  role_level integer NOT NULL CHECK (role_level >= 1 AND role_level <= 5),
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
  can_manage_roles boolean DEFAULT false,
  
  -- System flags
  is_system_role boolean DEFAULT false,
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
-- ============================================

CREATE TABLE IF NOT EXISTS menu_items (
  menu_item_id bigserial PRIMARY KEY,
  item_code text UNIQUE NOT NULL,
  item_name text NOT NULL,
  item_path text,
  parent_item_id bigint REFERENCES menu_items(menu_item_id) ON DELETE CASCADE,
  icon text,
  display_order integer DEFAULT 0,
  is_system_item boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ROLE MENU PERMISSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS role_menu_permissions (
  permission_id bigserial PRIMARY KEY,
  role_id bigint REFERENCES user_roles(role_id) ON DELETE CASCADE NOT NULL,
  menu_item_id bigint REFERENCES menu_items(menu_item_id) ON DELETE CASCADE NOT NULL,
  can_access boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, menu_item_id)
);

-- ============================================
-- USER ROLE ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_role_assignments (
  assignment_id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_id bigint REFERENCES user_roles(role_id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  
  -- Optional: time-limited role assignments
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  
  UNIQUE(user_id, role_id)
);

-- ============================================
-- ROLE BUSINESS ACCESS TABLE (bigint business IDs)
-- ============================================

CREATE TABLE IF NOT EXISTS role_business_access (
  access_id bigserial PRIMARY KEY,
  assignment_id bigint REFERENCES user_role_assignments(assignment_id) ON DELETE CASCADE NOT NULL,
  business_id bigint REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, business_id)
);

-- ============================================
-- ROLE CONTACT TYPE ACCESS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS role_contact_type_access (
  access_id bigserial PRIMARY KEY,
  assignment_id bigint REFERENCES user_role_assignments(assignment_id) ON DELETE CASCADE NOT NULL,
  contact_type_id bigint,
  created_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, contact_type_id)
);

-- ============================================
-- ROLE PIPELINE ACCESS TABLE (bigint pipeline IDs)
-- ============================================

CREATE TABLE IF NOT EXISTS role_pipeline_access (
  access_id bigserial PRIMARY KEY,
  assignment_id bigint REFERENCES user_role_assignments(assignment_id) ON DELETE CASCADE NOT NULL,
  pipeline_id bigint REFERENCES pipelines(pipeline_id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, pipeline_id)
);

-- ============================================
-- USER HIERARCHY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_hierarchy (
  hierarchy_id bigserial PRIMARY KEY,
  manager_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subordinate_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  hierarchy_level integer DEFAULT 1,
  hierarchy_path text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, subordinate_id),
  CHECK (manager_id != subordinate_id)
);

-- ============================================
-- RECORD PERMISSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS record_permissions (
  permission_id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  record_type text NOT NULL CHECK (record_type IN ('CONTACT','PIPELINE','BUSINESS')),
  record_id bigint NOT NULL,
  granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  can_view boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(user_id, record_type, record_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_level ON user_roles(tenant_id, role_level);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_active ON user_role_assignments(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_role_menu_permissions_role ON role_menu_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_business_access_assignment ON role_business_access(assignment_id);
CREATE INDEX IF NOT EXISTS idx_role_business_access_business ON role_business_access(business_id);
CREATE INDEX IF NOT EXISTS idx_role_contact_type_access_assignment ON role_contact_type_access(assignment_id);
CREATE INDEX IF NOT EXISTS idx_role_pipeline_access_assignment ON role_pipeline_access(assignment_id);
CREATE INDEX IF NOT EXISTS idx_user_hierarchy_manager ON user_hierarchy(manager_id);
CREATE INDEX IF NOT EXISTS idx_user_hierarchy_subordinate ON user_hierarchy(subordinate_id);
CREATE INDEX IF NOT EXISTS idx_record_permissions_user ON record_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_record_permissions_record ON record_permissions(record_type, record_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get user's active role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS TABLE (
  role_id bigint,
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
  LIMIT 1;
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
    SELECT 
      uh.subordinate_id,
      uh.hierarchy_level
    FROM user_hierarchy uh
    WHERE uh.manager_id = p_manager_id
    
    UNION ALL
    
    SELECT 
      uh.subordinate_id,
      sc.hierarchy_level + 1
    FROM user_hierarchy uh
    JOIN subordinate_chain sc ON sc.subordinate_id = uh.manager_id
    WHERE sc.hierarchy_level < 10
  )
  SELECT DISTINCT sc.subordinate_id, MIN(sc.hierarchy_level)::integer as hierarchy_level
  FROM subordinate_chain sc
  GROUP BY sc.subordinate_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user can assign a specific role
CREATE OR REPLACE FUNCTION can_assign_role(
  p_assigner_id uuid,
  p_target_role_id bigint
)
RETURNS boolean AS $$
DECLARE
  assigner_role_level integer;
  target_role_level integer;
BEGIN
  SELECT role_level INTO assigner_role_level
  FROM get_user_role(p_assigner_id);
  
  SELECT role_level INTO target_role_level
  FROM user_roles
  WHERE role_id = p_target_role_id;
  
  RETURN (assigner_role_level > target_role_level);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get accessible businesses for a user
CREATE OR REPLACE FUNCTION get_user_accessible_businesses(p_user_id uuid)
RETURNS TABLE (business_id bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT rba.business_id
  FROM user_role_assignments ura
  JOIN role_business_access rba ON rba.assignment_id = ura.assignment_id
  WHERE ura.user_id = p_user_id
    AND ura.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get accessible pipelines for a user
CREATE OR REPLACE FUNCTION get_user_accessible_pipelines(
  p_user_id uuid,
  p_business_id bigint
)
RETURNS TABLE (pipeline_id bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT rpa.pipeline_id
  FROM user_role_assignments ura
  JOIN role_business_access rba ON rba.assignment_id = ura.assignment_id
  JOIN role_pipeline_access rpa ON rpa.assignment_id = ura.assignment_id
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
DROP POLICY IF EXISTS "service_role_all_user_roles" ON user_roles;
CREATE POLICY "service_role_all_user_roles" ON user_roles FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_all_menu_items" ON menu_items;
CREATE POLICY "service_role_all_menu_items" ON menu_items FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_all_role_menu_permissions" ON role_menu_permissions;
CREATE POLICY "service_role_all_role_menu_permissions" ON role_menu_permissions FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_all_user_role_assignments" ON user_role_assignments;
CREATE POLICY "service_role_all_user_role_assignments" ON user_role_assignments FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_all_role_business_access" ON role_business_access;
CREATE POLICY "service_role_all_role_business_access" ON role_business_access FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_all_role_contact_type_access" ON role_contact_type_access;
CREATE POLICY "service_role_all_role_contact_type_access" ON role_contact_type_access FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_all_role_pipeline_access" ON role_pipeline_access;
CREATE POLICY "service_role_all_role_pipeline_access" ON role_pipeline_access FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_all_user_hierarchy" ON user_hierarchy;
CREATE POLICY "service_role_all_user_hierarchy" ON user_hierarchy FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_all_record_permissions" ON record_permissions;
CREATE POLICY "service_role_all_record_permissions" ON record_permissions FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- USER ROLES: All can view tenant roles
DROP POLICY IF EXISTS "user_roles_select_tenant" ON user_roles;
CREATE POLICY "user_roles_select_tenant" ON user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = user_roles.tenant_id
    )
  );

-- MENU ITEMS: All users can view
DROP POLICY IF EXISTS "menu_items_select_all" ON menu_items;
CREATE POLICY "menu_items_select_all" ON menu_items FOR SELECT USING (true);

-- USER ROLE ASSIGNMENTS: Users can view own
DROP POLICY IF EXISTS "user_role_assignments_select_own" ON user_role_assignments;
CREATE POLICY "user_role_assignments_select_own" ON user_role_assignments
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- SEED DATA: System Menu Items
-- ============================================

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

COMMENT ON TABLE user_roles IS 'Defines user roles with hierarchical permission levels (bigint compatible)';
COMMENT ON TABLE menu_items IS 'Centralized menu/page definitions for permission assignment';
COMMENT ON TABLE role_menu_permissions IS 'Controls which pages each role can access';
COMMENT ON TABLE user_role_assignments IS 'Assigns roles to users with optional time limits';
COMMENT ON TABLE role_business_access IS 'Controls business-level data access for Lead/Manager roles (bigint business IDs)';
COMMENT ON TABLE role_pipeline_access IS 'Controls pipeline access within businesses (bigint pipeline IDs)';
COMMENT ON TABLE user_hierarchy IS 'Defines manager-subordinate relationships';
COMMENT ON TABLE record_permissions IS 'CEO can grant specific record access to users (bigint record IDs)';
