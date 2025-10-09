# Complete Migration Guide - All SQL Files to Run

## 📋 Overview

This document lists **ALL** SQL migration files that need to be applied to your Supabase database in the correct order.

---

## ✅ Migration Files (In Order)

### Core Schema Migrations

#### 1. **000_clean_reset.sql** (OPTIONAL - Only for Fresh Start)
**When to use:** Only if you want to completely reset your database  
**What it does:** Drops all existing tables  
**⚠️ WARNING:** This will delete ALL data  

```sql
-- Skip this unless starting fresh
```

---

#### 2. **001_initial_schema.sql** ✅ REQUIRED
**Status:** Should already be applied  
**What it creates:**
- `tenants` table
- `profiles` table
- `email_tokens` table
- `subscriptions` table
- `payments` table
- `promo_codes` table
- `audit_logs` table

**How to check if applied:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'profiles', 'subscriptions');
```

---

#### 3. **002_rls_policies.sql** ✅ REQUIRED
**Status:** Should already be applied  
**What it creates:**
- Row Level Security policies for core tables
- Tenant isolation rules

**How to check if applied:**
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('tenants', 'profiles', 'subscriptions');
```

---

#### 4. **003_update_profile_status.sql** ✅ REQUIRED
**Status:** Should already be applied  
**What it does:**
- Updates profile status handling
- Adds status transition logic

---

### Module-Specific Migrations

#### 5. **005_tenant_invites.sql** ✅ REQUIRED
**What it creates:**
- `tenant_invites` table
- Invitation system for team members

---

#### 6. **006_super_admin_policies.sql** ✅ REQUIRED
**What it does:**
- Super admin access policies
- Cross-tenant administrative access

---

### CRM Migrations

#### 7. **007_crm_contacts_schema.sql** ✅ REQUIRED
**What it creates:**
- ✅ `contacts` table
- ✅ `visa_status` table
- ✅ `job_titles` table
- ✅ `reasons_for_contact` table
- ✅ `contact_statuses` table
- ✅ `role_types` table
- ✅ `countries` table (with USA, India data)
- ✅ `states` table (with all US states and India states)
- ✅ `cities` table
- ✅ `years_experience` table
- ✅ `referral_sources` table
- ✅ `contact_reasons` table (many-to-many)
- ✅ `contact_role_types` table (many-to-many)
- ✅ `contact_attachments` table
- ✅ `contact_comments` table
- ✅ `email_templates` table
- ✅ `notification_configs` table

