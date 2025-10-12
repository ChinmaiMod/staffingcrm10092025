-- ============================================
-- RBAC SYSTEM - SECURITY & PERMISSION TESTS
-- Comprehensive test suite for role-based access control
-- ============================================

-- Test 1: Verify all roles were created
SELECT 
  '✓ TEST 1: Role Creation' as test_name,
  COUNT(*) as role_count,
  CASE WHEN COUNT(*) = 5 THEN 'PASS ✓' ELSE 'FAIL ✗' END as status
FROM user_roles 
WHERE is_system_role = true;

-- Test 2: Verify role hierarchy (levels 1-5)
SELECT 
  '✓ TEST 2: Role Hierarchy' as test_name,
  role_name,
  role_level,
  CASE 
    WHEN role_code = 'READ_ONLY' AND role_level = 1 THEN 'PASS ✓'
    WHEN role_code = 'RECRUITER' AND role_level = 2 THEN 'PASS ✓'
    WHEN role_code = 'LEAD' AND role_level = 3 THEN 'PASS ✓'
    WHEN role_code = 'MANAGER' AND role_level = 4 THEN 'PASS ✓'
    WHEN role_code = 'CEO' AND role_level = 5 THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status
FROM user_roles 
WHERE is_system_role = true
ORDER BY role_level;

-- Test 3: Verify permission flags for each role
SELECT 
  '✓ TEST 3: Permission Flags' as test_name,
  role_name,
  can_create_records,
  can_view_all_records,
  can_edit_all_records,
  can_delete_all_records,
  can_manage_roles,
  CASE 
    WHEN role_code = 'CEO' AND can_view_all_records AND can_edit_all_records AND can_manage_roles THEN 'PASS ✓'
    WHEN role_code = 'MANAGER' AND can_edit_subordinate_records AND can_manage_businesses THEN 'PASS ✓'
    WHEN role_code = 'LEAD' AND can_view_subordinate_records AND NOT can_manage_users THEN 'PASS ✓'
    WHEN role_code = 'RECRUITER' AND can_view_own_records AND NOT can_view_subordinate_records THEN 'PASS ✓'
    WHEN role_code = 'READ_ONLY' AND NOT can_create_records AND NOT can_edit_own_records THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status
FROM user_roles 
WHERE is_system_role = true
ORDER BY role_level DESC;

-- Test 4: Verify menu items exist
SELECT 
  '✓ TEST 4: Menu Items' as test_name,
  COUNT(*) as menu_count,
  CASE WHEN COUNT(*) >= 10 THEN 'PASS ✓' ELSE 'FAIL ✗' END as status
FROM menu_items 
WHERE is_active = true;

-- Test 5: Verify menu permissions granted
SELECT 
  '✓ TEST 5: Menu Permissions' as test_name,
  ur.role_name,
  COUNT(rmp.menu_item_id) as menu_count,
  CASE 
    WHEN ur.role_code = 'CEO' AND COUNT(rmp.menu_item_id) = 10 THEN 'PASS ✓'
    WHEN ur.role_code = 'MANAGER' AND COUNT(rmp.menu_item_id) = 9 THEN 'PASS ✓'
    WHEN ur.role_code = 'LEAD' AND COUNT(rmp.menu_item_id) = 6 THEN 'PASS ✓'
    WHEN ur.role_code = 'RECRUITER' AND COUNT(rmp.menu_item_id) = 3 THEN 'PASS ✓'
    WHEN ur.role_code = 'READ_ONLY' AND COUNT(rmp.menu_item_id) = 2 THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status
FROM user_roles ur
LEFT JOIN role_menu_permissions rmp ON rmp.role_id = ur.role_id
WHERE ur.is_system_role = true
GROUP BY ur.role_id, ur.role_name, ur.role_code
ORDER BY ur.role_level DESC;

-- Test 6: Verify helper functions exist
SELECT 
  '✓ TEST 6: Helper Functions' as test_name,
  proname as function_name,
  'EXISTS ✓' as status
FROM pg_proc 
WHERE proname IN (
  'get_user_role',
  'user_can_access_menu',
  'get_all_subordinates',
  'can_assign_role',
  'get_user_accessible_businesses',
  'get_user_accessible_pipelines'
)
ORDER BY proname;

-- Test 7: Verify RLS is enabled on all RBAC tables
SELECT 
  '✓ TEST 7: RLS Enabled' as test_name,
  tablename,
  CASE WHEN rowsecurity THEN 'PASS ✓' ELSE 'FAIL ✗' END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN (
    'user_roles', 'menu_items', 'role_menu_permissions', 
    'user_role_assignments', 'role_business_access', 
    'role_contact_type_access', 'role_pipeline_access',
    'user_hierarchy', 'record_permissions',
    'contacts', 'businesses', 'pipelines'
  )
ORDER BY tablename;

