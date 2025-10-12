# RBAC System Testing Guide

## Overview
This guide provides step-by-step instructions for testing the Role-Based Access Control (RBAC) system with automated tests and manual verification.

## Prerequisites
- Supabase project: OJosh_CRM
- Database migrations 015 and 016 applied
- Access to Supabase SQL Editor or CLI

---

## Part 1: Automated Database Tests

### Step 1: Setup Default Roles
Run this script to create the 5 default roles and grant menu permissions:

```bash
# Via Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Open: TEST_RBAC_SETUP.sql
3. Click "Run"
```

**Expected Output:**
```
✓ Created 5 default roles
✓ Granted menu permissions
✓ Assigned CEO role to admin
```

### Step 2: Run Security Tests
Verifies role creation, permissions, and RLS policies:

```bash
# Via Supabase Dashboard
1. Go to SQL Editor
2. Open: TEST_RBAC_SECURITY.sql
3. Click "Run"
```

**Expected Results: 13 Tests**
- ✓ TEST 1: Role Creation (5 roles)
- ✓ TEST 2: Role Hierarchy (Levels 1-5)
- ✓ TEST 3: Permission Flags (All roles configured correctly)
- ✓ TEST 4: Menu Items (10 items)
- ✓ TEST 5: Menu Permissions (CEO=10, Manager=9, Lead=6, Recruiter=3, ReadOnly=2)
- ✓ TEST 6: Helper Functions (6 functions exist)
- ✓ TEST 7: RLS Enabled (All RBAC tables)
- ✓ TEST 8: RLS Policies (Multiple policies per table)
- ✓ TEST 9: User Permissions View (Exists)
- ✓ TEST 10: Admin Role Assignment (CEO role assigned)
- ✓ TEST 11: get_user_role() function works
- ✓ TEST 12: user_can_access_menu() function works
- ✓ TEST 13: can_assign_role() function works

### Step 3: Run Integration Tests
Tests permission logic, data isolation, and role hierarchy:

```bash
# Via Supabase Dashboard
1. Go to SQL Editor
2. Open: TEST_RBAC_INTEGRATION.sql
3. Click "Run"
```

**Expected Results: 6 Test Scenarios**
- ✓ Contact Visibility Test (5 role checks)
- ✓ CRUD Permissions Test (5 role checks)
- ✓ Admin Permissions Test (5 role checks)
- ✓ Pipeline Permissions Test (5 role checks)
- ✓ Menu Access Control Test (5 role checks)
- ✓ Role Assignment Hierarchy Test (15 scenarios)

---

## Part 2: Manual User Testing

### Step 1: Create Test Users

#### Via Supabase Auth Dashboard
1. Go to **Authentication** → **Users** → **Add User**
2. Create 5 test users:

| Email | Role to Assign | Password |
|-------|----------------|----------|
| ceo@test.com | CEO | Test123! |
| manager@test.com | Manager | Test123! |
| lead@test.com | Lead | Test123! |
| recruiter@test.com | Recruiter | Test123! |
| readonly@test.com | Read-Only | Test123! |

#### Get Profile IDs
After creating users, run this SQL to get their profile IDs:

```sql
SELECT id, email FROM profiles 
WHERE email LIKE '%@test.com'
ORDER BY email;
```

### Step 2: Assign Roles to Test Users

```sql
-- Get role IDs
SELECT role_id, role_name, role_code FROM user_roles 
WHERE is_system_role = true
ORDER BY role_level DESC;

-- Assign CEO role
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
VALUES (
  '<ceo_profile_id>', 
  (SELECT role_id FROM user_roles WHERE role_code = 'CEO'),
  (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)
);

-- Assign Manager role
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
VALUES (
  '<manager_profile_id>', 
  (SELECT role_id FROM user_roles WHERE role_code = 'MANAGER'),
  (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)
);

-- Assign Lead role
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
VALUES (
  '<lead_profile_id>', 
  (SELECT role_id FROM user_roles WHERE role_code = 'LEAD'),
  (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)
);

-- Assign Recruiter role
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
VALUES (
  '<recruiter_profile_id>', 
  (SELECT role_id FROM user_roles WHERE role_code = 'RECRUITER'),
  (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)
);

-- Assign Read-Only role
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
VALUES (
  '<readonly_profile_id>', 
  (SELECT role_id FROM user_roles WHERE role_code = 'READ_ONLY'),
  (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)
);
```

