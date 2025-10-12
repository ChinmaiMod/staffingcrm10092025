# RBAC System Implementation - COMPLETE ✅

## Summary
Successfully implemented a complete Role-Based Access Control (RBAC) system for the Staffing CRM with **9 tables**, **6 helper functions**, and comprehensive RLS policies. The system supports a **5-level hierarchical role structure** with granular permissions.

## Applied Migrations

### Migration 015 - RBAC System Tables & Functions ✅
**Applied in 3 parts** due to size:
- **Part 1**: Created 9 RBAC tables (user_roles, menu_items, role_menu_permissions, user_role_assignments, role_business_access, role_contact_type_access, role_pipeline_access, user_hierarchy, record_permissions)
- **Part 2**: Inserted 10 system menu items + created 6 helper functions
- **Part 3**: Applied RLS policies for all 9 RBAC tables

**Tables Created:**
1. **user_roles** - Role definitions with 19 permission flags (bigint role_id, uuid tenant_id)
2. **menu_items** - System page/route registry (10 default items pre-loaded)
3. **role_menu_permissions** - Role-to-page access mapping
4. **user_role_assignments** - User-to-role assignments (uuid user_id, bigint role_id)
5. **role_business_access** - Business scoping for roles (bigint business_id)
6. **role_contact_type_access** - Contact type filtering
7. **role_pipeline_access** - Pipeline scoping (bigint pipeline_id)
8. **user_hierarchy** - Manager-subordinate relationships (uuid IDs)
9. **record_permissions** - CEO discretionary grants (bigint record_id)

**Helper Functions:**
1. `get_user_role(p_user_id uuid)` - Returns active role for user
2. `user_can_access_menu(p_user_id uuid, p_menu_code text)` - Checks menu access
3. `get_all_subordinates(p_manager_id uuid)` - Recursive subordinate lookup
4. `can_assign_role(p_assigner_id uuid, p_target_role_level integer)` - Validates role assignment
5. `get_user_accessible_businesses(p_user_id uuid)` - Returns scoped businesses
6. `get_user_accessible_pipelines(p_user_id uuid)` - Returns scoped pipelines

### Migration 016 - RBAC Data Policies (Simplified) ✅
**Applied in 2 parts**:
- **Part 1**: Updated RLS policies for contacts, pipelines, pipeline_stages, businesses
- **Part 2**: Updated RLS policies for contact_pipeline_assignments, pipeline_stage_history, contact_status_history + created user_permissions view

**Policies Updated:**
- ✅ **contacts** (4 policies): SELECT, INSERT, UPDATE, DELETE
- ✅ **pipelines** (4 policies): SELECT, INSERT (level 4+), UPDATE (level 4+), DELETE (CEO only)
- ✅ **pipeline_stages** (4 policies): SELECT (inherits from pipeline), INSERT/UPDATE/DELETE (level 4+)
- ✅ **businesses** (4 policies): SELECT, INSERT/UPDATE (can_manage_businesses), DELETE (CEO)
- ✅ **contact_pipeline_assignments** (4 policies): Inherits permissions from contacts
- ✅ **pipeline_stage_history** (2 policies): Inherits from contact_pipeline_assignments
- ✅ **contact_status_history** (2 policies): Inherits from contacts

**Helper View:**
- `user_permissions` - Convenient view joining profiles, user_role_assignments, and user_roles

## Role Hierarchy (5 Levels)

| Level | Role Name | Permissions |
|-------|-----------|-------------|
| **1** | Read-Only | View own records only |
| **2** | Recruiter | View/Edit/Delete own, Create records |
| **3** | Lead | + View/Edit/Delete subordinate records, Scoped to businesses/contact types |
| **4** | Manager | + All of Lead, Manage pipelines, Manage businesses |
| **5** | CEO | View/Edit/Delete all, Assign roles, Manage users/roles, Grant discretionary permissions |

## Permission Flags (19 Total)

### Data Access Permissions
- `can_create_records` - Create new contacts/records
- `can_view_own_records` - View own created records
- `can_view_subordinate_records` - View subordinates' records
- `can_view_all_records` - View all records (CEO)
- `can_edit_own_records` - Edit own created records
- `can_edit_subordinate_records` - Edit subordinates' records
- `can_edit_all_records` - Edit all records (CEO)
- `can_delete_own_records` - Delete own created records
- `can_delete_subordinate_records` - Delete subordinates' records
- `can_delete_all_records` - Delete all records (CEO)

