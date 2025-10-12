# RBAC (Role-Based Access Control) System Documentation

## Overview

The Staffing CRM now includes a comprehensive Role-Based Access Control (RBAC) system that enables fine-grained control over user permissions, data access, and menu navigation. This system is designed with a hierarchical structure supporting five distinct permission levels.

---

## System Architecture

### Hierarchy Levels

The RBAC system uses a 5-level hierarchy:

1. **Level 1 - Read-only User**
   - Can only view records created by recruiters
   - Cannot create, edit, or delete any data
   - Customizable page access
   - No subordinate management capabilities

2. **Level 2 - Recruiter**
   - Can create, view, edit, and delete their own records
   - Cannot see records created by other users
   - Customizable page access
   - No subordinate management capabilities

3. **Level 3 - Lead**
   - Full CRUD on own records
   - Can view, edit, and delete records of assigned subordinates (Recruiters and Read-only users)
   - Scoped to specific businesses
   - Optional contact type and pipeline filtering per business
   - Customizable page access
   - Can assign Recruiter and Read-only roles to subordinates

4. **Level 4 - Manager**
   - Full CRUD on own records
   - Can view, edit, and delete all subordinate records (including Leads, Recruiters, and Read-only users)
   - Scoped to specific businesses
   - Optional contact type and pipeline filtering per business
   - Customizable page access
   - Can assign Lead, Recruiter, and Read-only roles

5. **Level 5 - CEO / Super Admin**
   - Unrestricted access to all data across all businesses
   - Can grant discretionary record-level permissions to any user
   - Access to all pages and features
   - Can assign any role level to any user
   - Can manage the role system itself

---

## Database Schema

### Core Tables

#### `user_roles`
Defines available roles and their permissions.

**Key Columns:**
- `role_name` - Descriptive name (e.g., "CEO", "Manager", "Lead", "Recruiter", "Read-only")
- `hierarchy_level` - Integer 1-5 defining the role's position in the hierarchy
- `can_create_records`, `can_view_own_records`, `can_view_subordinate_records`, `can_view_all_records` - CRUD permission flags
- `can_edit_own_records`, `can_edit_subordinate_records`, `can_edit_all_records`
- `can_delete_own_records`, `can_delete_subordinate_records`, `can_delete_all_records`
- `can_assign_roles`, `can_manage_users`, `can_manage_businesses`, `can_manage_roles` - Management permission flags
- `is_system_role` - Prevents deletion of system-defined roles

#### `menu_items`
Centralized registry of all application pages/routes for permission assignment.

**Key Columns:**
- `page_name` - Display name (e.g., "Dashboard", "Contacts", "Pipelines")
- `route_path` - URL path (e.g., "/dashboard", "/contacts")
- `icon` - Icon identifier for UI rendering
- `is_admin_only` - Marks pages that require CEO/admin access

#### `user_role_assignments`
Maps users to their assigned roles with time-based validity.

**Key Columns:**
- `user_id` - Foreign key to `profiles`
- `role_id` - Foreign key to `user_roles`
- `assigned_by` - User who made the assignment (audit trail)
- `valid_from`, `valid_until` - Date range for role validity
- `is_active` - Computed field based on current date vs validity range

#### `role_menu_permissions`
Defines which pages each role can access.

**Key Columns:**
- `role_id` - Foreign key to `user_roles`
- `menu_item_id` - Foreign key to `menu_items`

#### `role_business_access`
Scopes Lead and Manager roles to specific businesses.

**Key Columns:**
- `assignment_id` - Foreign key to `user_role_assignments`
- `business_id` - Foreign key to `businesses`

#### `role_contact_type_access`
Optional filtering of contact types within assigned businesses.

**Key Columns:**
- `assignment_id` - Foreign key to `user_role_assignments`
- `contact_type_id` - Foreign key to `contact_types`

#### `role_pipeline_access`
Optional filtering of pipelines within assigned businesses.

