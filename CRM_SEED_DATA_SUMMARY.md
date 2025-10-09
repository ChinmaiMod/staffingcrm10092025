# 📊 CRM Reference Data - Seed Data Summary

## Overview

The migration file `007_crm_contacts_schema.sql` now includes INSERT statements to populate all reference tables with actual data. This data is inserted immediately after each table creation.

---

## 📋 Data Inserted

### 1. Visa Status (15 entries)
```sql
- F1
- OPT
- STEM OPT
- H1B
- H4
- H4 EAD
- GC EAD
- L1B
- L2S
- B1/B2
- J1
- TN
- E3
- GC
- USC
```
**Note:** Inserted with `tenant_id = NULL` for global access

---

### 2. Job Titles (43 entries)

#### IT Category (38 titles):
```sql
- Java Back End Developer
- Java Full Stack Developer
- Dotnet Developer
- Python Developer
- Data Analyst
- AWS Data Engineer
- Azure Data Engineer
- GCP Data Engineer
- Big Data Developer
- Power BI Developer
- Qliksense Developer
- Tableau Developer
- Informatica Developer
- Talend Developer
- Abinitio Developer
- Oracle PL/SQL Developer
- Oracle Apex Developer
- Oracle EBS Techno-functional consultant
- Oracle EBS Functional consultant
- Business Analyst
- Manual QA
- Automation QA
- ETL Tester
- iOS Developer
- Android Developer
- AWS Devops
- Azure Devops
- GCP Devops
- Manhattan WMS
- Embedded Engineer
- Servicenow Admin
- Servicenow Developer
- Oracle DBA
- SQL DBA
- Scrum Master
- Project Manager
- Mainframe Developer
- Mainframe Architect
```

#### Healthcare Category (5 titles):
```sql
- Licensed Practical Nurse(LPN)
- GNA
- Registered nurse (RN)
- Respiratory Therapist (RRT)
- Nurse Practitioner (NP)
```
**Note:** Inserted with `tenant_id = NULL` for global access

---

### 3. Reasons for Contact (5 entries)
```sql
- Training and Placement
- Marketing and Placement
- H1B Sponsorship
- H1B Transfer
- GC Processing
```
**Note:** Inserted with `tenant_id = NULL` for global access

---

### 4. Contact Statuses (11 entries)
```sql
- Initial Contact
- Spoke to candidate
- Resume needs to be prepared
- Resume prepared and sent for review
- Assigned to Recruiter
- Recruiter started marketing
- Placed into Job
- Candidate declined marketing
- Candidate on vacation
- Candidate not responding
- Exclusive roles only
```
**Note:** Inserted with `tenant_id = NULL` for global access

---

### 5. Role Types (4 entries)
```sql
- Remote
- Hybrid Local
- Onsite Local
- Open to Relocate
```
**Note:** Inserted with `tenant_id = NULL` for global access

---

### 6. Countries (2 entries)
```sql
- USA (code: USA)
- India (code: INDIA)
```
**Note:** Global table, no tenant_id

---

### 7. States (78 entries)

#### USA States (50 states):
```sql
Alabama, Alaska, Arizona, Arkansas, California, Colorado, 
Connecticut, Delaware, Florida, Georgia, Hawaii, Idaho, 
Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, 
Maine, Maryland, Massachusetts, Michigan, Minnesota, 
Mississippi, Missouri, Montana, Nebraska, Nevada, 
New Hampshire, New Jersey, New Mexico, New York, 
North Carolina, North Dakota, Ohio, Oklahoma, Oregon, 
Pennsylvania, Rhode Island, South Carolina, South Dakota, 
Tennessee, Texas, Utah, Vermont, Virginia, Washington, 
West Virginia, Wisconsin, Wyoming
```
**Each includes state code (e.g., CA, NY, TX)**

#### India States (28 states):
```sql
Andhra Pradesh, Arunachal Pradesh, Assam, Bihar, 
Chhattisgarh, Goa, Gujarat, Haryana, Himachal Pradesh, 
Jharkhand, Karnataka, Kerala, Madhya Pradesh, Maharashtra, 
Manipur, Meghalaya, Mizoram, Nagaland, Odisha, Punjab, 
Rajasthan, Sikkim, Tamil Nadu, Telangana, Tripura, 
Uttar Pradesh, Uttarakhand, West Bengal
```
**Note:** Global table, linked to countries via foreign key

---

### 8. Years of Experience (6 entries)
```sql
- 0
- 1 to 3
- 4 to 6
- 7 to 9
- 10 to 15
- 15+
```
**Note:** Inserted with `tenant_id = NULL` for global access

---

### 9. Referral Sources (3 entries)
```sql
- FB (Facebook)
- Google
- Friend
```
**Note:** Inserted with `tenant_id = NULL` for global access

---

## 🔧 Technical Details

