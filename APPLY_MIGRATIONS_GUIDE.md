# Migration Application Guide

## Current Status

Based on the Supabase MCP check, the following migrations have been applied to your project `OJosh_CRM`:
- ✅ 000_clean_reset
- ✅ 001_initial_schema
- ✅ 002_rls_policies
- ✅ 003_update_profile_status
- ✅ 005_tenant_invites
- ✅ 006_super_admin_policies
- ✅ 012_user_feedback
- ✅ 013_issue_reports
- ✅ 014_fix_registration_rls

## Migrations Pending (in order)

The following migrations need to be applied in this exact order:

1. ❌ **007_crm_contacts_schema.sql** - CRM contacts and reference tables
2. ❌ **008_contact_status_history.sql** - Contact status change tracking
3. ❌ **010_pipelines_schema.sql** - Sales pipelines system
4. ❌ **011_businesses_multi_business_support.sql** - Multi-business support
5. ❌ **015_rbac_system.sql** - RBAC database schema (NEW)
6. ❌ **016_rbac_data_policies.sql** - RBAC RLS policies (NEW)

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended for Large Migrations)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select project: `OJosh_CRM`
   - Click on "SQL Editor" in the left sidebar

2. **Apply Migration 007 - CRM Contacts Schema**
   - Click "New Query"
   - Open file: `d:/Staffing-CRM/supabase/migrations/007_crm_contacts_schema.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for success message

3. **Apply Migration 008 - Contact Status History**
   - Click "New Query"
   - Open file: `d:/Staffing-CRM/supabase/migrations/008_contact_status_history.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"

4. **Apply Migration 010 - Pipelines Schema**
   - Click "New Query"
   - Open file: `d:/Staffing-CRM/supabase/migrations/010_pipelines_schema.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"

5. **Apply Migration 011 - Businesses Support**
   - Click "New Query"
   - Open file: `d:/Staffing-CRM/supabase/migrations/011_businesses_multi_business_support.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"

6. **Apply Migration 015 - RBAC System** ⭐ NEW
   - Click "New Query"
   - Open file: `d:/Staffing-CRM/supabase/migrations/015_rbac_system.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"
   - This creates the role management tables

7. **Apply Migration 016 - RBAC Policies** ⭐ NEW
   - Click "New Query"
   - Open file: `d:/Staffing-CRM/supabase/migrations/016_rbac_data_policies.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"
   - This updates RLS policies to use role-based permissions

### Option 2: Using Supabase CLI (If Installed)

```powershell
# Navigate to project directory
cd D:\Staffing-CRM

# Link to your project (if not already linked)
supabase link --project-ref yvcsxadahzrxuptcgtkg

# Push all pending migrations
supabase db push

# Or apply individually:
supabase db push --file supabase/migrations/007_crm_contacts_schema.sql
supabase db push --file supabase/migrations/008_contact_status_history.sql
supabase db push --file supabase/migrations/010_pipelines_schema.sql
supabase db push --file supabase/migrations/011_businesses_multi_business_support.sql
supabase db push --file supabase/migrations/015_rbac_system.sql
supabase db push --file supabase/migrations/016_rbac_data_policies.sql
```

## Verification After Each Migration

After running each migration, verify it worked:

### Check Tables Were Created

In SQL Editor, run:
```sql
-- After 007: Check contacts tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contacts', 'visa_status', 'job_titles', 'contact_statuses');

-- After 008: Check status history
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'contact_status_history';

-- After 010: Check pipelines
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pipelines', 'pipeline_stages', 'contact_pipeline_assignments');

-- After 011: Check businesses
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'businesses';

-- After 015: Check RBAC tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_roles', 
  'menu_items', 
  'role_menu_permissions', 
  'user_role_assignments',
  'role_business_access',
  'role_contact_type_access',
  'role_pipeline_access',
  'user_hierarchy',
  'record_permissions'
);

-- After 016: Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('contacts', 'pipelines', 'contact_pipeline_assignments')
ORDER BY tablename, policyname;
```

