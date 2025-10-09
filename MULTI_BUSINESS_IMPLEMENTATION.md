# Multi-Business Support - Implementation Guide

## ✅ Overview

The Multi-Business feature allows one tenant to manage **multiple separate businesses** under their account. For example:
- **IT Staffing Division** - with IT-specific contact types, job titles, and pipelines
- **Healthcare Staffing Division** - with healthcare-specific contact types, job titles, and pipelines

Each business has its own:
- Contact types
- Job titles and categories
- Pipelines and stages
- Reference data (statuses, visa types, etc.)
- Email templates and notifications

---

## 📁 Files Created

### Database Migration (1 file)

**File:** `supabase/migrations/011_businesses_multi_business_support.sql` (500+ lines)

**What it does:**
1. Creates `businesses` table
2. Adds `business_id` column to all CRM tables
3. Updates RLS policies for business-level isolation
4. Provides migration helper functions
5. Includes sample data examples

---

## 🗂️ Database Schema

### New Table: `businesses`

```sql
CREATE TABLE businesses (
  business_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,              -- Links to tenant
  business_name text NOT NULL,          -- e.g., "IT Staffing Division"
  business_type text NOT NULL,          -- 'IT_STAFFING', 'HEALTHCARE_STAFFING', etc.
  description text,                     -- Business description
  industry text,                        -- e.g., "Technology", "Healthcare"
  enabled_contact_types text[],         -- Array of allowed contact types
  settings jsonb,                       -- Flexible business settings
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,     -- One default per tenant
  created_at timestamptz,
  updated_at timestamptz
);
```

### Updated Tables (business_id added)

All these tables now have a `business_id` column:
- ✅ `contacts`
- ✅ `visa_status`
- ✅ `job_titles`
- ✅ `reasons_for_contact`
- ✅ `contact_statuses`
- ✅ `role_types`
- ✅ `years_experience`
- ✅ `referral_sources`
- ✅ `email_templates`
- ✅ `notification_configs`
- ✅ `pipelines`

---

## 🚀 Step-by-Step Setup

### Step 1: Apply Database Migration

Open Supabase SQL Editor and run:

```sql
-- Apply migration
-- Copy and paste entire contents of 011_businesses_multi_business_support.sql
```

**Result:** 
- ✅ `businesses` table created
- ✅ All CRM tables updated with `business_id`
- ✅ RLS policies updated
- ✅ Helper functions created

---

### Step 2: Create Your Businesses

#### Get Your Tenant ID

```sql
-- Find your tenant_id
SELECT tenant_id, company_name 
FROM tenants 
WHERE company_name = 'Your Company Name';
```

#### Create IT Staffing Business

```sql
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
  true  -- This is your default business
);
```

#### Create Healthcare Staffing Business

```sql
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
```

---

### Step 3: Migrate Existing Data

If you have existing contacts and reference data, migrate them to your default business:

```sql
-- This assigns all existing records to the default business
SELECT migrate_to_default_business();
```

**What this does:**
- Finds (or creates) default business for each tenant
- Updates all NULL `business_id` values to the default business
- Ensures no orphaned records

---

### Step 4: Create Business-Specific Data

#### IT Business - Job Titles

```sql
-- Get IT business_id
SELECT business_id FROM businesses 
WHERE business_type = 'IT_STAFFING' 
AND tenant_id = 'YOUR_TENANT_ID';

-- Create IT job titles
INSERT INTO job_titles (tenant_id, business_id, category, title)
SELECT 
  'YOUR_TENANT_ID',
  'YOUR_IT_BUSINESS_ID',
  'IT',
  title
FROM (VALUES
  ('Java Back End Developer'),
  ('Java Full Stack Developer'),
  ('Python Developer'),
  ('Data Engineer'),
  ('AWS DevOps Engineer'),
  ('Azure Data Engineer'),
  ('Business Analyst'),
  ('Scrum Master')
) AS t(title);
```

#### Healthcare Business - Job Titles

```sql
-- Get Healthcare business_id
SELECT business_id FROM businesses 
WHERE business_type = 'HEALTHCARE_STAFFING' 
AND tenant_id = 'YOUR_TENANT_ID';

-- Create Healthcare job titles
INSERT INTO job_titles (tenant_id, business_id, category, title)
SELECT 
  'YOUR_TENANT_ID',
  'YOUR_HEALTHCARE_BUSINESS_ID',
  'HEALTHCARE',
  title
FROM (VALUES
  ('Registered Nurse (RN)'),
  ('Licensed Practical Nurse (LPN)'),
  ('Nurse Practitioner (NP)'),
  ('Respiratory Therapist (RRT)'),
  ('GNA'),
  ('Medical Assistant'),
  ('Physical Therapist')
) AS t(title);
```