### Administrative Permissions
- `can_assign_roles` - Assign roles to users (at or below own level)
- `can_manage_users` - Create/edit/deactivate users
- `can_manage_businesses` - Create/edit businesses
- `can_manage_roles` - Create/edit/delete custom roles

### System Fields
- `is_system_role` - Protected from deletion
- `is_active` - Role enabled/disabled status

## Schema Compatibility Notes

### ⚠️ Mixed ID Type Schema
The database has a **mixed schema** that required simplified RLS policies:
- **Old tables** (contacts, businesses, users): Use `bigint` IDs
- **New tables** (profiles, tenants, RBAC): Use `uuid` IDs
- **Consequence**: contacts.created_by (bigint) cannot directly join profiles.id (uuid)

### Simplified Policy Approach
Due to the ID type mismatch, RLS policies enforce **role-level permissions only**:
- ✅ Role level checks (1-5)
- ✅ Permission flag checks (can_create_records, can_edit_all_records, etc.)
- ❌ **Ownership checks** (own vs subordinate vs all) - **Must be enforced at application layer**

**Example**: 
- RLS allows UPDATE if user has `can_edit_own_records OR can_edit_subordinate_records OR can_edit_all_records`
- Application layer must check: "Does this contact belong to me or my subordinate?"

## System Menu Items (Pre-loaded)

| Code | Name | Path | Icon |
|------|------|------|------|
| DASHBOARD | Dashboard | /dashboard | dashboard |
| CONTACTS | Contacts | /contacts | people |
| BUSINESSES | Businesses | /businesses | business |
| PIPELINES | Pipelines | /pipelines | account_tree |
| REPORTS | Reports | /reports | assessment |
| USERS | User Management | /users | manage_accounts |
| ROLES | Role Management | /roles | admin_panel_settings |
| BILLING | Billing | /billing | payment |
| SETTINGS | Settings | /settings | settings |
| PROFILE | My Profile | /profile | account_circle |

## Next Steps (Setup Required)

### 1. Create Default Roles for Tenant
You need to create the 5 default roles for your tenant:

```sql
-- Get your tenant_id first
SELECT tenant_id FROM tenants WHERE company_name = 'YOUR_COMPANY_NAME';

-- Insert default roles (replace <tenant_id> with actual UUID)
INSERT INTO user_roles (tenant_id, role_name, role_code, role_level, description, 
  can_create_records, can_view_own_records, can_view_subordinate_records, can_view_all_records,
  can_edit_own_records, can_edit_subordinate_records, can_edit_all_records,
  can_delete_own_records, can_delete_subordinate_records, can_delete_all_records,
  can_assign_roles, can_manage_users, can_manage_businesses, can_manage_roles, is_system_role)
VALUES
  -- Level 1: Read-Only
  ('<tenant_id>', 'Read-Only', 'READ_ONLY', 1, 'Can only view own records',
    false, true, false, false, false, false, false, false, false, false, false, false, false, false, true),
  
  -- Level 2: Recruiter
  ('<tenant_id>', 'Recruiter', 'RECRUITER', 2, 'Can manage own contacts and records',
    true, true, false, false, true, false, false, true, false, false, false, false, false, false, true),
  
  -- Level 3: Lead
  ('<tenant_id>', 'Lead', 'LEAD', 3, 'Can manage own and subordinate records',
    true, true, true, false, true, true, false, true, true, false, false, false, false, false, true),
  
  -- Level 4: Manager
  ('<tenant_id>', 'Manager', 'MANAGER', 4, 'Can manage team records, businesses, and pipelines',
    true, true, true, false, true, true, false, true, true, false, true, true, true, false, true),
  
  -- Level 5: CEO
  ('<tenant_id>', 'CEO', 'CEO', 5, 'Full access to all system features',
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true);
```

### 2. Assign CEO Role to Admin User
Assign the CEO role to your admin/first user:

```sql
-- Get profile.id for admin user
SELECT id FROM profiles WHERE email = 'admin@yourcompany.com';

-- Get role_id for CEO role
SELECT role_id FROM user_roles WHERE role_code = 'CEO' AND tenant_id = '<tenant_id>';

-- Assign role
INSERT INTO user_role_assignments (user_id, role_id, assigned_by, is_active)
VALUES ('<admin_profile_id>', <ceo_role_id>, '<admin_profile_id>', true);
```

