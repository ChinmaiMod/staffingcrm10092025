# 🚀 END-TO-END SUPABASE INTEGRATION GUIDE

This guide will take you from mock data to a fully functional Supabase-powered CRM application.

## ⚡ QUICK START (3 Steps)

### STEP 1: Apply Database Migrations

1. **Open Supabase SQL Editor**:
   ```
   https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/sql/new
   ```

2. **Copy & Run Migration**:
   - The SQL has been copied to your clipboard
   - Paste into SQL Editor (Ctrl+V)
   - Click **RUN** or press Ctrl+Enter
   - Wait for success message (~10 seconds)

3. **Verify Tables Created**:
   - Go to Table Editor in Supabase
   - You should see these new tables:
     - `visa_status`
     - `job_titles`
     - `reasons_for_contact`
     - `contact_statuses`
     - `role_types`
     - `countries`, `states`, `cities`
     - `years_experience`
     - `referral_sources`
     - `contacts`
     - `contact_attachments`
     - `contact_comments`
     - `email_templates`
     - `notification_configs`

### STEP 2: Seed Reference Data for Your Tenant

After migration, you need to seed reference data. Run this SQL with YOUR tenant_id:

```sql
-- First, get your tenant_id
SELECT tenant_id, company_name FROM tenants LIMIT 5;

-- Replace 'YOUR_TENANT_ID' with the actual UUID from above query
-- Then run these INSERT statements:

-- Visa Statuses
INSERT INTO visa_status(tenant_id, code, label)
SELECT 'YOUR_TENANT_ID', v.code, v.label FROM (VALUES
  ('F1','F1'),('OPT','OPT'),('STEM_OPT','STEM OPT'),('H1B','H1B'),
  ('H4','H4'),('H4_EAD','H4 EAD'),('GC_EAD','GC EAD'),('L1B','L1B'),
  ('L2S','L2S'),('B1B2','B1/B2'),('J1','J1'),('TN','TN'),('E3','E3'),
  ('GC','Green Card'),('USC','US Citizen')
) AS v(code,label);

-- Years of Experience
INSERT INTO years_experience(tenant_id, code, label)
SELECT 'YOUR_TENANT_ID', y.code, y.label FROM (VALUES
  ('0','0'),('1_3','1 to 3'),('4_6','4 to 6'),
  ('7_9','7 to 9'),('10_15','10 to 15'),('15_plus','15+')
) AS y(code,label);

-- Contact Statuses
INSERT INTO contact_statuses(tenant_id, code, label)
SELECT 'YOUR_TENANT_ID', s.code, s.label FROM (VALUES
  ('INITIAL','Initial Contact'),
  ('SPOKE','Spoke to candidate'),
  ('RESUME_PREP','Resume needs to be prepared'),
  ('RESUME_DONE','Resume prepared and sent for review'),
  ('ASSIGNED','Assigned to Recruiter'),
  ('MARKETING','Recruiter started marketing'),
  ('PLACED','Placed into Job'),
  ('DECLINED','Candidate declined marketing'),
  ('VACATION','Candidate on vacation'),
  ('NO_RESPONSE','Candidate not responding')
) AS s(code,label);

-- Role Types
INSERT INTO role_types(tenant_id, code, label)
SELECT 'YOUR_TENANT_ID', r.code, r.label FROM (VALUES
  ('REMOTE','Remote'),
  ('HYBRID','Hybrid Local'),
  ('ONSITE','Onsite Local'),
  ('RELOCATE','Open to Relocate')
) AS r(code,label);

-- Referral Sources
INSERT INTO referral_sources(tenant_id, code, label)
SELECT 'YOUR_TENANT_ID', f.code, f.label FROM (VALUES
  ('FB','Facebook'),
  ('GOOGLE','Google'),
  ('FRIEND','Friend')
) AS f(code,label);

-- IT Job Titles
INSERT INTO job_titles(tenant_id, category, title)
SELECT 'YOUR_TENANT_ID', j.category, j.title FROM (VALUES
  ('IT','Java Back End Developer'),
  ('IT','Java Full Stack Developer'),
  ('IT','Dotnet Developer'),
  ('IT','Python Developer'),
  ('IT','Data Analyst'),
  ('IT','AWS Data Engineer'),
  ('IT','Azure Data Engineer'),
  ('IT','GCP Data Engineer'),
  ('IT','Big Data Developer'),
  ('IT','Power BI Developer'),
  ('IT','Qliksense Developer'),
  ('IT','Tableau Developer'),
  ('IT','Informatica Developer'),
  ('IT','Talend Developer'),
  ('IT','Abinitio Developer'),
  ('IT','Oracle PL/SQL Developer'),
  ('IT','Oracle Apex Developer'),
  ('IT','Business Analyst'),
  ('IT','Manual QA'),
  ('IT','Automation QA'),
  ('IT','ETL Tester'),
  ('IT','iOS Developer'),
  ('IT','Android Developer'),
  ('IT','AWS Devops'),
  ('IT','Azure Devops'),
  ('IT','GCP Devops'),
  ('IT','Mainframe Developer'),
  ('IT','Mainframe Architect')
) AS j(category,title);

-- Healthcare Job Titles  
INSERT INTO job_titles(tenant_id, category, title)
SELECT 'YOUR_TENANT_ID', j.category, j.title FROM (VALUES
  ('HEALTHCARE','Licensed Practical Nurse(LPN)'),
  ('HEALTHCARE','GNA'),
  ('HEALTHCARE','Registered nurse (RN)'),
  ('HEALTHCARE','Respiratory Therapist (RRT)'),
  ('HEALTHCARE','Nurse Practitioner (NP)')
) AS j(category,title);

-- Reasons for Contact
INSERT INTO reasons_for_contact(tenant_id, code, label)
SELECT 'YOUR_TENANT_ID', r.code, r.label FROM (VALUES
  ('TRAINING','Training and Placement'),
  ('MARKETING','Marketing and Placement'),
  ('H1B_SPONSOR','H1B Sponsorship'),
  ('H1B_TRANSFER','H1B Transfer'),
  ('GC','GC Processing')
) AS r(code,label);
```

