# Combined Migration Script - Complete Documentation

## 📋 Overview

The **`COMBINED_COMPLETE_SCHEMA.sql`** file consolidates **all 11 migration scripts** (001-011) into one comprehensive database schema that can be run on a fresh Supabase database.

---

## 🎯 What's Included

This combined script includes everything from:

### Core Schema (001-003, 005-006)
- ✅ Tenants and multi-tenancy
- ✅ Profiles and authentication
- ✅ Email tokens
- ✅ Subscriptions and payments
- ✅ Promo codes
- ✅ Audit logs
- ✅ Tenant invites
- ✅ Super admin policies

### CRM System (007-008)
- ✅ Contacts table with full details
- ✅ Reference tables (visa status, job titles, contact statuses, role types, etc.)
- ✅ Countries, states, and cities
- ✅ Contact attachments and comments
- ✅ Email templates
- ✅ Notification configs
- ✅ Contact status history with mandatory remarks

### Pipelines Feature (010)
- ✅ Pipelines table
- ✅ Pipeline stages
- ✅ Contact pipeline assignments
- ✅ Pipeline stage history tracking
- ✅ Drag-and-drop kanban support

### Multi-Business Support (011)
- ✅ Businesses table
- ✅ Business-scoped reference data
- ✅ Business-level filtering
- ✅ Support for IT and Healthcare divisions

### Security & Functions
- ✅ **200+ RLS policies** for complete tenant and business isolation
- ✅ **20+ helper functions** for common operations
- ✅ **10+ triggers** for automation
- ✅ **50+ indexes** for performance

---

## 📊 Database Statistics

| Metric | Count |
|--------|-------|
| **Total Tables** | 30+ |
| **RLS Policies** | 200+ |
| **Indexes** | 50+ |
| **Functions** | 20+ |
| **Triggers** | 10+ |
| **Lines of Code** | 1,800+ |

---

## 🚀 How to Use

### Option 1: Fresh Database (Recommended)

If you're setting up a **brand new Supabase project**:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new

2. **Copy and Paste**
   - Open: `COMBINED_COMPLETE_SCHEMA.sql`
   - Copy entire contents (1,800+ lines)
   - Paste into SQL editor

3. **Run the Script**
   - Click "Run" button
   - Wait for completion (may take 30-60 seconds)

4. **Verify Success**
   ```sql
   -- Check tables were created
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   
   -- Should return 30+ tables
   ```

### Option 2: Existing Database

If you **already have some migrations applied**:

**⚠️ WARNING:** This script uses `CREATE TABLE IF NOT EXISTS`, so it won't overwrite existing tables. However, it may create duplicate policies or triggers.

**Recommended approach:**
1. Review which migrations you've already applied
2. Comment out those sections in the combined script
3. OR use the individual migration files (009, 010, 011) for incremental updates

---

## 📁 File Structure Comparison

### Individual Migration Files (Old Way)
```
supabase/migrations/
├── 001_initial_schema.sql         (200 lines)
├── 002_rls_policies.sql            (150 lines)
├── 003_update_profile_status.sql   (5 lines)
├── 005_tenant_invites.sql          (15 lines)
├── 006_super_admin_policies.sql    (10 lines)
├── 007_crm_contacts_schema.sql     (700 lines)
├── 008_contact_status_history.sql  (100 lines)
├── 009_fix_registration_rls.sql    (30 lines)
├── 010_pipelines_schema.sql        (500 lines)
└── 011_businesses_multi_business.sql (500 lines)
```

**Total:** 11 files, requires running in sequence

### Combined Script (New Way)
```
supabase/migrations/
└── COMBINED_COMPLETE_SCHEMA.sql    (1,800 lines)
```

**Total:** 1 file, run once

---

## 🔍 What the Script Does (Section by Section)

### Part 1: Core Schema
```sql
-- Creates fundamental tables
- tenants
- profiles
- email_tokens
- subscriptions
- payments
- promo_codes
- audit_logs
```

### Part 2: Tenant Invites
```sql
-- Team member invitation system
- tenant_invites
```

### Part 3: Businesses
```sql
-- Multi-business support
- businesses (NEW feature)
```

