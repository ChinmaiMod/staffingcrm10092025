# Database Migration Status Report
**Generated:** October 12, 2025  
**Project:** OJosh_CRM  
**Project ID:** yvcsxadahzrxuptcgtkg

---

## Current Migration Status

### ✅ Migrations Already Applied

| #   | File Name | Status | Notes |
|-----|-----------|--------|-------|
| 000 | clean_reset | ✅ Applied | Initial reset |
| 001 | initial_schema | ✅ Applied | Tenants, profiles, subscriptions, payments |
| 002 | rls_policies | ✅ Applied | Row Level Security policies |
| 003 | update_profile_status | ✅ Applied | Profile status field |
| 005 | tenant_invites | ✅ Applied | Tenant invitation system |
| 006 | super_admin_policies | ✅ Applied | Super admin RLS |
| **007** | **crm_contacts_schema** | ✅ **Manually Applied** | Contacts + lookup tables exist |
| **011** | **businesses_multi_business_support** | ✅ **Manually Applied** | Businesses table exists |
| 012 | user_feedback | ✅ Applied | User feedback system |
| 013 | issue_reports | ✅ Applied | Issue reporting system |
| 014 | fix_registration_rls | ✅ Applied | Registration RLS fix |

### ❌ Migrations NOT Applied

| #   | File Name | Status | Blocker |
|-----|-----------|--------|---------|
| 008 | contact_status_history | ❌ Not Applied | Ready to apply |
| 010 | pipelines_schema | ❌ Not Applied | **Schema mismatch** - uses UUID, your DB uses bigint |
| 015 | rbac_system | ❌ Not Applied | **Schema mismatch** - needs bigint compatibility |
| 016 | rbac_data_policies | ❌ Not Applied | Depends on 010 and 015 |

---

## Schema Compatibility Issues

### Your Current Schema (Existing Tables)

```sql
-- Uses BIGINT for IDs
contacts:
  - id: bigint (NOT contact_id)
  - tenant_id: bigint
  - business_id: bigint

businesses:
  - id: bigint (NOT business_id)
  - tenant_id: bigint

-- Uses UUID for IDs
profiles:
  - id: uuid
  - tenant_id: uuid

tenants:
  - tenant_id: uuid
```

### Migration Files Schema (New Tables)

```sql
-- Migration 010, 015, 016 use UUID for everything
pipelines:
  - pipeline_id: uuid  ❌ Incompatible
  - tenant_id: uuid   ❌ Incompatible (should be bigint)
  - business_id: uuid ❌ Incompatible (should reference bigint)

contact_pipeline_assignments:
  - contact_id: uuid  ❌ Incompatible (should be bigint)
  - pipeline_id: uuid
```

---

## Tables Currently in Database

### ✅ Existing Tables (Verified via Supabase MCP)

**Core Tables:**
- `tenants` (uuid)
- `profiles` (uuid)
- `subscriptions`, `payments`, `promo_codes`
- `email_tokens`, `audit_logs`
- `tenant_invites`, `user_feedback`, `issue_reports`

**CRM Tables (from migration 007):**
- `contacts` (bigint IDs)
- `visa_status`, `job_title`, `workflow_status`
- `type_of_contact`, `reason_for_contact`, `type_of_roles`
- `referral_sources`, `users` (old table)

**Business Tables (from migration 011):**
- `businesses` (bigint IDs)
- `business_folders`, `business_documents`

### ❌ Missing Tables

- `contact_status_history` (migration 008)
- `pipelines`, `pipeline_stages`, `contact_pipeline_assignments`, `pipeline_stage_history` (migration 010)
- All RBAC tables (migration 015):
  - `user_roles`, `menu_items`, `role_menu_permissions`
  - `user_role_assignments`, `role_business_access`
  - `role_contact_type_access`, `role_pipeline_access`
  - `user_hierarchy`, `record_permissions`

---

## Required Actions

### Option 1: Apply Migration 008 (Safe - No Dependencies)

Migration 008 should work as-is since it references contacts by `contact_id` which we can modify to `id`.

**Action:** Apply modified version of 008_contact_status_history.sql

### Option 2: Fix Pipelines Migration (010)