### STEP 3: Update Frontend to Use Real Data

The ContactsManager component is already set up! Just uncomment the API calls.

I'll create an updated version that connects to real Supabase data...

---

## 📦 What Gets Created

### Database Tables (via migration)
- **Reference Tables** (13 total): visa_status, job_titles, contact_statuses, etc.
- **Contacts Table**: Main contacts with all fields
- **Contact Attachments**: File references
- **Contact Comments**: Notes and remarks
- **Email Templates**: Reusable email templates
- **Notification Configs**: Email triggers

### Row Level Security (RLS)
- ✅ Tenant isolation (users only see their tenant's data)
- ✅ Role-based access (Admin vs Member permissions)
- ✅ Secure reference data access

---

## 🔧 Configuration Checklist

### Environment Variables Required

Add to your `.env` file:

```bash
# Supabase (Already configured)
VITE_SUPABASE_URL=https://yvcsxadahzrxuptcgtkg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_FUNCTIONS_URL=https://yvcsxadahzrxuptcgtkg.supabase.co/functions/v1

# Resend (for bulk email - optional)
RESEND_API_KEY=re_your_key_here
```

---

## 🎯 Testing Your Integration

### Test 1: View Reference Data
1. Login to your app
2. Navigate to CRM → Data Administration
3. You should see all seeded reference data
4. Try adding/editing/deleting items

### Test 2: Create a Contact
1. Navigate to CRM → Contacts
2. Click "+ New Contact"
3. Fill in the form
4. Upload an attachment
5. Click "Create Contact"
6. Verify it appears in the list

### Test 3: Bulk Email
1. Select multiple contacts (checkboxes)
2. Click "Send Email to Selected"
3. Fill subject and body
4. (In production mode) Email will be sent via Resend

### Test 4: Dashboard Stats
1. Navigate to CRM Dashboard
2. Click on stat cards (Total Contacts, This Week, etc.)
3. Should filter contacts appropriately

---

## 🐛 Troubleshooting

### "No data showing"
- Check: Did you seed reference data for your tenant?
- Check: Are you logged in with the correct tenant?
- Check: Browser console for errors

### "Unauthorized" errors
- Check: Is your session still valid? Try logging out and back in
- Check: RLS policies are correct (migration should handle this)

### "Cannot find table"
- Check: Did the migration run successfully?
- Check: In Supabase Table Editor, verify tables exist

### Edge function errors
- Check: Are functions deployed?
- Check: Environment variables set correctly
- Check: Function logs in Supabase dashboard

---

## 📊 Database Schema Overview

```
tenants (existing)
  └─ profiles (existing)
       └─ contacts
            ├─ contact_attachments
            ├─ contact_comments
            └─ contact_reasons (junction)
  └─ visa_status (reference)
  └─ job_titles (reference)
  └─ contact_statuses (reference)
  └─ role_types (reference)
  └─ years_experience (reference)
  └─ referral_sources (reference)
  └─ email_templates
  └─ notification_configs

countries (global)
  └─ states
       └─ cities
```

---

## ⚙️ Advanced: Edge Functions Deployment

If you want to use edge functions (optional for now):

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref yvcsxadahzrxuptcgtkg

# Deploy functions
supabase functions deploy crm_contacts
supabase functions deploy sendBulkEmail

# Set secrets
supabase secrets set RESEND_API_KEY=re_your_key_here
```

---

## ✅ Success Criteria

You'll know it's working when:
- ✅ You can create contacts and they persist after refresh
- ✅ You can edit and delete contacts
- ✅ Data Administration shows reference tables
- ✅ Dashboard shows real contact counts
- ✅ Attachments upload successfully
- ✅ No mock data warnings in console

---

## 🎓 Next Steps After Integration

1. **Customize Reference Data**: Add your own job titles, statuses, etc.
2. **Import Existing Contacts**: Use Data Admin to bulk import
3. **Set Up Email Templates**: Create reusable templates
4. **Configure Notifications**: Set up automatic emails
5. **Invite Team Members**: Add recruiters to your tenant
6. **Set Up Resend**: For production email sending

---

## 💡 Pro Tips

1. **Backup First**: Export your data regularly
2. **Test with One Contact**: Create one test contact before bulk import
3. **Use Filters**: Leverage search and filters to find contacts quickly
4. **Bulk Operations**: Select multiple contacts for bulk email
5. **Reference Data**: Keep your reference tables clean and organized

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs (Database → Logs)
3. Review RLS policies (Database → Policies)
4. Test queries in SQL Editor

---

**Ready to begin? Start with STEP 1 above! 🚀**