### Insert Method
All inserts use the safe pattern:
```sql
INSERT INTO table_name (columns)
SELECT ... FROM (VALUES ...) AS t(...)
ON CONFLICT DO NOTHING;
```

**Benefits:**
- ✅ **Idempotent** - Can run multiple times safely
- ✅ **No duplicates** - Won't create duplicate entries
- ✅ **Safe** - Won't fail if data already exists

### Tenant Handling

**Tables with `tenant_id = NULL` (Global Data):**
- visa_status
- job_titles
- reasons_for_contact
- contact_statuses
- role_types
- years_experience
- referral_sources

**Why NULL?** This makes the data available to ALL tenants. Each tenant can also add their own custom entries with their specific tenant_id.

**Tables without tenant_id (Truly Global):**
- countries
- states
- cities

---

## 📊 Total Records Inserted

| Table | Record Count |
|-------|--------------|
| visa_status | 15 |
| job_titles | 43 (38 IT + 5 Healthcare) |
| reasons_for_contact | 5 |
| contact_statuses | 11 |
| role_types | 4 |
| countries | 2 |
| states | 78 (50 USA + 28 India) |
| cities | 0 (to be added later) |
| years_experience | 6 |
| referral_sources | 3 |
| **TOTAL** | **167 records** |

---

## 🚀 Usage After Migration

### Querying the Data

**Get all visa statuses:**
```sql
SELECT * FROM visa_status ORDER BY label;
```

**Get IT job titles:**
```sql
SELECT * FROM job_titles WHERE category = 'IT' ORDER BY title;
```

**Get all USA states:**
```sql
SELECT s.* 
FROM states s
JOIN countries c ON s.country_id = c.country_id
WHERE c.code = 'USA'
ORDER BY s.name;
```

**Get contact statuses:**
```sql
SELECT * FROM contact_statuses ORDER BY label;
```

---

## 🔄 Adding Tenant-Specific Data

If a tenant wants to add custom entries:

```sql
-- Example: Add custom job title for a specific tenant
INSERT INTO job_titles (category, title, tenant_id)
VALUES ('IT', 'Custom Role Name', 'tenant-uuid-here');

-- Example: Add custom status
INSERT INTO contact_statuses (code, label, tenant_id)
VALUES ('CUSTOM_STATUS', 'Custom Status Label', 'tenant-uuid-here');
```

Tenants will see:
- All global data (tenant_id = NULL)
- Their specific custom data (tenant_id = their ID)

---

## 📝 Notes

### Data Quality
- ✅ All data matches your original requirements
- ✅ Proper categorization (IT vs Healthcare)
- ✅ Consistent naming conventions
- ✅ State codes included for USA states

### Future Enhancements
- Cities table is created but not populated (add as needed)
- Can add more job titles, statuses, etc. easily
- Can add display_order field for custom sorting

### Migration Safety
- All inserts use `ON CONFLICT DO NOTHING`
- Safe to run multiple times
- Won't overwrite existing data
- Won't cause errors if data exists

---

## ✅ Verification Queries

After running the migration, verify the data:

```sql
-- Check all reference tables
SELECT 'visa_status' as table_name, COUNT(*) as count FROM visa_status
UNION ALL
SELECT 'job_titles', COUNT(*) FROM job_titles
UNION ALL
SELECT 'reasons_for_contact', COUNT(*) FROM reasons_for_contact
UNION ALL
SELECT 'contact_statuses', COUNT(*) FROM contact_statuses
UNION ALL
SELECT 'role_types', COUNT(*) FROM role_types
UNION ALL
SELECT 'countries', COUNT(*) FROM countries
UNION ALL
SELECT 'states', COUNT(*) FROM states
UNION ALL
SELECT 'years_experience', COUNT(*) FROM years_experience
UNION ALL
SELECT 'referral_sources', COUNT(*) FROM referral_sources;
```

**Expected Output:**
```
table_name              | count
------------------------+-------
visa_status            |    15
job_titles             |    43
reasons_for_contact    |     5
contact_statuses       |    11
role_types             |     4
countries              |     2
states                 |    78
years_experience       |     6
referral_sources       |     3
```

---

## 🎯 Next Steps

1. **Apply the Migration:**
   - Go to Supabase Dashboard → SQL Editor
   - Copy `007_crm_contacts_schema.sql`
   - Paste and run
   - Also run `008_contact_status_history.sql`

2. **Verify Data:**
   - Run verification queries above
   - Check that all 167 records are inserted

3. **Update Frontend:**
   - Remove hardcoded arrays from ContactForm.jsx
   - Fetch reference data from Supabase instead
   - Use real IDs instead of labels

4. **Test:**
   - Create a test contact
   - Verify dropdowns populate from database
   - Verify data saves correctly

---

**Migration File:** `supabase/migrations/007_crm_contacts_schema.sql`  
**Status:** ✅ Ready to Apply  
**Data Quality:** ✅ Production Ready  
**Total Records:** 167 seed records