### Step 3: Create User Hierarchy

```sql
-- Set up hierarchy: CEO > Manager > Lead > Recruiter
-- Manager reports to CEO
INSERT INTO user_hierarchy (manager_id, subordinate_id, hierarchy_level)
VALUES ('<ceo_profile_id>', '<manager_profile_id>', 1);

-- Lead reports to Manager
INSERT INTO user_hierarchy (manager_id, subordinate_id, hierarchy_level)
VALUES ('<manager_profile_id>', '<lead_profile_id>', 1);

-- Recruiter reports to Lead
INSERT INTO user_hierarchy (manager_id, subordinate_id, hierarchy_level)
VALUES ('<lead_profile_id>', '<recruiter_profile_id>', 1);
```

### Step 4: Create Test Data

```sql
-- Create test businesses
INSERT INTO businesses (tenant_id, business_name, business_type)
VALUES 
  (1, 'Tech Corp', 'Technology'),
  (1, 'Finance Inc', 'Financial Services');

-- Create test pipeline
INSERT INTO pipelines (tenant_id, business_id, name, description, created_by)
VALUES (
  1, 
  (SELECT id FROM businesses WHERE business_name = 'Tech Corp' LIMIT 1),
  'Sales Pipeline',
  'Main sales pipeline',
  '<ceo_profile_id>'
);

-- Create pipeline stages
INSERT INTO pipeline_stages (pipeline_id, name, display_order)
SELECT 
  (SELECT pipeline_id FROM pipelines WHERE name = 'Sales Pipeline' LIMIT 1),
  stage_name,
  stage_order
FROM (VALUES 
  ('New Lead', 1),
  ('Contacted', 2),
  ('Qualified', 3),
  ('Proposal', 4),
  ('Closed Won', 5)
) AS stages(stage_name, stage_order);

-- Create test contacts (one per user to test ownership)
-- Contact created by CEO
INSERT INTO contacts (tenant_id, business_id, first_name, last_name, email, created_by)
VALUES (1, 1, 'John', 'CEO Contact', 'john.ceo@test.com', <ceo_user_id>);

-- Contact created by Manager
INSERT INTO contacts (tenant_id, business_id, first_name, last_name, email, created_by)
VALUES (1, 1, 'Jane', 'Manager Contact', 'jane.mgr@test.com', <manager_user_id>);

-- Contact created by Lead
INSERT INTO contacts (tenant_id, business_id, first_name, last_name, email, created_by)
VALUES (1, 1, 'Bob', 'Lead Contact', 'bob.lead@test.com', <lead_user_id>);

-- Contact created by Recruiter
INSERT INTO contacts (tenant_id, business_id, first_name, last_name, email, created_by)
VALUES (1, 1, 'Alice', 'Recruiter Contact', 'alice.rec@test.com', <recruiter_user_id>);
```

---

## Part 3: Application Testing

### Test 1: Login & Menu Visibility

**Login as each test user and verify menu items:**

| Role | Expected Menus |
|------|----------------|
| CEO | All 10 menus (Dashboard, Contacts, Businesses, Pipelines, Reports, Users, Roles, Billing, Settings, Profile) |
| Manager | 9 menus (All except Roles) |
| Lead | 6 menus (Dashboard, Contacts, Businesses, Pipelines, Reports, Profile) |
| Recruiter | 3 menus (Dashboard, Contacts, Profile) |
| Read-Only | 2 menus (Dashboard, Profile) |

**How to Test:**
1. Login to application with each test user
2. Check navigation menu
3. Verify only expected menu items are visible
4. Try to access restricted URLs directly (should redirect/403)

### Test 2: Contact Visibility

**Expected Behavior:**

| Role | Can View |
|------|----------|
| CEO | All 4 contacts |
| Manager | CEO + Manager + Lead + Recruiter contacts (all 4) |
| Lead | Manager + Lead + Recruiter contacts (3) |
| Recruiter | Only Recruiter contact (1) |
| Read-Only | Only Read-Only contact (if any created) |

