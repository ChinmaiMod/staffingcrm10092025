-- ============================================
-- SEED GLOBAL USER ROLES
-- Inserts the 5 standard system roles
-- Run this AFTER 020_fix_global_user_roles.sql
-- ============================================

-- ============================================
-- INSERT GLOBAL SYSTEM ROLES
-- ============================================

-- Clear any existing data (in case of re-run)
TRUNCATE TABLE user_roles CASCADE;

INSERT INTO user_roles (
  role_name, 
  role_code, 
  role_level, 
  description, 
  can_create_records, 
  can_edit_own_records, 
  can_edit_subordinate_records, 
  can_edit_all_records,
  can_delete_own_records, 
  can_delete_subordinate_records, 
  can_delete_all_records,
  can_view_own_records, 
  can_view_subordinate_records, 
  can_view_all_records,
  can_assign_roles, 
  can_manage_users, 
  can_manage_businesses, 
  can_manage_roles, 
  is_system_role
)
VALUES
  -- Level 5: CEO
  (
    'CEO', 
    'CEO', 
    5, 
    'Chief Executive Officer - Full system access within tenant',
    true,  -- can_create_records
    true,  -- can_edit_own_records
    true,  -- can_edit_subordinate_records
    true,  -- can_edit_all_records
    true,  -- can_delete_own_records
    true,  -- can_delete_subordinate_records
    true,  -- can_delete_all_records
    true,  -- can_view_own_records
    true,  -- can_view_subordinate_records
    true,  -- can_view_all_records
    true,  -- can_assign_roles
    true,  -- can_manage_users
    true,  -- can_manage_businesses
    true,  -- can_manage_roles
    true   -- is_system_role
  ),
   
  -- Level 4: Manager
  (
    'Manager', 
    'MANAGER', 
    4, 
    'Manager - Can manage leads and recruiters within tenant',
    true,  -- can_create_records
    true,  -- can_edit_own_records
    true,  -- can_edit_subordinate_records
    false, -- can_edit_all_records
    true,  -- can_delete_own_records
    true,  -- can_delete_subordinate_records
    false, -- can_delete_all_records
    true,  -- can_view_own_records
    true,  -- can_view_subordinate_records
    false, -- can_view_all_records
    true,  -- can_assign_roles
    true,  -- can_manage_users
    false, -- can_manage_businesses
    false, -- can_manage_roles
    true   -- is_system_role
  ),
   
  -- Level 3: Lead
  (
    'Lead', 
    'LEAD', 
    3, 
    'Lead - Can manage recruiters within tenant',
    true,  -- can_create_records
    true,  -- can_edit_own_records
    true,  -- can_edit_subordinate_records
    false, -- can_edit_all_records
    true,  -- can_delete_own_records
    true,  -- can_delete_subordinate_records
    false, -- can_delete_all_records
    true,  -- can_view_own_records
    true,  -- can_view_subordinate_records
    false, -- can_view_all_records
    true,  -- can_assign_roles (can assign to recruiters)
    false, -- can_manage_users
    false, -- can_manage_businesses
    false, -- can_manage_roles
    true   -- is_system_role
  ),
   
  -- Level 2: Recruiter
  (
    'Recruiter', 
    'RECRUITER', 
    2, 
    'Recruiter - Can manage own records within tenant',
    true,  -- can_create_records
    true,  -- can_edit_own_records
    false, -- can_edit_subordinate_records
    false, -- can_edit_all_records
    true,  -- can_delete_own_records
    false, -- can_delete_subordinate_records
    false, -- can_delete_all_records
    true,  -- can_view_own_records
    false, -- can_view_subordinate_records
    false, -- can_view_all_records
    false, -- can_assign_roles
    false, -- can_manage_users
    false, -- can_manage_businesses
    false, -- can_manage_roles
    true   -- is_system_role
  ),
   
  -- Level 1: Read Only
  (
    'Read Only User', 
    'READ_ONLY', 
    1, 
    'Read-only access to selected pages within tenant',
    false, -- can_create_records
    false, -- can_edit_own_records
    false, -- can_edit_subordinate_records
    false, -- can_edit_all_records
    false, -- can_delete_own_records
    false, -- can_delete_subordinate_records
    false, -- can_delete_all_records
    true,  -- can_view_own_records
    false, -- can_view_subordinate_records
    false, -- can_view_all_records
    false, -- can_assign_roles
    false, -- can_manage_users
    false, -- can_manage_businesses
    false, -- can_manage_roles
    true   -- is_system_role
  )
ON CONFLICT (role_code) DO NOTHING;

-- ============================================
-- ASSIGN DEFAULT MENU PERMISSIONS
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
-- VERIFICATION
-- ============================================

-- Display created roles
DO $$
DECLARE
  role_count INTEGER;
  menu_perm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM user_roles;
  SELECT COUNT(*) INTO menu_perm_count FROM role_menu_permissions;
  
  RAISE NOTICE 'Global roles seeded successfully!';
  RAISE NOTICE 'Total roles: %', role_count;
  RAISE NOTICE 'Total menu permissions: %', menu_perm_count;
  
  -- Display roles
  RAISE NOTICE '';
  RAISE NOTICE 'Roles created:';
  FOR rec IN (
    SELECT role_code, role_name, role_level 
    FROM user_roles 
    ORDER BY role_level DESC
  ) LOOP
    RAISE NOTICE '  % (Level %): %', rec.role_code, rec.role_level, rec.role_name;
  END LOOP;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE user_roles IS 'GLOBAL role definitions (not tenant-specific). Contains 5 system roles: CEO, Manager, Lead, Recruiter, Read-Only';

-- ============================================
-- END
-- ============================================
