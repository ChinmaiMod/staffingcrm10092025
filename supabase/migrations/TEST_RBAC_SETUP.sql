-- ============================================
-- RBAC SYSTEM - TEST DATA SETUP
-- Creates default roles, test users, and sample data for testing
-- ============================================

-- Step 1: Get your tenant_id (REPLACE WITH YOUR ACTUAL TENANT)
-- Run this query to find your tenant:
-- SELECT tenant_id, company_name FROM tenants;

-- For this test, we'll use a variable
DO $$
DECLARE
  v_tenant_id uuid;
  v_admin_profile_id uuid;
  v_ceo_role_id bigint;
  v_manager_role_id bigint;
  v_lead_role_id bigint;
  v_recruiter_role_id bigint;
  v_readonly_role_id bigint;
BEGIN
  -- Get the first tenant (or specify your tenant_id)
  SELECT tenant_id INTO v_tenant_id FROM tenants LIMIT 1;
  
  -- Get admin profile
  SELECT id INTO v_admin_profile_id FROM profiles WHERE role = 'ADMIN' LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found. Please create a tenant first.';
  END IF;
  
  RAISE NOTICE 'Using tenant_id: %', v_tenant_id;
  
  -- ============================================
  -- Create Default Roles
  -- ============================================
  
  -- Level 5: CEO
  INSERT INTO user_roles (
    tenant_id, role_name, role_code, role_level, description,
    can_create_records, can_view_own_records, can_view_subordinate_records, can_view_all_records,
    can_edit_own_records, can_edit_subordinate_records, can_edit_all_records,
    can_delete_own_records, can_delete_subordinate_records, can_delete_all_records,
    can_assign_roles, can_manage_users, can_manage_businesses, can_manage_roles, 
    is_system_role, created_by
  ) VALUES (
    v_tenant_id, 'CEO', 'CEO', 5, 'Chief Executive Officer - Full system access',
    true, true, true, true,  -- Create + View all
    true, true, true,         -- Edit all
    true, true, true,         -- Delete all
    true, true, true, true,   -- All admin functions
    true, v_admin_profile_id
  ) RETURNING role_id INTO v_ceo_role_id;
  
  -- Level 4: Manager
  INSERT INTO user_roles (
    tenant_id, role_name, role_code, role_level, description,
    can_create_records, can_view_own_records, can_view_subordinate_records, can_view_all_records,
    can_edit_own_records, can_edit_subordinate_records, can_edit_all_records,
    can_delete_own_records, can_delete_subordinate_records, can_delete_all_records,
    can_assign_roles, can_manage_users, can_manage_businesses, can_manage_roles, 
    is_system_role, created_by
  ) VALUES (
    v_tenant_id, 'Manager', 'MANAGER', 4, 'Team Manager - Manage team, businesses, pipelines',
    true, true, true, false,  -- Create + View own/subordinate
    true, true, false,        -- Edit own/subordinate
    true, true, false,        -- Delete own/subordinate
    true, true, true, false,  -- Assign roles, manage users/businesses
    true, v_admin_profile_id
  ) RETURNING role_id INTO v_manager_role_id;
  
  -- Level 3: Lead
  INSERT INTO user_roles (
    tenant_id, role_name, role_code, role_level, description,
    can_create_records, can_view_own_records, can_view_subordinate_records, can_view_all_records,
    can_edit_own_records, can_edit_subordinate_records, can_edit_all_records,
    can_delete_own_records, can_delete_subordinate_records, can_delete_all_records,
    can_assign_roles, can_manage_users, can_manage_businesses, can_manage_roles, 
    is_system_role, created_by
  ) VALUES (
    v_tenant_id, 'Lead', 'LEAD', 3, 'Team Lead - Manage own and subordinate records',
    true, true, true, false,  -- Create + View own/subordinate
    true, true, false,        -- Edit own/subordinate
    true, true, false,        -- Delete own/subordinate
    false, false, false, false, -- No admin functions
    true, v_admin_profile_id
  ) RETURNING role_id INTO v_lead_role_id;
  
  -- Level 2: Recruiter
  INSERT INTO user_roles (
    tenant_id, role_name, role_code, role_level, description,
    can_create_records, can_view_own_records, can_view_subordinate_records, can_view_all_records,
    can_edit_own_records, can_edit_subordinate_records, can_edit_all_records,
    can_delete_own_records, can_delete_subordinate_records, can_delete_all_records,
    can_assign_roles, can_manage_users, can_manage_businesses, can_manage_roles, 
    is_system_role, created_by
  ) VALUES (
    v_tenant_id, 'Recruiter', 'RECRUITER', 2, 'Recruiter - Manage own contacts and records',
    true, true, false, false,  -- Create + View own only
    true, false, false,        -- Edit own only
    true, false, false,        -- Delete own only
    false, false, false, false, -- No admin functions
    true, v_admin_profile_id
  ) RETURNING role_id INTO v_recruiter_role_id;
  
  -- Level 1: Read-Only
  INSERT INTO user_roles (
    tenant_id, role_name, role_code, role_level, description,
    can_create_records, can_view_own_records, can_view_subordinate_records, can_view_all_records,
    can_edit_own_records, can_edit_subordinate_records, can_edit_all_records,
    can_delete_own_records, can_delete_subordinate_records, can_delete_all_records,
    can_assign_roles, can_manage_users, can_manage_businesses, can_manage_roles, 
    is_system_role, created_by
  ) VALUES (
    v_tenant_id, 'Read-Only', 'READ_ONLY', 1, 'Read-Only User - Can only view own records',
    false, true, false, false,  -- View own only
    false, false, false,        -- No edit
    false, false, false,        -- No delete
    false, false, false, false, -- No admin functions
    true, v_admin_profile_id
  ) RETURNING role_id INTO v_readonly_role_id;
  
  RAISE NOTICE 'Created 5 default roles:';
  RAISE NOTICE '  CEO (ID: %)', v_ceo_role_id;
  RAISE NOTICE '  Manager (ID: %)', v_manager_role_id;
  RAISE NOTICE '  Lead (ID: %)', v_lead_role_id;
  RAISE NOTICE '  Recruiter (ID: %)', v_recruiter_role_id;
  RAISE NOTICE '  Read-Only (ID: %)', v_readonly_role_id;
  
  -- ============================================
  -- Grant Menu Permissions
  -- ============================================
  
  -- CEO gets all menus
  INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
  SELECT v_ceo_role_id, menu_item_id, true
  FROM menu_items WHERE is_active = true;
  
  -- Manager gets all except ROLES management
  INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
  SELECT v_manager_role_id, menu_item_id, true
  FROM menu_items 
  WHERE is_active = true AND item_code NOT IN ('ROLES');
  
  -- Lead gets: Dashboard, Contacts, Businesses, Pipelines, Reports, Profile
  INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
  SELECT v_lead_role_id, menu_item_id, true
  FROM menu_items 
  WHERE is_active = true AND item_code IN ('DASHBOARD', 'CONTACTS', 'BUSINESSES', 'PIPELINES', 'REPORTS', 'PROFILE');
  
  -- Recruiter gets: Dashboard, Contacts, Profile
  INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
  SELECT v_recruiter_role_id, menu_item_id, true
  FROM menu_items 
  WHERE is_active = true AND item_code IN ('DASHBOARD', 'CONTACTS', 'PROFILE');
  
  -- Read-Only gets: Dashboard, Profile
  INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
  SELECT v_readonly_role_id, menu_item_id, true
  FROM menu_items 
  WHERE is_active = true AND item_code IN ('DASHBOARD', 'PROFILE');
  
  RAISE NOTICE 'Granted menu permissions for all roles';
  
  -- ============================================
  -- Assign CEO role to admin
  -- ============================================
  
  IF v_admin_profile_id IS NOT NULL THEN
    INSERT INTO user_role_assignments (user_id, role_id, assigned_by, is_active)
    VALUES (v_admin_profile_id, v_ceo_role_id, v_admin_profile_id, true)
    ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;
    
    RAISE NOTICE 'Assigned CEO role to admin user (ID: %)', v_admin_profile_id;
  END IF;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RBAC Setup Complete!';
  RAISE NOTICE 'Next: Create test users and assign roles';
  RAISE NOTICE '============================================';
  
END $$;