**How to check if applied:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contacts', 'job_titles', 'visa_status', 'contact_statuses');
```

---

#### 8. **008_contact_status_history.sql** ✅ REQUIRED
**What it creates:**
- ✅ `contact_status_history` table
- ✅ Status change tracking with mandatory remarks
- ✅ Triggers for auto-logging status changes

**Features:**
- Complete audit trail of all status changes
- Mandatory remarks when status changes
- Immutable history records

---

### Critical Pending Migrations ⏳

#### 9. **009_fix_registration_rls.sql** ⚠️ NOT YET APPLIED
**Status:** **MUST APPLY - Blocks Registration**  
**What it fixes:**
- Adds INSERT policies for new user registration
- Fixes "Failed to create company profile" error
- Allows users to create tenant and profile during signup

**Why it's needed:**
Without this, new users cannot register accounts.

**How to apply:**
1. Open: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/sql/new
2. Copy contents of `009_fix_registration_rls.sql`
3. Paste and click "Run"

---

#### 10. **010_pipelines_schema.sql** ⚠️ NOT YET APPLIED
**Status:** **MUST APPLY - Blocks Pipelines Feature**  
**What it creates:**
- ✅ `pipelines` table
- ✅ `pipeline_stages` table
- ✅ `contact_pipeline_assignments` table
- ✅ `pipeline_stage_history` table
- ✅ 20+ RLS policies
- ✅ Triggers for stage tracking
- ✅ Helper functions for analytics

**Features:**
- Full pipeline management
- Kanban-style pipeline views
- Drag-and-drop contact movement
- Stage history tracking
- Pipeline analytics

**How to apply:**
1. Open Supabase SQL Editor
2. Copy entire contents of `010_pipelines_schema.sql` (500+ lines)
3. Paste and click "Run"

---

#### 11. **011_businesses_multi_business_support.sql** ⚠️ NOT YET APPLIED
**Status:** **MUST APPLY - Enables Multi-Business**  
**What it creates:**
- ✅ `businesses` table
- ✅ Adds `business_id` to all CRM tables
- ✅ Updates RLS policies for business-level filtering
- ✅ Migration helper functions
- ✅ Sample data examples

**Features:**
- Multiple businesses per tenant
- Business-specific contact types
- Business-specific job titles
- Business-specific pipelines
- IT and Healthcare division separation

**How to apply:**
1. Open Supabase SQL Editor
2. Copy entire contents of `011_businesses_multi_business_support.sql` (500+ lines)
3. Paste and click "Run"

---

## 🎯 Quick Application Checklist

### Already Applied ✅
- [x] 001_initial_schema.sql
- [x] 002_rls_policies.sql
- [x] 003_update_profile_status.sql
- [x] 005_tenant_invites.sql
- [x] 006_super_admin_policies.sql
- [x] 007_crm_contacts_schema.sql
- [x] 008_contact_status_history.sql

### Need to Apply Now ⏳
- [ ] **009_fix_registration_rls.sql** - CRITICAL for registration
- [ ] **010_pipelines_schema.sql** - Required for pipelines feature
- [ ] **011_businesses_multi_business_support.sql** - NEW: Multi-business support

---

## 🚀 Step-by-Step Application Process

### Step 1: Apply Migration 009 (Registration Fix)

```sql
-- Open: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/sql/new
-- Copy and paste contents of: 009_fix_registration_rls.sql
-- Click "Run"
```

**Verify Success:**
```sql
-- Check if policies exist
SELECT policyname FROM pg_policies 
WHERE tablename IN ('tenants', 'profiles') 
AND policyname LIKE '%insert%';
```

Expected results:
- `tenants_insert_own`
- `profiles_insert_own`

---

### Step 2: Apply Migration 010 (Pipelines)

```sql
-- Copy and paste contents of: 010_pipelines_schema.sql
-- Click "Run"
```

**Verify Success:**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pipelines', 'pipeline_stages', 'contact_pipeline_assignments', 'pipeline_stage_history');
```

Expected: All 4 tables should exist

---

### Step 3: Apply Migration 011 (Multi-Business) **NEW**

```sql
-- Copy and paste contents of: 011_businesses_multi_business_support.sql
-- Click "Run"
```

**Verify Success:**
```sql
-- Check if businesses table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'businesses';

-- Check if business_id added to contacts
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name = 'business_id';
```

---

### Step 4: Create Your Businesses **NEW**

After applying migration 011, create your businesses:

```sql
-- Get your tenant_id
SELECT tenant_id, company_name FROM tenants;

-- Create IT Staffing Business
INSERT INTO businesses (
  tenant_id,
  business_name,
  business_type,
  description,
  industry,
  enabled_contact_types,
  is_default
) VALUES (
  'YOUR_TENANT_ID_HERE',
  'IT Staffing Division',
  'IT_STAFFING',
  'Technology and IT staffing services',
  'Technology',
  ARRAY['IT_CANDIDATE','VENDOR_CLIENT','EMPLOYEE_INDIA','EMPLOYEE_USA'],
  true
);

-- Create Healthcare Staffing Business
INSERT INTO businesses (
  tenant_id,
  business_name,
  business_type,
  description,
  industry,
  enabled_contact_types,
  is_default
) VALUES (
  'YOUR_TENANT_ID_HERE',
  'Healthcare Staffing Division',
  'HEALTHCARE_STAFFING',
  'Healthcare and medical staffing services',
  'Healthcare',
  ARRAY['HEALTHCARE_CANDIDATE','VENDOR_CLIENT','EMPLOYEE_USA'],
  false
);

-- Migrate existing data to default business
SELECT migrate_to_default_business();
```