**Key Columns:**
- `assignment_id` - Foreign key to `user_role_assignments`
- `pipeline_id` - Foreign key to `pipelines`

#### `user_hierarchy`
Tracks manager-subordinate relationships with recursive path support.

**Key Columns:**
- `manager_id` - User who manages the subordinate
- `subordinate_id` - User being managed
- `hierarchy_path` - Materialized path for efficient recursive queries

#### `record_permissions`
CEO-granted discretionary permissions for specific records.

**Key Columns:**
- `user_id` - User receiving the permission
- `record_type` - Type of record (e.g., "contact", "pipeline")
- `record_id` - ID of the specific record
- `can_view`, `can_edit`, `can_delete` - Permission flags
- `granted_by` - CEO who granted the permission

---

## Helper Functions

### Permission Checking

#### `get_user_role(p_user_id UUID)`
Returns the current active role for a user.

**Returns:** `user_roles` record or NULL if no active role

#### `user_can_access_menu(p_user_id UUID, p_route_path TEXT)`
Checks if a user has permission to access a specific page.

**Returns:** BOOLEAN

#### `can_assign_role(p_assigner_id UUID, p_role_id UUID)`
Validates if a user can assign a specific role based on hierarchy.

**Returns:** BOOLEAN

**Rules:**
- CEO (Level 5) can assign any role
- Manager (Level 4) can assign Levels 1-3
- Lead (Level 3) can assign Levels 1-2
- Lower levels cannot assign roles

### Data Scoping

#### `get_all_subordinates(p_manager_id UUID)`
Returns all subordinates of a manager (direct and indirect).

**Returns:** TABLE of user IDs

**Uses:** Recursive query on `user_hierarchy.hierarchy_path`

#### `get_user_accessible_businesses(p_user_id UUID)`
Returns business IDs accessible to the user based on role scoping.

**Returns:** TABLE of business IDs

**Logic:**
- CEO: All businesses in tenant
- Manager/Lead: Assigned businesses from `role_business_access`
- Others: All businesses in tenant

#### `get_user_accessible_contact_types(p_user_id UUID)`
Returns contact type IDs accessible to the user.

**Returns:** TABLE of contact type IDs

**Logic:**
- If no specific types assigned: All types in accessible businesses
- Otherwise: Assigned types from `role_contact_type_access`

#### `get_user_accessible_pipelines(p_user_id UUID)`
Returns pipeline IDs accessible to the user.

**Returns:** TABLE of pipeline IDs

**Logic:**
- If no specific pipelines assigned: All pipelines in accessible businesses
- Otherwise: Assigned pipelines from `role_pipeline_access`

---

## Row-Level Security (RLS) Policies

### Contacts Table

#### `contacts_select_rbac`
**Permission Logic:**
- **Level 1 (Read-only):** Can view contacts where `recruiter_id` is not NULL
- **Level 2 (Recruiter):** Can view only own contacts (`recruiter_id = user_id`)
- **Level 3 (Lead):** Can view own + subordinates' contacts, filtered by business/contact type scope
- **Level 4 (Manager):** Can view own + all subordinates' contacts, filtered by business/contact type scope
- **Level 5 (CEO):** Can view all contacts in tenant

#### `contacts_insert_rbac`
**Permission Logic:**
- Requires `can_create_records = true`
- Must insert into accessible business
- Must use accessible contact type
- Auto-sets `recruiter_id` to current user
- Auto-sets `tenant_id` from user profile

#### `contacts_update_rbac`
**Permission Logic:**
- **Own records:** Requires `can_edit_own_records = true` AND `recruiter_id = user_id`
- **Subordinate records:** Requires `can_edit_subordinate_records = true` AND contact owner is a subordinate
- **All records:** Requires `can_edit_all_records = true` (CEO only)
- Must respect business/contact type scoping

#### `contacts_delete_rbac`
**Permission Logic:**
- Same hierarchy as update, but checks `can_delete_*` flags
- CEO can delete any contact in tenant

### Pipelines Table