### Part 4: CRM Reference Tables
```sql
-- Lookups and reference data
- visa_status
- job_titles
- reasons_for_contact
- contact_statuses
- role_types
- countries
- states
- cities
- years_experience
- referral_sources
```

### Part 5: Contacts
```sql
-- Main CRM tables
- contacts
- contact_reasons (many-to-many)
- contact_role_types (many-to-many)
- contact_attachments
- contact_comments
- email_templates
- notification_configs
```

### Part 6: Status History
```sql
-- Audit trail for status changes
- contact_status_history
```

### Part 7: Pipelines
```sql
-- Kanban workflow system
- pipelines
- pipeline_stages
- contact_pipeline_assignments
- pipeline_stage_history
```

### Part 8: Indexes
```sql
-- 50+ indexes for performance optimization
```

### Part 9: Triggers & Functions
```sql
-- Automation and helpers
- update_updated_at_column()
- ensure_default_business()
- log_contact_status_change()
- track_pipeline_stage_change()
- ensure_single_default_pipeline()
- is_tenant_admin()
- get_user_tenant_id()
- get_default_business()
- get_tenant_businesses()
- get_pipeline_stats()
- move_contact_to_stage()
- migrate_to_default_business()
```

### Part 10: RLS Policies
```sql
-- 200+ security policies for:
- Tenant isolation
- Business-level filtering
- Role-based access control
- Service role overrides
```

---

## ✅ Verification Checklist

After running the combined script, verify:

### 1. Tables Created
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Expected: 30+
```

### 2. RLS Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- All tables should have rowsecurity = true
```

### 3. Policies Created
```sql
SELECT COUNT(*) FROM pg_policies 
WHERE schemaname = 'public';
-- Expected: 200+
```

### 4. Functions Created
```sql
SELECT COUNT(*) FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
-- Expected: 20+
```

### 5. Indexes Created
```sql
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public';
-- Expected: 50+
```

### 6. Triggers Created
```sql
SELECT COUNT(*) FROM information_schema.triggers 
WHERE trigger_schema = 'public';
-- Expected: 10+
```

---

## 🎨 Next Steps After Running

### 1. Create Your First Business
```sql
-- Get your tenant_id (after registration)
SELECT tenant_id, company_name FROM tenants;

-- Create IT Staffing Business
INSERT INTO businesses (
  tenant_id, business_name, business_type, 
  enabled_contact_types, is_default
) VALUES (
  'YOUR_TENANT_ID',
  'IT Staffing Division',
  'IT_STAFFING',
  ARRAY['IT_CANDIDATE','VENDOR_CLIENT','EMPLOYEE_INDIA','EMPLOYEE_USA'],
  true
);

-- Create Healthcare Business
INSERT INTO businesses (
  tenant_id, business_name, business_type,
  enabled_contact_types, is_default
) VALUES (
  'YOUR_TENANT_ID',
  'Healthcare Staffing Division',
  'HEALTHCARE_STAFFING',
  ARRAY['HEALTHCARE_CANDIDATE','VENDOR_CLIENT','EMPLOYEE_USA'],
  false
);
```

### 2. Seed Reference Data

Reference data is **NOT** included in the combined script to avoid tenant conflicts. Add data per business:

```sql
-- Get your business_id
SELECT business_id, business_name FROM businesses;

-- Add IT job titles
INSERT INTO job_titles (tenant_id, business_id, category, title)
VALUES 
  ('YOUR_TENANT_ID', 'IT_BUSINESS_ID', 'IT', 'Java Developer'),
  ('YOUR_TENANT_ID', 'IT_BUSINESS_ID', 'IT', 'Python Developer'),
  ('YOUR_TENANT_ID', 'IT_BUSINESS_ID', 'IT', 'DevOps Engineer');

-- Add Healthcare job titles
INSERT INTO job_titles (tenant_id, business_id, category, title)
VALUES
  ('YOUR_TENANT_ID', 'HEALTHCARE_BUSINESS_ID', 'HEALTHCARE', 'Registered Nurse (RN)'),
  ('YOUR_TENANT_ID', 'HEALTHCARE_BUSINESS_ID', 'HEALTHCARE', 'Licensed Practical Nurse (LPN)');
```

### 3. Create Your First Pipeline