-- Test 8: Count policies per table
SELECT 
  '✓ TEST 8: RLS Policies' as test_name,
  tablename,
  COUNT(*) as policy_count,
  CASE WHEN COUNT(*) >= 2 THEN 'PASS ✓' ELSE 'FAIL ✗' END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN (
    'user_roles', 'role_menu_permissions', 
    'user_role_assignments', 'contacts', 'pipelines'
  )
GROUP BY tablename
ORDER BY tablename;

-- Test 9: Verify user_permissions view exists
SELECT 
  '✓ TEST 9: User Permissions View' as test_name,
  viewname,
  'EXISTS ✓' as status
FROM pg_views
WHERE schemaname = 'public' AND viewname = 'user_permissions';

-- Test 10: Verify admin has CEO role assigned
SELECT 
  '✓ TEST 10: Admin Role Assignment' as test_name,
  p.email,
  ur.role_name,
  ura.is_active,
  CASE WHEN ur.role_code = 'CEO' AND ura.is_active THEN 'PASS ✓' ELSE 'FAIL ✗' END as status
FROM profiles p
JOIN user_role_assignments ura ON ura.user_id = p.id
JOIN user_roles ur ON ur.role_id = ura.role_id
WHERE p.role = 'ADMIN'
LIMIT 1;

-- ============================================
-- SUMMARY REPORT
-- ============================================

SELECT 
  '═══════════════════════════════════════' as divider,
  'RBAC SECURITY TEST SUMMARY' as report_title,
  '═══════════════════════════════════════' as divider2;

-- Count total tests
WITH test_results AS (
  SELECT COUNT(*) as total_tests FROM (
    SELECT 1 as test UNION ALL SELECT 1 UNION ALL SELECT 1 UNION ALL 
    SELECT 1 UNION ALL SELECT 1 UNION ALL SELECT 1 UNION ALL 
    SELECT 1 UNION ALL SELECT 1 UNION ALL SELECT 1 UNION ALL SELECT 1
  ) t
)
SELECT 
  total_tests || ' tests executed' as summary,
  'Review results above' as action
FROM test_results;

-- ============================================
-- FUNCTIONAL TESTS
-- ============================================

-- Test 11: Test get_user_role function
DO $$
DECLARE
  v_admin_id uuid;
  v_role_result RECORD;
BEGIN
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'ADMIN' LIMIT 1;
  
  IF v_admin_id IS NOT NULL THEN
    SELECT * INTO v_role_result FROM get_user_role(v_admin_id);
    
    IF v_role_result.role_code = 'CEO' THEN
      RAISE NOTICE '✓ TEST 11: get_user_role() - PASS ✓';
      RAISE NOTICE '  Admin has CEO role (Level %)', v_role_result.role_level;
    ELSE
      RAISE NOTICE '✗ TEST 11: get_user_role() - FAIL ✗';
      RAISE NOTICE '  Expected CEO, got %', v_role_result.role_code;
    END IF;
  ELSE
    RAISE NOTICE '⚠ TEST 11: SKIPPED - No admin user found';
  END IF;
END $$;

-- Test 12: Test user_can_access_menu function
DO $$
DECLARE
  v_admin_id uuid;
  v_can_access boolean;
BEGIN
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'ADMIN' LIMIT 1;
  
  IF v_admin_id IS NOT NULL THEN
    SELECT user_can_access_menu(v_admin_id, 'CONTACTS') INTO v_can_access;
    
    IF v_can_access THEN
      RAISE NOTICE '✓ TEST 12: user_can_access_menu() - PASS ✓';
      RAISE NOTICE '  CEO can access CONTACTS menu';
    ELSE
      RAISE NOTICE '✗ TEST 12: user_can_access_menu() - FAIL ✗';
      RAISE NOTICE '  CEO should have access to all menus';
    END IF;
  ELSE
    RAISE NOTICE '⚠ TEST 12: SKIPPED - No admin user found';
  END IF;
END $$;

-- Test 13: Test can_assign_role function
DO $$
DECLARE
  v_admin_id uuid;
  v_can_assign boolean;
BEGIN
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'ADMIN' LIMIT 1;
  
  IF v_admin_id IS NOT NULL THEN
    -- CEO (level 5) should be able to assign any role
    SELECT can_assign_role(v_admin_id, 3) INTO v_can_assign;
    
    IF v_can_assign THEN
      RAISE NOTICE '✓ TEST 13: can_assign_role() - PASS ✓';
      RAISE NOTICE '  CEO can assign lower level roles';
    ELSE
      RAISE NOTICE '✗ TEST 13: can_assign_role() - FAIL ✗';
      RAISE NOTICE '  CEO should be able to assign all roles';
    END IF;
  ELSE
    RAISE NOTICE '⚠ TEST 13: SKIPPED - No admin user found';
  END IF;
END $$;

-- ============================================
-- FINAL STATUS
-- ============================================

SELECT 
  '═══════════════════════════════════════' as divider,
  'ALL TESTS COMPLETE' as status,
  'Review PASS/FAIL status above' as next_step,
  '═══════════════════════════════════════' as divider2;