Similar policies applied to pipelines:
- `pipelines_select_rbac`
- `pipelines_insert_rbac`
- `pipelines_update_rbac`
- `pipelines_delete_rbac`

**Note:** Only Level 4+ (Manager and CEO) can manage pipelines.

### Contact Pipeline Assignments

Assignment visibility inherits from the underlying contact record.

---

## User Interface Components

### 1. User Roles Management Page

**File:** `src/components/DataAdministration/UserRoles/UserRolesManagement.jsx`

**Access:** CEO / Super Admin only

**Features:**
- **Create New Roles:**
  - Define role name and description
  - Set hierarchy level (1-5)
  - Configure granular permissions (create, view, edit, delete with own/subordinate/all scopes)
  - Set management permissions (assign roles, manage users, manage businesses)
  - Select accessible pages from menu items list
  - Select All / Deselect All shortcuts for menu permissions

- **Edit Existing Roles:**
  - Modify all role properties
  - Update permission flags
  - Change menu access configuration
  - System roles cannot be deleted but can be edited

- **Delete Roles:**
  - Remove custom roles (system roles protected)
  - Confirmation prompt before deletion

- **Visual Display:**
  - Role cards showing name, level, description
  - Permission summary tags
  - Color-coded level badges
  - System role indicators

### 2. Assign User Roles Page

**File:** `src/components/DataAdministration/UserRoles/AssignUserRoles.jsx`

**Access:** CEO, Managers, Leads (based on `can_assign_roles` permission)

**Features:**
- **User List View:**
  - Table displaying all users in tenant
  - Shows current role assignment
  - Displays role level and validity dates
  - Shows business scope (if applicable)
  - Current user highlighted