#### Create Business-Specific Pipelines

**IT Business Pipeline:**

```sql
-- Create IT Recruitment Pipeline
INSERT INTO pipelines (tenant_id, business_id, name, description, color, is_default)
SELECT 
  'YOUR_TENANT_ID',
  business_id,
  'IT Recruitment Pipeline',
  'Standard recruitment process for IT candidates',
  '#4F46E5',
  true
FROM businesses 
WHERE tenant_id = 'YOUR_TENANT_ID' 
AND business_type = 'IT_STAFFING';

-- Add stages for IT pipeline
INSERT INTO pipeline_stages (pipeline_id, name, description, color, display_order, is_final)
SELECT 
  p.pipeline_id,
  t.name,
  t.description,
  t.color,
  t.display_order,
  t.is_final
FROM pipelines p
CROSS JOIN (VALUES
  ('Lead', 'Initial contact or lead', '#6366F1', 0, false),
  ('Qualified', 'Candidate qualified for roles', '#8B5CF6', 1, false),
  ('Technical Screen', 'Technical assessment completed', '#A855F7', 2, false),
  ('Client Interview', 'Submitted to client for interview', '#C026D3', 3, false),
  ('Offer Stage', 'Offer extended to candidate', '#E879F9', 4, false),
  ('Placed', 'Successfully placed in role', '#10B981', 5, true)
) AS t(name, description, color, display_order, is_final)
WHERE p.name = 'IT Recruitment Pipeline'
AND p.tenant_id = 'YOUR_TENANT_ID';
```

**Healthcare Business Pipeline:**

```sql
-- Create Healthcare Recruitment Pipeline
INSERT INTO pipelines (tenant_id, business_id, name, description, color, is_default)
SELECT 
  'YOUR_TENANT_ID',
  business_id,
  'Healthcare Recruitment Pipeline',
  'Standard recruitment process for healthcare professionals',
  '#059669',
  true
FROM businesses 
WHERE tenant_id = 'YOUR_TENANT_ID' 
AND business_type = 'HEALTHCARE_STAFFING';

-- Add stages for Healthcare pipeline
INSERT INTO pipeline_stages (pipeline_id, name, description, color, display_order, is_final)
SELECT 
  p.pipeline_id,
  t.name,
  t.description,
  t.color,
  t.display_order,
  t.is_final
FROM pipelines p
CROSS JOIN (VALUES
  ('Application', 'Application received', '#10B981', 0, false),
  ('Credentials Check', 'Verifying licenses and certifications', '#14B8A6', 1, false),
  ('Interview', 'Interview scheduled or completed', '#06B6D4', 2, false),
  ('Background Check', 'Background and reference checks', '#0EA5E9', 3, false),
  ('Facility Match', 'Matched with healthcare facility', '#3B82F6', 4, false),
  ('Placed', 'Successfully placed at facility', '#10B981', 5, true)
) AS t(name, description, color, display_order, is_final)
WHERE p.name = 'Healthcare Recruitment Pipeline'
AND p.tenant_id = 'YOUR_TENANT_ID';
```

---

## 🎯 Use Cases

### Use Case 1: IT Staffing Business

**Scenario:** Managing IT candidates for tech companies

**Setup:**
1. Business Type: `IT_STAFFING`
2. Enabled Contact Types: 
   - IT_CANDIDATE
   - VENDOR_CLIENT
   - EMPLOYEE_INDIA
   - EMPLOYEE_USA
3. Job Titles: Java, Python, DevOps, Data Engineer, etc.
4. Pipeline: Lead → Qualified → Technical Screen → Interview → Offer → Placed

**Workflow:**
1. Add IT candidate contact
2. Assign to IT business
3. Assign to "IT Recruitment Pipeline"
4. Move through stages as recruitment progresses
5. Track history and analytics

---

### Use Case 2: Healthcare Staffing Business

**Scenario:** Managing healthcare professionals for hospitals/clinics

**Setup:**
1. Business Type: `HEALTHCARE_STAFFING`
2. Enabled Contact Types:
   - HEALTHCARE_CANDIDATE
   - VENDOR_CLIENT
   - EMPLOYEE_USA
3. Job Titles: RN, LPN, NP, Respiratory Therapist, etc.
4. Pipeline: Application → Credentials → Interview → Background → Facility Match → Placed

**Workflow:**
1. Add healthcare candidate contact
2. Assign to Healthcare business
3. Assign to "Healthcare Recruitment Pipeline"
4. Verify credentials and licenses
5. Match with appropriate facilities
6. Track placements