**Problem:** Migration uses `uuid` for IDs but your schema uses `bigint`

**Solutions:**

**A) Modify Migration 010** (Recommended)
- Change all `uuid` to `bigint` for IDs
- Change `tenant_id` references from `uuid` to `bigint`
- Change `contact_id` references to match your `contacts.id` (bigint)
- Keep `profiles.id` references as `uuid` (for created_by, etc.)

**B) Keep Migration 010 As-Is**
- Creates pipelines with `uuid` IDs
- Creates incompatibility with RBAC which expects `bigint` business references

### Option 3: Fix RBAC Migrations (015, 016)

**Problem:** RBAC migrations expect:
- `businesses(business_id)` as `uuid`
- `pipelines(pipeline_id)` as `uuid`
- `contacts(contact_id)` as `uuid`

**But your actual tables use:**
- `businesses(id)` as `bigint`
- `contacts(id)` as `bigint`

**Solution:** Create modified RBAC migrations:
- Change foreign key references to `bigint` for businesses and contacts
- Change table references from `business_id` to `id`, `contact_id` to `id`
- Keep `profiles` and `tenants` references as `uuid`

---

## Recommended Plan

### Step 1: Apply Contact Status History (Low Risk)
Create modified version of migration 008 that uses `contacts.id` instead of `contact_id`.

### Step 2: Decision Point - UUID vs BIGINT

**Choose ONE:**

#### Path A: Convert to BIGINT (Matches Your Schema)
1. Modify migration 010 to use `bigint` IDs
2. Modify migrations 015 & 016 to reference `bigint` for contacts/businesses
3. Apply all three modified migrations

**Pros:**
- Consistent with existing schema
- Simpler foreign key references
- No data migration needed

**Cons:**
- Deviates from original migration files
- Need to maintain modified versions

#### Path B: Convert Existing Tables to UUID (Major Change)
1. Create migration to convert contacts and businesses to UUID
2. Update all foreign key references
3. Migrate existing data
4. Apply migrations 010, 015, 016 as-is

**Pros:**
- Uses original migration files
- UUID is more standard for distributed systems

**Cons:**
- **RISKY** - requires data migration
- Could break existing application code
- More complex rollback

### Step 3: Apply Remaining Migrations

Once schema compatibility is resolved:
1. Apply migration 008 (contact status history)
2. Apply migration 010 (pipelines)
3. Apply migration 015 (RBAC system)
4. Apply migration 016 (RBAC data policies)

---

## Next Steps (My Recommendation)

### Immediate Action: Path A (BIGINT Compatibility)

I recommend **Path A** because:
1. Your app is already built around `bigint` IDs
2. Less risky than converting existing tables
3. Faster to implement

I can create modified versions of migrations 008, 010, 015, and 016 that:
- Use `bigint` for contacts, businesses IDs
- Reference correct column names (`id` not `contact_id`, `business_id`)
- Keep `uuid` for profiles and tenants
- Maintain all RBAC functionality

**Would you like me to create these modified migration files for you?**

---

## Files to Create/Modify

If you approve Path A, I will create:

1. `008_contact_status_history_FIXED.sql` - Modified to use `contacts.id`
2. `010_pipelines_schema_FIXED.sql` - Changed to use `bigint` IDs
3. `015_rbac_system_FIXED.sql` - Changed to reference `bigint` for businesses/contacts
4. `016_rbac_data_policies_FIXED.sql` - Updated to match fixed schema

These files will be placed in `supabase/migrations/` with clear naming to indicate they're the corrected versions.

---

## Verification Queries

After applying each migration, run these to verify:

### After 008:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'contact_status_history'
);
```

### After 010:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pipelines', 'pipeline_stages', 'contact_pipeline_assignments');
```

### After 015:
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_roles', 'menu_items', 'role_menu_permissions',
  'user_role_assignments', 'role_business_access',
  'user_hierarchy', 'record_permissions'
);
-- Should return 7
```

### After 016:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('contacts', 'pipelines')
AND policyname LIKE '%rbac%'
ORDER BY tablename, policyname;
```

---

**Ready to proceed?** Let me know if you want me to create the modified migration files (Path A - BIGINT compatibility).