- **Assign/Change Role:**
  - Modal form for role assignment
  - Role selection (filtered by current user's level)
  - Validity date range (from/until)
  - Business scope configuration (for Level 3-4)
  - Contact type filtering (optional, within selected businesses)
  - Pipeline filtering (optional, within selected businesses)
  - Hierarchical assignment enforcement

- **Remove Role:**
  - Unassign user from role
  - Confirmation prompt
  - Removes all associated scoping (business/contact type/pipeline access)

- **Business Scoping UI:**
  - Multi-select for businesses
  - Dynamic loading of contact types based on selected businesses
  - Dynamic loading of pipelines based on selected businesses
  - Clear indication of required vs optional fields

---

## Integration Guide

### Step 1: Apply Database Migrations

Run these migrations in order:

```sql
-- Migration 015: RBAC Schema
supabase migration up 015_rbac_system.sql

-- Migration 016: RBAC RLS Policies
supabase migration up 016_rbac_data_policies.sql
```

### Step 2: Seed Menu Items

The migration automatically seeds menu items. Verify by querying:

```sql
SELECT * FROM menu_items ORDER BY sort_order;
```

### Step 3: Create Default Roles

Default system roles are auto-created:
- CEO (Level 5)
- Manager (Level 4)
- Lead (Level 3)
- Recruiter (Level 2)
- Read-only (Level 1)

### Step 4: Assign CEO Role to Admin User

```sql
-- Get your admin user ID
SELECT id, email FROM auth.users WHERE email = 'admin@example.com';

-- Assign CEO role
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
SELECT 
  '<admin_user_id>', 
  id, 
  '<admin_user_id>'
FROM user_roles WHERE role_name = 'CEO';
```

### Step 5: Add Routes to Application

Update your routing configuration to include:

```jsx
import UserRolesManagement from './components/DataAdministration/UserRoles/UserRolesManagement';
import AssignUserRoles from './components/DataAdministration/UserRoles/AssignUserRoles';

// Add to your routes
{
  path: '/data-administration/user-roles',
  element: <UserRolesManagement />
},
{
  path: '/data-administration/assign-roles',
  element: <AssignUserRoles />
}
```

### Step 6: Update Navigation Menu

Add menu items to your sidebar/navigation:

```jsx
// In your navigation component
const dataAdminMenuItems = [
  // ... existing items
  {
    name: 'User Roles',
    path: '/data-administration/user-roles',
    icon: '🔐',
    requiresCEO: true // Only show to CEO
  },
  {
    name: 'Assign Roles',
    path: '/data-administration/assign-roles',
    icon: '👥',
    requiresPermission: 'can_assign_roles' // Show to users who can assign roles
  }
];
```

---

## Usage Examples

### Example 1: Create a Regional Manager Role

1. Navigate to **User Roles Management**
2. Click **Create New Role**
3. Fill in:
   - **Role Name:** "Regional Manager"
   - **Description:** "Manages specific regional businesses"
   - **Hierarchy Level:** 4 (Manager)
4. Configure Permissions:
   - ✅ Can Create Records
   - ✅ Can View Own Records
   - ✅ Can View Subordinate Records
   - ✅ Can Edit Own Records
   - ✅ Can Edit Subordinate Records
   - ✅ Can Delete Own Records
   - ✅ Can Delete Subordinate Records
   - ✅ Can Assign Roles
5. Select Pages:
   - ✅ Dashboard
   - ✅ Contacts
   - ✅ Pipelines
   - ✅ Businesses
   - ✅ Assign Roles
6. Click **Create Role**

### Example 2: Assign Regional Manager to User

1. Navigate to **Assign User Roles**
2. Find the user in the table
3. Click the **➕** or **✏️** button
4. Select **Regional Manager** role
5. Set validity dates (e.g., From: today, Until: end of year)
6. Select accessible businesses:
   - ✅ East Region Office
   - ✅ West Region Office
7. Optionally filter contact types:
   - ✅ Software Engineers
   - ✅ Project Managers
8. Optionally filter pipelines:
   - ✅ Tech Recruiting Pipeline
9. Click **Assign Role**

### Example 3: CEO Grants Access to Specific Contact

```sql
-- CEO wants to grant Jane (a Recruiter) access to view/edit a specific high-value contact
-- even though the contact was created by another recruiter

INSERT INTO record_permissions (
  user_id, 
  record_type, 
  record_id, 
  can_view, 
  can_edit, 
  granted_by
)
VALUES (
  '<jane_user_id>',
  'contact',
  '<high_value_contact_id>',
  true,
  true,
  '<ceo_user_id>'
);
```

---

## Permission Matrix

| Role Level | View Own | View Sub | View All | Edit Own | Edit Sub | Edit All | Delete Own | Delete Sub | Delete All | Assign Roles |
|------------|----------|----------|----------|----------|----------|----------|------------|------------|------------|--------------|
| 1 - Read-only | ❌ | ❌ | ❌* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 2 - Recruiter | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 3 - Lead | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ (1-2) |
| 4 - Manager | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ (1-3) |
| 5 - CEO | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (All) |

*Read-only users can view records where `recruiter_id IS NOT NULL`

---

## Security Considerations

### RLS Enforcement
- All RBAC tables have Row-Level Security enabled
- CEO-level policies ensure only authorized users can modify role definitions
- Assignment policies prevent users from escalating their own privileges

### Audit Trail
- `user_role_assignments.assigned_by` tracks who assigned each role
- `record_permissions.granted_by` tracks CEO discretionary grants
- All tables have `created_at` and `updated_at` timestamps

### Role Hierarchy Validation
- Database function `can_assign_role()` enforces hierarchical assignment rules
- Users cannot assign roles at or above their own level (except CEO)
- Frontend validates role selection based on current user's level

### Time-Based Validity
- `valid_from` and `valid_until` ensure roles expire automatically
- `is_active` computed column determines current validity
- RLS policies respect validity dates

### Business Scoping
- Leads and Managers are restricted to assigned businesses
- Contact type and pipeline filtering adds additional data isolation
- RLS policies enforce scoping at the database level

---

## Testing Checklist

### Level 1 - Read-only User
- [ ] Can view contacts with non-NULL `recruiter_id`
- [ ] Cannot create contacts
- [ ] Cannot edit any contacts
- [ ] Cannot delete any contacts
- [ ] Can access only assigned pages
- [ ] Cannot access User Roles or Assign Roles pages

### Level 2 - Recruiter
- [ ] Can create contacts (auto-assigned as `recruiter_id`)
- [ ] Can view only own contacts
- [ ] Cannot view other recruiters' contacts
- [ ] Can edit own contacts
- [ ] Can delete own contacts
- [ ] Can access only assigned pages
- [ ] Cannot assign roles to others

### Level 3 - Lead
- [ ] Can create contacts
- [ ] Can view own + subordinates' contacts
- [ ] Can edit own + subordinates' contacts
- [ ] Can delete own + subordinates' contacts
- [ ] Contacts filtered by assigned businesses
- [ ] Contacts filtered by assigned contact types (if configured)
- [ ] Can assign Recruiter and Read-only roles
- [ ] Cannot assign Manager or CEO roles
- [ ] Can access assigned pages

### Level 4 - Manager
- [ ] Can create contacts
- [ ] Can view own + all subordinates' contacts (including Leads' subordinates)
- [ ] Can edit own + all subordinates' contacts
- [ ] Can delete own + all subordinates' contacts
- [ ] Contacts filtered by assigned businesses
- [ ] Can manage pipelines in assigned businesses
- [ ] Can assign Lead, Recruiter, and Read-only roles
- [ ] Cannot assign Manager or CEO roles
- [ ] Can access assigned pages