**How to Test:**
1. Login as each role
2. Navigate to Contacts page
3. Count visible contacts
4. Verify you only see expected contacts

### Test 3: Contact CRUD Operations

**Create Test:**
- ✓ CEO, Manager, Lead, Recruiter can create contacts
- ✗ Read-Only CANNOT create contacts

**Update Test:**
- ✓ CEO can edit any contact
- ✓ Manager can edit own + subordinate contacts
- ✓ Lead can edit own + subordinate contacts
- ✓ Recruiter can edit only own contacts
- ✗ Read-Only CANNOT edit any contacts

**Delete Test:**
- ✓ CEO can delete any contact
- ✓ Manager can delete own + subordinate contacts
- ✓ Lead can delete own + subordinate contacts
- ✓ Recruiter can delete only own contacts
- ✗ Read-Only CANNOT delete any contacts

**How to Test:**
1. Login as each role
2. Try to create a new contact (check if "New Contact" button visible)
3. Try to edit different contacts (check if edit button visible/enabled)
4. Try to delete different contacts (check if delete button visible/enabled)

### Test 4: Pipeline Management

**Expected Behavior:**
- ✓ CEO & Manager can create/edit pipelines
- ✗ Lead, Recruiter, Read-Only can only view pipelines
- ✓ Only CEO can delete pipelines

**How to Test:**
1. Login as each role
2. Navigate to Pipelines
3. Check if "New Pipeline" button is visible
4. Check if edit/delete buttons are visible

### Test 5: User Management

**Expected Behavior:**
- ✓ CEO & Manager can access Users page
- ✓ CEO can assign any role
- ✓ Manager can assign roles up to Manager level
- ✗ Lead, Recruiter, Read-Only cannot access Users page

**How to Test:**
1. Login as CEO
2. Navigate to Users → Assign Roles
3. Verify you can assign any role
4. Login as Manager
5. Verify you can only assign up to Manager role
6. Login as Lead
7. Verify Users menu is not visible

### Test 6: Role Management

**Expected Behavior:**
- ✓ Only CEO can access Roles page
- ✗ All other roles cannot access Roles page

**How to Test:**
1. Login as CEO
2. Navigate to Roles
3. Verify you can create/edit roles
4. Login as Manager
5. Verify Roles menu is not visible

---

## Part 4: Security Testing

### Test 1: RLS Policy Enforcement

**Verify contacts are properly isolated:**

```sql
-- Login as recruiter (set auth context)
SET LOCAL "request.jwt.claims" TO '{"sub": "<recruiter_profile_id>"}';

-- Try to query all contacts (should only see own)
SELECT COUNT(*) FROM contacts;
-- Expected: 1 (only recruiter's contact)

-- Try to insert contact as read-only user
SET LOCAL "request.jwt.claims" TO '{"sub": "<readonly_profile_id>"}';

INSERT INTO contacts (tenant_id, first_name, last_name, email)
VALUES (1, 'Test', 'User', 'test@test.com');
-- Expected: ERROR - RLS policy violation
```

### Test 2: Direct API Bypass Attempt

**Try to bypass RLS using Supabase client:**

```javascript
// Login as Recruiter
const { data: contacts } = await supabase
  .from('contacts')
  .select('*');

console.log(contacts.length); 
// Expected: 1 (only own contact)

// Try to update another user's contact
const { error } = await supabase
  .from('contacts')
  .update({ first_name: 'Hacked' })
  .eq('id', managerContactId);

console.log(error); 
// Expected: Error - RLS policy violation
```

### Test 3: Role Escalation Attempt

**Try to assign higher role:**

```sql
-- Login as Manager
-- Try to assign CEO role (should fail)
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
VALUES (
  '<test_user_id>',
  (SELECT role_id FROM user_roles WHERE role_code = 'CEO'),
  '<manager_profile_id>'
);
-- Expected: Should only allow if Manager level >= CEO level
```

---

## Part 5: Verification Queries