---

### Use Case 3: Mixed Operations

**Scenario:** Running both IT and Healthcare divisions

**Setup:**
1. Two separate businesses under one tenant
2. Different contact types per business
3. Separate pipelines and stages
4. Business-specific job titles and reference data

**Workflow:**
1. User logs in to CRM
2. Selects active business from dropdown
3. Views only contacts/data for selected business
4. Switches business to work on different division
5. Reports and analytics can be:
   - Business-specific
   - Cross-business (tenant-level)

---

## 🔧 Helper Functions

### Get Default Business

```sql
-- Returns the default business_id for a tenant
SELECT get_default_business('YOUR_TENANT_ID');
```

### Get All Businesses

```sql
-- Returns all active businesses for a tenant
SELECT * FROM get_tenant_businesses('YOUR_TENANT_ID');
```

**Result:**
```
business_id  | business_name              | business_type        | is_default
-------------|----------------------------|----------------------|-----------
uuid-123     | IT Staffing Division       | IT_STAFFING          | true
uuid-456     | Healthcare Staffing Div    | HEALTHCARE_STAFFING  | false
```

---

## 📊 Queries and Reports

### Contacts by Business

```sql
-- Get all contacts for IT business
SELECT 
  c.contact_id,
  c.first_name,
  c.last_name,
  c.email,
  b.business_name,
  j.title as job_title
FROM contacts c
JOIN businesses b ON c.business_id = b.business_id
LEFT JOIN job_titles j ON c.job_title_id = j.job_title_id
WHERE b.business_type = 'IT_STAFFING'
AND b.tenant_id = 'YOUR_TENANT_ID';
```

### Pipeline Analytics by Business

```sql
-- Get pipeline stats for each business
SELECT 
  b.business_name,
  p.name as pipeline_name,
  ps.name as stage_name,
  COUNT(cpa.assignment_id) as contact_count
FROM businesses b
JOIN pipelines p ON p.business_id = b.business_id
JOIN pipeline_stages ps ON ps.pipeline_id = p.pipeline_id
LEFT JOIN contact_pipeline_assignments cpa ON cpa.stage_id = ps.stage_id
WHERE b.tenant_id = 'YOUR_TENANT_ID'
GROUP BY b.business_name, p.name, ps.name, ps.display_order
ORDER BY b.business_name, ps.display_order;
```

### Job Titles by Business

```sql
-- Compare job titles across businesses
SELECT 
  b.business_name,
  j.category,
  COUNT(*) as title_count,
  string_agg(j.title, ', ' ORDER BY j.title) as titles
FROM businesses b
JOIN job_titles j ON j.business_id = b.business_id
WHERE b.tenant_id = 'YOUR_TENANT_ID'
GROUP BY b.business_name, j.category
ORDER BY b.business_name, j.category;
```

---

## 🔐 Security (RLS Policies)

### Business Isolation

All RLS policies now include business-level filtering:

```sql
-- Example: Users can only see contacts in businesses their tenant owns
CREATE POLICY "contacts_select_tenant" ON contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.tenant_id = b.tenant_id
      WHERE p.id = auth.uid()
      AND contacts.business_id = b.business_id
    )
  );
```

### Reference Data Access

Reference tables (job titles, statuses, etc.) show:
- ✅ Global records (business_id IS NULL)
- ✅ Business-specific records for user's tenant's businesses

```sql
-- Example: Job titles policy
CREATE POLICY "job_titles_select_business" ON job_titles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.tenant_id = b.tenant_id
      WHERE p.id = auth.uid()
      AND (job_titles.business_id = b.business_id OR job_titles.business_id IS NULL)
    )
  );
```

---

## 🎨 Frontend Integration

### Business Selector Component (TODO)

Create a business selector in your CRM interface:

```jsx
// src/components/CRM/BusinessSelector.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../api/supabaseClient'

export default function BusinessSelector({ selectedBusinessId, onBusinessChange }) {
  const [businesses, setBusinesses] = useState([])
  
  useEffect(() => {
    fetchBusinesses()
  }, [])
  
  const fetchBusinesses = async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('business_name')
    
    if (data) {
      setBusinesses(data)
      // Auto-select default business
      if (!selectedBusinessId && data.length > 0) {
        const defaultBusiness = data.find(b => b.is_default) || data[0]
        onBusinessChange(defaultBusiness.business_id)
      }
    }
  }
  
  return (
    <div className="business-selector">
      <label>Active Business:</label>
      <select 
        value={selectedBusinessId || ''} 
        onChange={(e) => onBusinessChange(e.target.value)}
      >
        <option value="">Select Business...</option>
        {businesses.map(b => (
          <option key={b.business_id} value={b.business_id}>
            {b.business_name} {b.is_default ? '(Default)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
```

