# RBAC Architecture Fix: Global Roles vs Tenant-Specific Assignments

**Date**: October 12, 2025  
**Migration**: `020_fix_global_user_roles.sql`  
**Priority**: 🔴 **CRITICAL ARCHITECTURAL FIX**  
**Status**: ⚠️ **READY TO APPLY**

---

## 🚨 Problem Identified

### Current Architecture (INCORRECT ❌)

```sql
CREATE TABLE user_roles (
  role_id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(tenant_id), -- ❌ WRONG!
  role_name text NOT NULL,
  role_code text NOT NULL,
  ...
  UNIQUE(tenant_id, role_code) -- Each tenant defines its own "CEO" role
);
```

**Issues:**
1. ❌ Each tenant creates duplicate role definitions ("CEO", "Manager", etc.)
2. ❌ No consistency across tenants (Tenant A's "CEO" ≠ Tenant B's "CEO")
3. ❌ Can't update permissions globally (must update each tenant separately)
4. ❌ Users can't have different roles in different tenants
5. ❌ Violates DRY principle (Don't Repeat Yourself)

### Example of Current Problem:

```
Tenant A:
  - Creates role "CEO" with permissions X, Y, Z
  
Tenant B:
  - Creates role "CEO" with permissions X, Y (missing Z!)
  
Result: Inconsistent permissions across tenants ❌
```

---

## ✅ Correct Architecture

### New Design: Global Roles + Tenant-Specific Assignments

```sql
-- GLOBAL role definitions (system-wide)
CREATE TABLE user_roles (
  role_id uuid PRIMARY KEY,
  -- NO tenant_id! ✅
  role_name text NOT NULL UNIQUE, -- One "CEO" role for entire system
  role_code text NOT NULL UNIQUE,
  role_level integer NOT NULL,
  ...permissions...
);

-- TENANT-SPECIFIC role assignments
CREATE TABLE user_role_assignments (
  assignment_id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  role_id uuid REFERENCES user_roles(role_id),
  tenant_id uuid REFERENCES tenants(tenant_id), -- ✅ Tenant context here!
  ...
  UNIQUE(user_id, role_id, tenant_id)
);
```

### Benefits:

1. ✅ **Single Source of Truth**: One "CEO" role definition system-wide
2. ✅ **Consistency**: All CEOs have same permissions across all tenants
3. ✅ **Easy Updates**: Change CEO permissions once, applies everywhere
4. ✅ **Multi-Tenant Users**: User can be "CEO" in Tenant A, "Manager" in Tenant B
5. ✅ **Scalability**: Add new permissions to all roles simultaneously

### Example of New Architecture:

```
System-Wide Roles:
  - CEO (role_id: uuid-1, level: 5, permissions: {...})
  - Manager (role_id: uuid-2, level: 4, permissions: {...})
  - Lead (role_id: uuid-3, level: 3, permissions: {...})

Role Assignments:
  - User Alice = CEO in Tenant A
  - User Alice = Manager in Tenant B
  - User Bob = CEO in Tenant B
  - User Charlie = Lead in Tenant A

Result: Consistent permissions, flexible assignments ✅
```

---

## 🔄 Migration Details

### What Changes:

#### 1. **user_roles Table** (Role Definitions)

**BEFORE:**
```sql
user_roles:
  - tenant_id (FK to tenants) ❌
  - Unique constraint: (tenant_id, role_code)
```

**AFTER:**
```sql
user_roles:
  - NO tenant_id ✅
  - Unique constraint: (role_code) - system-wide unique
```

#### 2. **user_role_assignments Table** (Role Assignments)

**BEFORE:**
```sql
user_role_assignments:
  - user_id
  - role_id
  - NO tenant_id ❌
  - Unique constraint: (user_id, role_id)
```

**AFTER:**
```sql
user_role_assignments:
  - user_id
  - role_id
  - tenant_id (FK to tenants) ✅ NEW!
  - Unique constraint: (user_id, role_id, tenant_id)
```

### Global Roles Created:

| Role Name | Role Code | Level | Description |
|-----------|-----------|-------|-------------|
| CEO | CEO | 5 | Chief Executive Officer - Full system access within tenant |
| Manager | MANAGER | 4 | Manager - Can manage leads and recruiters within tenant |
| Lead | LEAD | 3 | Lead - Can manage recruiters within tenant |
| Recruiter | RECRUITER | 2 | Recruiter - Can manage own records within tenant |
| Read Only User | READ_ONLY | 1 | Read-only access to selected pages within tenant |

### Menu Permissions Assigned:

**CEO**: All pages
- Dashboard, Contacts, Pipelines, Data Admin, User Roles, Assign Roles, Email Templates, Businesses, Reports, Settings

**Manager**: Most pages (except User Roles management)
- Dashboard, Contacts, Pipelines, Data Admin, Assign Roles, Email Templates, Businesses, Reports, Settings

**Lead**: Operational pages
- Dashboard, Contacts, Pipelines, Assign Roles, Reports, Settings

**Recruiter**: Core pages
- Dashboard, Contacts, Pipelines, Reports

**Read Only**: Basic pages
- Dashboard, Contacts, Pipelines

---

## 🛠️ Updated Functions

All helper functions now require `tenant_id` parameter:

### Before:
```sql
get_user_role(user_id) -- ❌ Ambiguous - which tenant?
```

### After:
```sql
get_user_role(user_id, tenant_id) -- ✅ Clear - specific tenant context
```

### Updated Function Signatures:

| Function | Old Signature | New Signature |
|----------|--------------|---------------|
| `get_user_role` | `(uuid)` | `(uuid, uuid)` - Added tenant_id |
| `user_can_access_menu` | `(uuid, text)` | `(uuid, uuid, text)` - Added tenant_id |
| `can_assign_role` | `(uuid, integer)` | `(uuid, uuid, integer)` - Added tenant_id |
| `get_user_accessible_businesses` | `(uuid)` | `(uuid, uuid)` - Added tenant_id |
| `get_user_accessible_contact_types` | `(uuid, uuid)` | `(uuid, uuid, uuid)` - tenant_id now explicit |
| `get_user_accessible_pipelines` | `(uuid, uuid)` | `(uuid, uuid, uuid)` - tenant_id now explicit |

---

## ⚠️ Breaking Changes

### 🔴 CRITICAL: Data Loss Warning

**This migration will:**
1. ✅ Backup existing `user_roles` to `user_roles_backup`
2. ❌ **DROP and recreate** `user_role_assignments` (all assignments lost)
3. ❌ **DROP and recreate** `role_business_access` (all business access lost)
4. ❌ **DROP and recreate** `role_contact_type_access` (all contact type access lost)
5. ❌ **DROP and recreate** `role_pipeline_access` (all pipeline access lost)

### What You'll Lose:
- ❌ All user role assignments
- ❌ All business/contact/pipeline access configurations
- ❌ Tenant-specific role definitions

### What You'll Keep:
- ✅ Tenant data
- ✅ User profiles
- ✅ All other tables (contacts, pipelines, businesses, etc.)

---

## 📋 Migration Steps

### Step 1: Apply Migration

```bash
# Apply via Supabase MCP
mcp_supabase_apply_migration(
  project_id: "yvcsxadahzrxuptcgtkg",
  name: "020_fix_global_user_roles",
  query: <migration SQL>
)
```

### Step 2: Verify Global Roles Created

```sql
-- Should return 5 system roles
SELECT role_code, role_name, role_level 
FROM user_roles 
ORDER BY role_level DESC;

-- Expected result:
-- CEO          | CEO                | 5
-- MANAGER      | Manager            | 4
-- LEAD         | Lead               | 3
-- RECRUITER    | Recruiter          | 2
-- READ_ONLY    | Read Only User     | 1
```

### Step 3: Verify Menu Permissions

```sql
-- Check CEO has all menu items
SELECT mi.item_code, rmp.can_access
FROM role_menu_permissions rmp
JOIN menu_items mi ON mi.menu_item_id = rmp.menu_item_id
JOIN user_roles ur ON ur.role_id = rmp.role_id
WHERE ur.role_code = 'CEO';

-- Should return 10 menu items, all with can_access = true
```

### Step 4: Update Edge Functions

Update `createTenantAndProfile` to assign CEO role:

```typescript
// After creating profile
const { data: ceoRole } = await supabaseAdmin
  .from('user_roles')
  .select('role_id')
  .eq('role_code', 'CEO')
  .single();

// Assign CEO role to first user (tenant creator)
await supabaseAdmin
  .from('user_role_assignments')
  .insert({
    user_id: userId,
    role_id: ceoRole.role_id,
    tenant_id: tenantId,
    assigned_by: userId, // Self-assigned during registration
    is_active: true
  });
```

### Step 5: Test Role Assignments

```sql
-- Assign CEO role to a user in a tenant
INSERT INTO user_role_assignments (user_id, role_id, tenant_id, is_active)
VALUES (
  '<user_uuid>',
  (SELECT role_id FROM user_roles WHERE role_code = 'CEO'),
  '<tenant_uuid>',
  true
);

-- Verify assignment
SELECT 
  p.email,
  ur.role_name,
  ura.tenant_id
FROM user_role_assignments ura
JOIN user_roles ur ON ur.role_id = ura.role_id
JOIN profiles p ON p.id = ura.user_id
WHERE ura.user_id = '<user_uuid>';
```

---

## 🧪 Testing Checklist

### Database Testing:

- [ ] Verify 5 global roles exist
- [ ] Verify no `tenant_id` column in `user_roles`
- [ ] Verify `tenant_id` column exists in `user_role_assignments`
- [ ] Verify unique constraints work correctly
- [ ] Verify menu permissions assigned correctly

### Function Testing:

```sql
-- Test get_user_role function
SELECT * FROM get_user_role('<user_id>', '<tenant_id>');

-- Test user_can_access_menu function
SELECT user_can_access_menu('<user_id>', '<tenant_id>', 'DASHBOARD');

-- Test can_assign_role function
SELECT can_assign_role('<ceo_user_id>', '<tenant_id>', 3); -- Should return true
```

### Application Testing:

- [ ] Create new tenant → First user gets CEO role
- [ ] CEO can view all menu items
- [ ] CEO can assign roles to other users
- [ ] Manager can view correct menu items
- [ ] User can have different roles in different tenants (if applicable)

### RLS Policy Testing:

```sql
-- Test as regular user
SET request.jwt.claims.sub = '<user_id>';

-- Should see all global roles
SELECT * FROM user_roles;

-- Should only see own role assignments
SELECT * FROM user_role_assignments;
```

---

## 🔧 Code Updates Needed

### Frontend Components

**Before:**
```javascript
// Getting user role (old)
const { data: role } = await supabase
  .rpc('get_user_role', { p_user_id: userId });
```

**After:**
```javascript
// Getting user role (new) - requires tenant_id
const { data: role } = await supabase
  .rpc('get_user_role', { 
    p_user_id: userId,
    p_tenant_id: tenantId 
  });
```

### All Functions Now Require tenant_id:

1. `get_user_role(user_id, tenant_id)` ✅
2. `user_can_access_menu(user_id, tenant_id, menu_code)` ✅
3. `can_assign_role(assigner_id, tenant_id, role_level)` ✅
4. `get_user_accessible_businesses(user_id, tenant_id)` ✅
5. `get_user_accessible_contact_types(user_id, tenant_id, business_id)` ✅
6. `get_user_accessible_pipelines(user_id, tenant_id, business_id)` ✅

---

## 📊 Impact Analysis

### Tables Affected:

| Table | Impact | Data Loss |
|-------|--------|-----------|
| `user_roles` | ✅ Recreated as global | ⚠️ Old data backed up |
| `user_role_assignments` | ✅ Recreated with tenant_id | ❌ YES - must reassign |
| `role_menu_permissions` | ✅ Recreated | ✅ Repopulated automatically |
| `role_business_access` | ✅ Recreated | ❌ YES - must reconfigure |
| `role_contact_type_access` | ✅ Recreated | ❌ YES - must reconfigure |
| `role_pipeline_access` | ✅ Recreated | ❌ YES - must reconfigure |

### Functions Affected:

| Function | Status | Breaking Change |
|----------|--------|-----------------|
| `get_user_role` | ✅ Updated | ⚠️ YES - new signature |
| `user_can_access_menu` | ✅ Updated | ⚠️ YES - new signature |
| `can_assign_role` | ✅ Updated | ⚠️ YES - new signature |
| `get_user_accessible_businesses` | ✅ Updated | ⚠️ YES - new signature |
| `get_user_accessible_contact_types` | ✅ Updated | ⚠️ YES - new signature |
| `get_user_accessible_pipelines` | ✅ Updated | ⚠️ YES - new signature |
| `get_all_subordinates` | ✅ No change | ✅ Compatible |
| `update_hierarchy_levels` | ✅ No change | ✅ Compatible |

### Edge Functions Affected:

| Edge Function | Required Update |
|---------------|-----------------|
| `createTenantAndProfile` | ✅ Must assign CEO role after profile creation |
| Other functions | ✅ Update function calls with tenant_id parameter |

---

## 🎯 Use Cases Enabled

### Multi-Tenant User Scenario:

**Consultant working with multiple companies:**

```sql
-- User John works with 3 companies
INSERT INTO user_role_assignments (user_id, role_id, tenant_id) VALUES
  -- CEO at Company A
  ('john_uuid', (SELECT role_id FROM user_roles WHERE role_code = 'CEO'), 'company_a_uuid'),
  -- Manager at Company B
  ('john_uuid', (SELECT role_id FROM user_roles WHERE role_code = 'MANAGER'), 'company_b_uuid'),
  -- Recruiter at Company C
  ('john_uuid', (SELECT role_id FROM user_roles WHERE role_code = 'RECRUITER'), 'company_c_uuid');

-- John's permissions:
-- In Company A: Full access (CEO)
-- In Company B: Limited access (Manager)
-- In Company C: Basic access (Recruiter)
```

### System-Wide Permission Updates:

```sql
-- Update CEO permissions globally (affects all tenants)
UPDATE user_roles
SET can_manage_roles = true,
    can_manage_businesses = true
WHERE role_code = 'CEO';

-- Result: All CEOs across all tenants get these permissions ✅
```

---

## 🚀 Deployment Plan

### Pre-Deployment:

1. ✅ Review migration SQL
2. ✅ Understand data loss implications
3. ✅ Plan role reassignment strategy
4. ⚠️ **Backup database** (Supabase auto-backups exist, but verify)
5. ⚠️ Test migration on development branch first

### Deployment:

1. Apply migration `020_fix_global_user_roles.sql` to Supabase
2. Verify 5 global roles created
3. Update `createTenantAndProfile` Edge Function
4. Deploy Edge Function to Supabase
5. Test new tenant creation (first user gets CEO role)

### Post-Deployment:

1. Manually assign roles to existing users (if any)
2. Update frontend code to pass `tenant_id` to functions
3. Test role-based access control
4. Monitor for errors in logs
5. Update documentation

---

## 📚 Additional Resources

### Related Migrations:
- `015_rbac_system.sql` - Original RBAC implementation (REPLACED by this migration)
- `016_seed_system_roles.sql` - Old role seeding (NO LONGER NEEDED)

### Documentation:
- RBAC System Overview: See `RBAC_ARCHITECTURE.md`
- Role Assignment Guide: See `USER_ROLE_MANAGEMENT.md`
- Permission Matrix: See `PERMISSION_MATRIX.md`

---

## ❓ FAQ

### Q: Why are roles global and not tenant-specific?

**A**: Role **definitions** (what permissions a "CEO" has) should be consistent across all tenants. Role **assignments** (who is CEO of which tenant) are tenant-specific. This ensures:
- Consistency: All CEOs have same permissions
- Maintainability: Update permissions once, applies everywhere
- Flexibility: Users can have different roles in different tenants

### Q: Can a user have different roles in different tenants?

**A**: Yes! ✅ With this architecture, a user can be:
- CEO in Tenant A
- Manager in Tenant B
- Recruiter in Tenant C

Each assignment is independent and tenant-specific.

### Q: What if I want tenant-specific role customization?

**A**: You can:
1. Create custom roles (e.g., "CUSTOM_1", "CUSTOM_2") at the global level
2. Assign different menu permissions per role
3. Use `record_permissions` table for granular access control
4. Implement business-level access restrictions

### Q: Will this break existing tenants?

**A**: ⚠️ YES - All role assignments will be lost. However:
- Tenant data remains intact
- User profiles remain intact
- You can reassign roles after migration
- New tenants will work immediately

### Q: Should I run this migration now?

**A**: ⚠️ **Only if**:
- You understand the data loss implications
- You have a plan to reassign roles
- You're willing to update Edge Functions and frontend code
- You want proper multi-tenant RBAC architecture

**Recommendation**: Test on a development branch first!

---

## ✅ Success Criteria

Migration is successful when:

1. ✅ 5 global roles exist in `user_roles` table
2. ✅ No `tenant_id` column in `user_roles`
3. ✅ `tenant_id` column exists in `user_role_assignments`
4. ✅ All menu permissions assigned correctly
5. ✅ All helper functions accept `tenant_id` parameter
6. ✅ New tenants automatically assign CEO role to first user
7. ✅ RLS policies enforce tenant-level access control
8. ✅ Users can be assigned roles in multiple tenants

---

**Status**: ⚠️ **READY TO APPLY**  
**Priority**: 🔴 **CRITICAL ARCHITECTURAL FIX**  
**Next Action**: Test migration on development branch, then apply to production

---

**Created**: October 12, 2025  
**Author**: Database Architecture Review  
**Related Migrations**: `015_rbac_system.sql` (replaced), `020_fix_global_user_roles.sql` (this)