### Check User Roles
```sql
SELECT 
  p.email,
  ur.role_name,
  ur.role_level,
  ura.is_active
FROM profiles p
JOIN user_role_assignments ura ON ura.user_id = p.id
JOIN user_roles ur ON ur.role_id = ura.role_id
WHERE p.email LIKE '%@test.com'
ORDER BY ur.role_level DESC;
```

### Check User Permissions
```sql
SELECT 
  email,
  role_name,
  can_create_records,
  can_view_all_records,
  can_edit_all_records,
  can_delete_all_records,
  can_manage_users
FROM user_permissions
WHERE email LIKE '%@test.com'
ORDER BY role_level DESC;
```

### Check Menu Access
```sql
SELECT 
  ur.role_name,
  mi.item_name,
  rmp.can_access
FROM user_roles ur
JOIN role_menu_permissions rmp ON rmp.role_id = ur.role_id
JOIN menu_items mi ON mi.menu_item_id = rmp.menu_item_id
WHERE ur.is_system_role = true
ORDER BY ur.role_level DESC, mi.display_order;
```

### Check Hierarchy
```sql
SELECT 
  m.email as manager,
  s.email as subordinate,
  uh.hierarchy_level
FROM user_hierarchy uh
JOIN profiles m ON m.id = uh.manager_id
JOIN profiles s ON s.id = uh.subordinate_id
WHERE m.email LIKE '%@test.com' OR s.email LIKE '%@test.com';
```

---

## Part 6: Performance Testing

### Test Query Performance
```sql
EXPLAIN ANALYZE
SELECT * FROM contacts
WHERE created_by = '<user_id>';

-- Should use index on created_by
-- Execution time should be < 10ms
```

### Test RLS Overhead
```sql
-- Measure query time with RLS
\timing on
SELECT COUNT(*) FROM contacts;

-- Compare with service role (bypasses RLS)
SET ROLE service_role;
SELECT COUNT(*) FROM contacts;
```

---

## Expected Test Results

### ✅ All Tests Should Pass

**Database Tests:**
- 13/13 Security Tests PASS
- 6/6 Integration Test Scenarios PASS
- All RLS policies enabled
- All helper functions working

**Application Tests:**
- Menu visibility correct for all roles
- Contact visibility isolated per role
- CRUD operations enforced per role
- Admin functions restricted to appropriate roles

**Security Tests:**
- RLS prevents unauthorized access
- Cannot bypass via direct API calls
- Cannot escalate privileges
- Data properly isolated between roles

---

## Troubleshooting

### Issue: Tests fail with "No roles found"
**Solution:** Run TEST_RBAC_SETUP.sql first

### Issue: "Permission denied" errors
**Solution:** Verify RLS policies are enabled and user has role assigned

### Issue: Menu items not showing
**Solution:** Check role_menu_permissions table has entries for that role

### Issue: Can see all contacts regardless of role
**Solution:** 
1. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'contacts';`
2. Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'contacts';`
3. Verify user has role: `SELECT * FROM get_user_role('<user_id>');`

---

## Next Steps After Testing

1. **Document any failures** in GitHub Issues
2. **Adjust policies** if needed based on business requirements
3. **Create production roles** (copy from test with real permissions)
4. **Train users** on permission system
5. **Monitor audit logs** for permission violations
6. **Review performance** and add indexes if needed

---

## Test Completion Checklist

- [ ] Ran TEST_RBAC_SETUP.sql successfully
- [ ] Ran TEST_RBAC_SECURITY.sql - All 13 tests PASS
- [ ] Ran TEST_RBAC_INTEGRATION.sql - All 6 scenarios PASS
- [ ] Created 5 test users
- [ ] Assigned roles to test users
- [ ] Created user hierarchy
- [ ] Created test contacts (1 per user)
- [ ] Tested menu visibility for each role
- [ ] Tested contact CRUD for each role
- [ ] Tested pipeline management permissions
- [ ] Tested user management permissions
- [ ] Tested role management permissions
- [ ] Verified RLS policy enforcement
- [ ] Attempted security bypass (failed as expected)
- [ ] Checked performance (< 10ms queries)
- [ ] Documented any issues found

**Status: Ready for Production** ✅