### Filtering by Business

Update your contact queries:

```jsx
// When fetching contacts
const fetchContacts = async (businessId) => {
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      business:businesses(business_name),
      job_title:job_titles(title)
    `)
    .eq('business_id', businessId)  // Filter by selected business
  
  if (data) setContacts(data)
}
```

---

## 🧪 Testing Checklist

### Database Setup
- [ ] Migration applied successfully
- [ ] `businesses` table created
- [ ] All CRM tables have `business_id` column
- [ ] RLS policies updated
- [ ] Helper functions working

### Business Creation
- [ ] Can create IT Staffing business
- [ ] Can create Healthcare business
- [ ] Only one default business per tenant
- [ ] `is_default` trigger works correctly

### Data Migration
- [ ] `migrate_to_default_business()` runs without errors
- [ ] Existing contacts assigned to default business
- [ ] Existing job titles assigned to businesses
- [ ] No orphaned records (NULL business_id)

### Business-Specific Data
- [ ] Can create IT-specific job titles
- [ ] Can create Healthcare-specific job titles
- [ ] Can create business-specific pipelines
- [ ] Contact types filtered by business

### Security
- [ ] Users can only see their tenant's businesses
- [ ] Users can see global + business-specific reference data
- [ ] Cannot access other tenants' businesses
- [ ] Admins can manage businesses

### Queries
- [ ] Can filter contacts by business
- [ ] Can get pipeline stats by business
- [ ] Helper functions return correct data
- [ ] Cross-business reports work

---

## ❓ Troubleshooting

### Problem: Migration fails with constraint error

**Solution:**
```sql
-- Check for existing data with NULL tenant_id
SELECT COUNT(*) FROM job_titles WHERE tenant_id IS NULL;

-- Update or delete these records before migration
DELETE FROM job_titles WHERE tenant_id IS NULL;
```

### Problem: Existing contacts not showing after migration

**Solution:**
```sql
-- Run the migration function
SELECT migrate_to_default_business();

-- Verify contacts have business_id
SELECT COUNT(*), business_id 
FROM contacts 
GROUP BY business_id;
```

### Problem: Can't create second business

**Solution:**
Check RLS policies:
```sql
-- Verify user is ADMIN
SELECT role FROM profiles WHERE id = auth.uid();

-- Grant ADMIN role if needed
UPDATE profiles SET role = 'ADMIN' WHERE id = 'USER_ID';
```

### Problem: Reference data not showing for business

**Solution:**
```sql
-- Check if data has business_id set
SELECT business_id, COUNT(*) 
FROM job_titles 
WHERE tenant_id = 'YOUR_TENANT_ID' 
GROUP BY business_id;

-- If NULL, assign to business
UPDATE job_titles 
SET business_id = 'YOUR_BUSINESS_ID' 
WHERE business_id IS NULL 
AND tenant_id = 'YOUR_TENANT_ID';
```

---

## 🚀 Next Steps

1. **Apply Migration** ✓
   - Run 011_businesses_multi_business_support.sql in Supabase

2. **Create Businesses** 
   - IT Staffing Division
   - Healthcare Staffing Division

3. **Migrate Existing Data**
   - Run `migrate_to_default_business()`

4. **Add Business-Specific Data**
   - Job titles for each business
   - Pipelines for each business
   - Reference data for each business

5. **Update Frontend**
   - Add BusinessSelector component
   - Update queries to filter by business_id
   - Add business context to forms

6. **Test Thoroughly**
   - Create contacts in different businesses
   - Verify data isolation
   - Test switching between businesses

---

## 📚 Summary

**What You Get:**
- ✅ Multi-business support under one tenant
- ✅ Business-specific contact types
- ✅ Business-specific job titles and reference data
- ✅ Business-specific pipelines
- ✅ Proper data isolation and security
- ✅ Easy migration for existing data
- ✅ Flexible business settings via JSON

**Benefits:**
- 🎯 Separate IT and Healthcare divisions clearly
- 📊 Business-specific reporting and analytics
- 🔐 Secure data isolation between businesses
- 🚀 Scalable to add more businesses later
- 💼 Professional multi-division management

**Ready to Use:**
Database migration is complete and ready to apply!

---

**Version:** 1.0.0  
**Implementation Date:** October 8, 2025  
**Status:** ✅ Complete and Ready to Deploy  
**Migration File:** `011_businesses_multi_business_support.sql`