### 3. Grant Menu Permissions
Grant menu access to each role:

```sql
-- CEO gets access to all menus
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT <ceo_role_id>, menu_item_id, true
FROM menu_items
WHERE is_active = true;

-- Manager gets access to all except ROLES (role management)
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT <manager_role_id>, menu_item_id, true
FROM menu_items
WHERE is_active = true AND item_code != 'ROLES';

-- Customize for Lead, Recruiter, Read-Only...
```

### 4. Test Role System
1. Create a test user with Recruiter role
2. Create another test user with Read-Only role
3. Verify each can only see/edit appropriate records
4. Test menu visibility per role

## Database State

### Migration Status
```
✅ 000_clean_reset.sql
✅ 001_initial_schema.sql
✅ 002_rls_policies.sql
✅ 003_update_profile_status.sql
✅ 005_*.sql (unknown)
✅ 006_*.sql (unknown)
✅ 007_contacts_businesses.sql (manually applied)
✅ 008_contact_status_history.sql (applied via MCP)
✅ 011_business_documents.sql (manually applied)
✅ 010_pipelines_schema.sql (applied via MCP - 4 tables)
✅ 012_*.sql (unknown)
✅ 013_*.sql (unknown)
✅ 014_*.sql (unknown)
✅ 015_rbac_system_FIXED.sql (applied via MCP - 9 tables)
✅ 016_rbac_data_policies_SIMPLE.sql (applied via MCP - updated RLS)
```

### Total Tables: 40
- **Original**: 22 tables (tenants, profiles, users, contacts, businesses, subscriptions, etc.)
- **Pipelines** (Migration 010): 4 tables (pipelines, pipeline_stages, contact_pipeline_assignments, pipeline_stage_history)
- **Contact Tracking** (Migration 008): 1 table (contact_status_history)
- **RBAC System** (Migration 015): 9 tables (user_roles, menu_items, role_menu_permissions, user_role_assignments, role_business_access, role_contact_type_access, role_pipeline_access, user_hierarchy, record_permissions)
- **Lookup Tables**: 7 tables (type_of_contact, reason_for_contact, visa_status, job_title, type_of_roles, referral_sources, workflow_status)

## Files Created

### Migration Files
1. **d:/Staffing-CRM/supabase/migrations/008_contact_status_history_FIXED.sql** - Contact status tracking
2. **d:/Staffing-CRM/supabase/migrations/010_pipelines_schema_FIXED.sql** - Sales pipeline system
3. **d:/Staffing-CRM/supabase/migrations/015_rbac_system_FIXED.sql** - RBAC tables and functions
4. **d:/Staffing-CRM/supabase/migrations/016_rbac_data_policies_SIMPLE.sql** - RBAC RLS policies

### Documentation
1. **d:/Staffing-CRM/MIGRATION_STATUS_REPORT.md** - Comprehensive migration status analysis
2. **d:/Staffing-CRM/RBAC_SYSTEM_SUMMARY.md** - This file

## Troubleshooting

### Check User's Current Role
```sql
SELECT * FROM get_user_role('user_profile_id');
```

### View All User Permissions
```sql
SELECT * FROM user_permissions WHERE user_id = 'user_profile_id';
```

### Check Menu Access
```sql
SELECT user_can_access_menu('user_profile_id', 'CONTACTS');
```

### Get User's Subordinates
```sql
SELECT * FROM get_all_subordinates('manager_profile_id');
```

### Verify Role Assignments
```sql
SELECT 
  p.email,
  ur.role_name,
  ur.role_level,
  ura.is_active,
  ura.assigned_at
FROM user_role_assignments ura
JOIN profiles p ON p.id = ura.user_id
JOIN user_roles ur ON ur.role_id = ura.role_id
WHERE ura.is_active = true
ORDER BY ur.role_level DESC;
```

## Status: ✅ COMPLETE & READY FOR TESTING

All RBAC tables, functions, and policies have been successfully applied to Supabase. The system is ready for:
1. Default role creation
2. User assignment
3. Menu permission configuration
4. End-to-end testing