## Post-Migration Setup for RBAC

### Step 1: Get Your Tenant ID

```sql
SELECT tenant_id, company_name FROM tenants;
```

Copy your `tenant_id` for the next steps.

### Step 2: Create Default Roles for Your Tenant

Replace `'YOUR_TENANT_ID'` with the actual UUID from Step 1:

```sql
-- Create system roles for your tenant
INSERT INTO user_roles (
  tenant_id, role_name, role_code, role_level, description,
  can_create_records, can_edit_own_records, can_edit_subordinate_records, can_edit_all_records,
  can_delete_own_records, can_delete_subordinate_records, can_delete_all_records,
  can_view_own_records, can_view_subordinate_records, can_view_all_records,
  can_assign_roles, can_manage_users, can_manage_businesses, can_manage_roles, is_system_role
)
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
```

### Step 3: Assign CEO Role to Yourself

First, get your user ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

Then assign CEO role:
```sql
INSERT INTO user_role_assignments (user_id, role_id, assigned_by, is_active)
SELECT 
  '<YOUR_USER_ID>',  -- Replace with your user ID
  role_id,
  '<YOUR_USER_ID>',  -- Self-assigned
  true
FROM user_roles 
WHERE tenant_id = '<YOUR_TENANT_ID>' 
AND role_code = 'CEO';
```

### Step 4: Assign Default Menu Permissions for CEO

```sql
-- CEO gets access to all pages
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  ur.role_id,
  mi.menu_item_id,
  true
FROM user_roles ur
CROSS JOIN menu_items mi
WHERE ur.tenant_id = '<YOUR_TENANT_ID>'
AND ur.role_code = 'CEO';
```

### Step 5: Assign Default Menu Permissions for Other Roles

```sql
-- Recruiter: Dashboard, Contacts only
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  ur.role_id,
  mi.menu_item_id,
  true
FROM user_roles ur
CROSS JOIN menu_items mi
WHERE ur.tenant_id = '<YOUR_TENANT_ID>'
AND ur.role_code = 'RECRUITER'
AND mi.item_code IN ('DASHBOARD', 'CONTACTS');

-- Read Only: Dashboard, Contacts, Pipelines (view only)
INSERT INTO role_menu_permissions (role_id, menu_item_id, can_access)
SELECT 
  ur.role_id,
  mi.menu_item_id,
  true
FROM user_roles ur
CROSS JOIN menu_items mi
WHERE ur.tenant_id = '<YOUR_TENANT_ID>'
AND ur.role_code = 'READ_ONLY'
AND mi.item_code IN ('DASHBOARD', 'CONTACTS', 'PIPELINES');
```

## Troubleshooting

### Error: "relation already exists"
- **Cause**: Migration was partially applied
- **Solution**: Safe to ignore if using `CREATE TABLE IF NOT EXISTS`

### Error: "column does not exist"
- **Cause**: Migrations applied out of order
- **Solution**: Check which tables exist and apply missing migrations

### Error: "permission denied"
- **Cause**: Logged in with wrong role
- **Solution**: Use service_role key in Supabase dashboard

### Check What Migrations Have Been Applied

```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

## Next Steps After All Migrations Applied

1. ✅ Verify all tables created
2. ✅ Assign CEO role to admin user
3. ✅ Configure default role menu permissions
4. 🔄 Test role permissions in application
5. 🔄 Create additional users and assign roles
6. 🔄 Set up business scoping for Manager/Lead roles

## Related Documentation

- **RBAC System Documentation**: `d:/Staffing-CRM/RBAC_SYSTEM.md`
- **Project Requirements**: `d:/Staffing-CRM/PROJECT_REQUIREMENTS_SUMMARY.md`
- **Supabase Setup Guide**: `d:/Staffing-CRM/SUPABASE_SETUP.md`

---

*Last Updated: October 12, 2025*
