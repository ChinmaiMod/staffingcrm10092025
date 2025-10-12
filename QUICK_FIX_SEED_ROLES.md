# Quick Fix: Seed Roles for Existing Tenant

**IMPORTANT**: This is a TEMPORARY solution. The proper fix is migration `020_fix_global_user_roles.sql` which makes roles global.

## Current Problem

The `user_roles` table currently has `tenant_id`, meaning each tenant needs its own role definitions. This is architecturally wrong, but we need to work with it until we apply the fix.

## Solution

After creating your first tenant via registration, run this SQL to create roles for that tenant:

```sql
-- Step 1: Get your tenant_id
SELECT tenant_id, company_name FROM tenants;

-- Step 2: Replace 'YOUR_TENANT_ID_HERE' with the actual tenant_id from Step 1
-- Then run this to insert the 5 system roles:

INSERT INTO user_roles (
  tenant_id,
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
    'YOUR_TENANT_ID_HERE'::uuid,
    'CEO', 
    'CEO', 
    5, 
    'Chief Executive Officer - Full system access within tenant',
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true
  ),
   
  -- Level 4: Manager
  (
    'YOUR_TENANT_ID_HERE'::uuid,
    'Manager', 
    'MANAGER', 
    4, 
    'Manager - Can manage leads and recruiters within tenant',
    true, true, true, false, true, true, false, true, true, false, true, true, false, false, true
  ),
   
  -- Level 3: Lead
  (
    'YOUR_TENANT_ID_HERE'::uuid,
    'Lead', 
    'LEAD', 
    3, 
    'Lead - Can manage recruiters within tenant',
    true, true, true, false, true, true, false, true, true, false, true, false, false, false, true
  ),
   
  -- Level 2: Recruiter
  (
    'YOUR_TENANT_ID_HERE'::uuid,
    'Recruiter', 
    'RECRUITER', 
    2, 
    'Recruiter - Can manage own records within tenant',
    true, true, false, false, true, false, false, true, false, false, false, false, false, false, true
  ),
   
  -- Level 1: Read Only
  (
    'YOUR_TENANT_ID_HERE'::uuid,
    'Read Only User', 
    'READ_ONLY', 
    1, 
    'Read-only access to selected pages within tenant',
    false, false, false, false, false, false, false, true, false, false, false, false, false, false, true
  );

-- Step 3: Verify roles were created
SELECT role_id, role_code, role_name, role_level 
FROM user_roles 
WHERE tenant_id = 'YOUR_TENANT_ID_HERE'::uuid
ORDER BY role_level DESC;

-- Step 4: Assign menu permissions for CEO
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  (SELECT role_id FROM user_roles WHERE tenant_id = 'YOUR_TENANT_ID_HERE'::uuid AND role_code = 'CEO'),
  menu_item_id,
  true
FROM menu_items;

-- Step 5: Verify CEO menu permissions
SELECT COUNT(*) as ceo_menu_count
FROM role_menu_permissions rmp
JOIN user_roles ur ON ur.role_id = rmp.role_id
WHERE ur.tenant_id = 'YOUR_TENANT_ID_HERE'::uuid AND ur.role_code = 'CEO';
```

## Better Solution

Apply migrations `020_fix_global_user_roles.sql` and `021_seed_global_roles.sql` to make roles properly global. Then roles will be shared across all tenants and you won't need to create them per-tenant.

## What This Fixes

After running this SQL:
- ✅ Your tenant will have 5 roles (CEO, Manager, Lead, Recruiter, Read-Only)
- ✅ CEO will have all menu permissions
- ✅ Edge Function can assign CEO role to tenant creator
- ✅ Registration will work properly

## Next Step

1. Complete registration to create first tenant
2. Run the SQL above with your tenant_id
3. Test that role assignment works
4. Later: Apply migration 020 to make roles global