---

## 📊 Verification Queries

### Check All Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Tables (Minimum):**
- audit_logs
- businesses ← NEW
- cities
- contact_attachments
- contact_comments
- contact_pipeline_assignments ← NEW
- contact_reasons
- contact_role_types
- contact_status_history
- contact_statuses
- contacts
- countries
- email_templates
- email_tokens
- job_titles
- notification_configs
- payments
- pipeline_stage_history ← NEW
- pipeline_stages ← NEW
- pipelines ← NEW
- profiles
- promo_codes
- reasons_for_contact
- referral_sources
- role_types
- states
- subscriptions
- tenant_invites
- tenants
- visa_status
- years_experience

---

### Check RLS Policies

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Should see policies for:**
- All tables with tenant/business isolation
- INSERT policies for registration
- Business-level filtering policies

---

### Check Helper Functions

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**Expected Functions:**
- `ensure_default_business()` ← NEW
- `ensure_default_pipeline()`
- `get_default_business(uuid)` ← NEW
- `get_pipeline_stats(uuid)`
- `get_tenant_businesses(uuid)` ← NEW
- `migrate_to_default_business()` ← NEW
- `move_contact_to_stage(...)`
- `track_pipeline_stage_change()`
- `update_updated_at_column()`

---

## 🎉 After All Migrations Applied

### You'll Have:

1. ✅ **Complete CRM System**
   - Contacts with full details
   - Attachments and comments
   - Status history tracking
   - Email templates and notifications

2. ✅ **Pipelines Feature**
   - Multiple pipelines per business
   - Customizable stages
   - Drag-and-drop kanban board
   - Stage history and analytics

3. ✅ **Multi-Business Support** ← NEW
   - Separate IT and Healthcare businesses
   - Business-specific contact types
   - Business-specific job titles
   - Business-specific pipelines
   - Proper data isolation

4. ✅ **Working Registration**
   - New users can sign up
   - Profile creation working
   - Tenant setup functional

---

## 📚 Documentation References

| Feature | Documentation File |
|---------|-------------------|
| Pipelines | `PIPELINES_IMPLEMENTATION.md` |
| Multi-Business | `MULTI_BUSINESS_IMPLEMENTATION.md` ← NEW |
| Status Tracking | `STATUS_TRACKING_README.md` |
| Advanced Filtering | `ADVANCED_FILTERING_IMPLEMENTATION.md` |
| General CRM | `CRM_IMPLEMENTATION.md` |

---

## ❓ Troubleshooting

### Migration Fails

**Problem:** Error when running migration

**Solutions:**
1. Check if previous migrations are applied
2. Look for duplicate table errors (skip if table exists)
3. Check constraint violations
4. Verify user has correct permissions

### Tables Not Showing

**Problem:** Tables don't appear after migration

**Solution:**
```sql
-- Refresh schema cache
SELECT pg_catalog.pg_get_functiondef(p.oid) 
FROM pg_catalog.pg_proc p 
WHERE p.proname = 'update_updated_at_column';
```

### RLS Policy Errors

**Problem:** Permission denied errors

**Solution:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Re-enable RLS if needed
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

---

## 🚀 Summary

**Total Migrations:** 11 files  
**Already Applied:** 8 files ✅  
**Need to Apply:** 3 files ⏳  

**Priority Order:**
1. **009_fix_registration_rls.sql** - CRITICAL (blocks registration)
2. **010_pipelines_schema.sql** - HIGH (blocks pipelines feature)
3. **011_businesses_multi_business_support.sql** - HIGH (enables multi-business)

**Next Steps:**
1. Apply migrations 009, 010, 011 in Supabase SQL Editor
2. Create your IT and Healthcare businesses
3. Run `migrate_to_default_business()` to assign existing data
4. Create business-specific job titles and pipelines
5. Test the application

---

**Ready to proceed!** 🎊

All migration files are ready and documented. Once you apply them, your CRM will have full multi-business support with IT and Healthcare divisions completely separated.