### Level 5 - CEO
- [ ] Can view all contacts across all businesses
- [ ] Can edit any contact
- [ ] Can delete any contact
- [ ] Can manage all pipelines
- [ ] Can assign any role to any user
- [ ] Can access all pages
- [ ] Can create/edit/delete roles
- [ ] Can grant discretionary record permissions

### Hierarchical Assignment
- [ ] CEO can assign any role (1-5)
- [ ] Manager can assign roles 1-3 only
- [ ] Lead can assign roles 1-2 only
- [ ] Recruiter and Read-only cannot assign roles
- [ ] Users cannot escalate their own role

### Business Scoping
- [ ] Lead sees only contacts in assigned businesses
- [ ] Manager sees only contacts in assigned businesses
- [ ] CEO sees contacts in all businesses
- [ ] Contact type filtering works correctly
- [ ] Pipeline filtering works correctly

### Time-Based Validity
- [ ] Role active when current date is within valid_from and valid_until
- [ ] Role inactive before valid_from date
- [ ] Role inactive after valid_until date
- [ ] NULL valid_until means no expiration

---

## Troubleshooting

### User Cannot See Any Data

**Possible Causes:**
1. No role assigned
2. Role expired (past `valid_until` date)
3. Business scope too restrictive
4. No subordinates assigned (for Lead/Manager viewing subordinate data)

**Solution:**
- Check `user_role_assignments` for active assignment
- Verify business access in `role_business_access`
- Check `user_hierarchy` for manager-subordinate relationships

### User Can Assign Higher-Level Roles

**Possible Causes:**
1. User has CEO role
2. RLS policies not applied
3. `can_assign_role()` function missing

**Solution:**
- Verify migrations applied: `SELECT * FROM user_roles;`
- Test function: `SELECT can_assign_role('<user_id>', '<role_id>');`
- Re-apply migration 015 if needed

### Menu Items Not Filtering

**Possible Causes:**
1. `menu_items` table not populated
2. `role_menu_permissions` not set for role
3. Frontend not using `user_can_access_menu()` function

**Solution:**
- Verify menu items: `SELECT * FROM menu_items;`
- Check role permissions: `SELECT * FROM role_menu_permissions WHERE role_id = '<role_id>';`
- Ensure frontend calls Supabase RPC `user_can_access_menu`

### Lead/Manager Cannot See Subordinate Data