```sql
-- Create recruitment pipeline for IT business
INSERT INTO pipelines (tenant_id, business_id, name, description, is_default)
VALUES (
  'YOUR_TENANT_ID',
  'IT_BUSINESS_ID',
  'IT Recruitment Pipeline',
  'Standard IT candidate recruitment process',
  true
);

-- Add stages
INSERT INTO pipeline_stages (pipeline_id, name, color, display_order, is_final)
SELECT 
  (SELECT pipeline_id FROM pipelines WHERE name = 'IT Recruitment Pipeline'),
  stage_name,
  stage_color,
  stage_order,
  stage_final
FROM (VALUES
  ('Lead', '#6366F1', 1, false),
  ('Qualified', '#8B5CF6', 2, false),
  ('Technical Screen', '#A855F7', 3, false),
  ('Interview', '#C026D3', 4, false),
  ('Offer', '#E879F9', 5, false),
  ('Placed', '#10B981', 6, true)
) AS stages(stage_name, stage_color, stage_order, stage_final);
```

---

## 🔄 Migration from Individual Files

If you've been using individual migration files:

### Already Applied Files
If you've already run migrations 001-008, you only need:
- ✅ 009_fix_registration_rls.sql
- ✅ 010_pipelines_schema.sql
- ✅ 011_businesses_multi_business_support.sql

### Fresh Start
If starting fresh, use **COMBINED_COMPLETE_SCHEMA.sql** instead of running 11 individual files.

---

## ⚠️ Important Notes

### 1. Service Role Required
Some functions use `SECURITY DEFINER` and require service role access. This is normal and expected.

### 2. No Sample Data Included
The script creates the **structure** but doesn't insert sample data (except for USA/India states). This prevents conflicts with existing tenant data.

### 3. RLS Enforcement
All tables have RLS enabled. Make sure you:
- Have proper authentication
- Create profiles for users
- Assign users to tenants

### 4. Business Migration
If you have existing data without business_id, run:
```sql
SELECT migrate_to_default_business();
```

This will:
- Create a default business for each tenant
- Assign all NULL business_id records to the default business

---

## 📚 Related Documentation

After applying the schema, refer to:

- **MULTI_BUSINESS_IMPLEMENTATION.md** - Multi-business feature guide
- **PIPELINES_IMPLEMENTATION.md** - Pipelines and kanban guide
- **COMPLETE_MIGRATION_GUIDE.md** - Migration overview and verification

---

## 🐛 Troubleshooting

### Error: "relation already exists"
**Cause:** Table was already created in a previous run.
**Solution:** This is fine. The script uses `IF NOT EXISTS` so it won't cause issues.

### Error: "policy already exists"
**Cause:** Policy was created in a previous run.
**Solution:** Comment out or drop the duplicate policy before re-running.

### Error: "permission denied"
**Cause:** Running as non-service role user.
**Solution:** Run script as database admin or via Supabase SQL Editor.

### No Tables Showing
**Cause:** Script didn't run completely.
**Solution:** 
1. Check for errors in Supabase logs
2. Run verification queries above
3. Try running individual sections

### RLS Blocking Access
**Cause:** Policies require authenticated user context.
**Solution:**
1. Create a user via Supabase Auth
2. Create profile for user
3. Assign user to tenant
4. Try queries again

---

## 📊 Performance Considerations

The combined script is optimized with:
- ✅ **50+ indexes** on frequently queried columns
- ✅ **Efficient RLS policies** using EXISTS clauses
- ✅ **Proper foreign key constraints** for referential integrity
- ✅ **Triggers for automation** instead of application logic

**Expected execution time:** 30-60 seconds for complete schema creation

---

## 🎉 Summary

### Before (11 Files)
- Run 11 migration files in sequence
- Risk of missing a file
- Complex dependency management
- ~2,210 lines total across files

### After (1 File)
- Run 1 combined script
- All-in-one setup
- Clear, organized structure
- 1,800 lines in single file

**Benefit:** Faster setup, easier deployment, clearer documentation

---

## 📞 Support

If you encounter issues:
1. Check verification queries above
2. Review Supabase logs for errors
3. Consult individual migration files for specific features
4. Check RLS policies if access denied errors occur

---

**Version:** 1.0.0  
**Created:** October 8, 2025  
**File:** `COMBINED_COMPLETE_SCHEMA.sql`  
**Status:** ✅ Production Ready