**Possible Causes:**
1. Subordinate relationships not configured in `user_hierarchy`
2. Business scope mismatch (subordinate works in different business)
3. RLS policies not considering hierarchy

**Solution:**
- Insert hierarchy: `INSERT INTO user_hierarchy (manager_id, subordinate_id) VALUES ('<manager>', '<subordinate>');`
- Verify business access alignment
- Test function: `SELECT * FROM get_all_subordinates('<manager_id>');`

---

## Future Enhancements

### Phase 2 Features
- [ ] **Role Templates:** Pre-configured role templates for common scenarios
- [ ] **Bulk Role Assignment:** Assign roles to multiple users at once
- [ ] **Role Approval Workflow:** Require CEO approval for sensitive role changes
- [ ] **Permission Analytics:** Dashboard showing permission usage and role distribution
- [ ] **Time-Limited Access:** Auto-revoke permissions after specified duration
- [ ] **Role History:** Track all role changes for compliance/audit

### Phase 3 Features
- [ ] **Attribute-Based Access Control (ABAC):** Add conditions based on user attributes
- [ ] **Dynamic Role Assignment:** Auto-assign roles based on user properties
- [ ] **Custom Permission Rules:** Create complex permission logic beyond hierarchy
- [ ] **Integration with SSO:** Sync roles from external identity providers
- [ ] **API Key Management:** Role-based API access control
- [ ] **Mobile App Permissions:** Extend RBAC to mobile applications

---

## Appendix: SQL Queries

### Find All Users with CEO Role
```sql
SELECT p.email, p.full_name, ura.valid_from, ura.valid_until
FROM profiles p
JOIN user_role_assignments ura ON p.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE ur.role_name = 'CEO'
  AND ura.is_active = true;
```

### Get User's Current Permissions
```sql
SELECT * FROM user_permissions WHERE user_id = '<user_id>';
```

### List All Subordinates of a Manager
```sql
SELECT p.email, p.full_name
FROM get_all_subordinates('<manager_id>') sub
JOIN profiles p ON sub.subordinate_id = p.id;
```

### Check if User Can Access a Page
```sql
SELECT user_can_access_menu('<user_id>', '/contacts');
```

### Find Users Without Role Assignments
```sql
SELECT p.id, p.email, p.full_name
FROM profiles p
LEFT JOIN user_role_assignments ura ON p.id = ura.user_id AND ura.is_active = true
WHERE ura.id IS NULL;
```

### Get All Contacts Visible to a User
```sql
-- This query is handled automatically by RLS, but for testing:
SELECT c.*
FROM contacts c
WHERE 
  -- Level 5: All contacts
  (SELECT ur.hierarchy_level FROM get_user_role('<user_id>') ur) = 5
  OR
  -- Level 4: Own + all subordinates in accessible businesses
  (
    (SELECT ur.hierarchy_level FROM get_user_role('<user_id>') ur) = 4
    AND c.business_id IN (SELECT business_id FROM get_user_accessible_businesses('<user_id>'))
    AND (
      c.recruiter_id = '<user_id>'
      OR c.recruiter_id IN (SELECT subordinate_id FROM get_all_subordinates('<user_id>'))
    )
  )
  -- ... (similar logic for levels 3, 2, 1)
;
```

---

## Support and Maintenance

For questions or issues with the RBAC system:

1. **Check this documentation** for common scenarios and troubleshooting
2. **Review migration files** for database schema details
3. **Test with SQL queries** to isolate database vs UI issues
4. **Check browser console** for frontend errors
5. **Review Supabase logs** for RLS policy violations

**Related Files:**
- Database: `supabase/migrations/015_rbac_system.sql`, `016_rbac_data_policies.sql`
- Frontend: `src/components/DataAdministration/UserRoles/UserRolesManagement.jsx`, `AssignUserRoles.jsx`
- Documentation: `PROJECT_REQUIREMENTS_SUMMARY.md` (main requirements), `RBAC_SYSTEM.md` (this file)

---

*Last Updated: [Current Date]*
*Version: 1.0*
