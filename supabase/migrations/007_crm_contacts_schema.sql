-- ============================================
-- CRM: Contacts and Reference Tables
-- Adds contacts, reference/lookups, attachments, comments,
-- email templates, and notification configurations
-- Run this AFTER `001_initial_schema.sql` and RLS policies migration
-- ============================================

-- Enable extensions (if not already enabled by initial migration)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- REFERENCE / LOOKUP TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS visa_status (
  visa_status_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_titles (
  job_title_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('IT','HEALTHCARE')),
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reasons_for_contact (
  reason_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_statuses (
  status_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS role_types (
  role_type_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS countries (
  country_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS states (
  state_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES countries(country_id) ON DELETE CASCADE,
  code text,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS cities (
  city_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid REFERENCES states(state_id) ON DELETE CASCADE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS years_experience (
  years_experience_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_sources (
  referral_source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL
);

-- ============================================
-- CONTACTS
-- ============================================

CREATE TABLE IF NOT EXISTS contacts (
  contact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid, -- optional business context
  contact_type text NOT NULL CHECK (contact_type IN ('IT_CANDIDATE','HEALTHCARE_CANDIDATE','VENDOR_CLIENT','VENDOR_EMPANELMENT','EMPLOYEE_INDIA','EMPLOYEE_USA')),
  first_name text,
  last_name text,
  email text,
  phone text,
  resume_url text,
  remarks text,
  referred_by text,
  visa_status_id uuid REFERENCES visa_status(visa_status_id) ON DELETE SET NULL,
  job_title_id uuid REFERENCES job_titles(job_title_id) ON DELETE SET NULL,
  status_id uuid REFERENCES contact_statuses(status_id) ON DELETE SET NULL,
  -- type of roles: many-to-many via contact_role_types
  country_id uuid REFERENCES countries(country_id) ON DELETE SET NULL,
  state_id uuid REFERENCES states(state_id) ON DELETE SET NULL,
  city_id uuid REFERENCES cities(city_id) ON DELETE SET NULL,
  years_experience_id uuid REFERENCES years_experience(years_experience_id) ON DELETE SET NULL,
  referral_source_id uuid REFERENCES referral_sources(referral_source_id) ON DELETE SET NULL,
  recruiting_team_lead_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  recruiter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Many-to-many: contact reasons
CREATE TABLE IF NOT EXISTS contact_reasons (
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE,
  reason_id uuid REFERENCES reasons_for_contact(reason_id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, reason_id)
);

-- Many-to-many: contact role types (Remote/Hybrid/Onsite etc.)
CREATE TABLE IF NOT EXISTS contact_role_types (
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE,
  role_type_id uuid REFERENCES role_types(role_type_id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, role_type_id)
);

-- Attachments (references to files in Supabase Storage)
CREATE TABLE IF NOT EXISTS contact_attachments (
  attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Comments/remarks by employees
CREATE TABLE IF NOT EXISTS contact_comments (
  comment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Email templates for notifications
CREATE TABLE IF NOT EXISTS email_templates (
  template_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text,
  body_html text,
  body_text text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, lower(name))
);

-- Notification configuration: trigger based notifications
CREATE TABLE IF NOT EXISTS notification_configs (
  config_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_event text NOT NULL, -- e.g., 'STATUS_CHANGE'
  trigger_value text,         -- e.g., the status value to match
  email_template_id uuid REFERENCES email_templates(template_id) ON DELETE SET NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('CANDIDATE','RECRUITER','CUSTOM')),
  custom_recipients jsonb, -- [{"type":"EMAIL","value":"foo@x.com"}] or other rules
  enabled boolean DEFAULT true,
  send_immediately boolean DEFAULT true,
  schedule jsonb, -- optional scheduling metadata (cron-like or delay)
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status_id);
CREATE INDEX IF NOT EXISTS idx_contacts_jobtitle ON contacts(job_title_id);
CREATE INDEX IF NOT EXISTS idx_contact_attachments_contact ON contact_attachments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_comments_contact ON contact_comments(contact_id);

-- ============================================
-- TRIGGERS: updated_at
-- ============================================

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_configs_updated_at BEFORE UPDATE ON notification_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE visa_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasons_for_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE years_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_sources ENABLE ROW LEVEL SECURITY;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_role_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_configs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Allow service role to do anything on these tables
CREATE POLICY "service_role_all_contacts" ON contacts
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "contacts_select_tenant" ON contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = contacts.tenant_id
    )
  );

CREATE POLICY "contacts_insert_member" ON contacts
  FOR INSERT
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role') OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = contacts.tenant_id
    ))
  );

CREATE POLICY "contacts_update_owner_or_admin" ON contacts
  FOR UPDATE
  USING (
    (auth.jwt()->>'role' = 'service_role') OR
    (contacts.created_by = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = contacts.tenant_id
      AND profiles.role = 'ADMIN'
    ))
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role') OR
    (contacts.created_by = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = contacts.tenant_id
      AND profiles.role = 'ADMIN'
    ))
  );

CREATE POLICY "contacts_delete_owner_or_admin" ON contacts
  FOR DELETE
  USING (
    (auth.jwt()->>'role' = 'service_role') OR
    (contacts.created_by = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = contacts.tenant_id
      AND profiles.role = 'ADMIN'
    ))
  );

-- Allow members to view reference lookups (for front-end autocomplete)
CREATE POLICY "refs_select_all" ON visa_status FOR SELECT USING (true);
CREATE POLICY "refs_select_all_job_titles" ON job_titles FOR SELECT USING (true);
CREATE POLICY "refs_select_all_reasons" ON reasons_for_contact FOR SELECT USING (true);
CREATE POLICY "refs_select_all_statuses" ON contact_statuses FOR SELECT USING (true);
CREATE POLICY "refs_select_all_role_types" ON role_types FOR SELECT USING (true);
CREATE POLICY "refs_select_countries" ON countries FOR SELECT USING (true);
CREATE POLICY "refs_select_states" ON states FOR SELECT USING (true);
CREATE POLICY "refs_select_cities" ON cities FOR SELECT USING (true);
CREATE POLICY "refs_select_years_exp" ON years_experience FOR SELECT USING (true);
CREATE POLICY "refs_select_referrals" ON referral_sources FOR SELECT USING (true);

-- Policies for attachments and comments: tenant members may insert; owners/admins may update/delete
CREATE POLICY "attachments_select_tenant" ON contact_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts JOIN profiles ON profiles.tenant_id = contacts.tenant_id
      WHERE contacts.contact_id = contact_attachments.contact_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "attachments_insert_member" ON contact_attachments
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'role' = 'service_role') OR
    (EXISTS (
      SELECT 1 FROM contacts JOIN profiles ON profiles.tenant_id = contacts.tenant_id
      WHERE contacts.contact_id = contact_attachments.contact_id
      AND profiles.id = auth.uid()
    ))
  );

CREATE POLICY "comments_select_tenant" ON contact_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts JOIN profiles ON profiles.tenant_id = contacts.tenant_id
      WHERE contacts.contact_id = contact_comments.contact_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "comments_insert_member" ON contact_comments
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'role' = 'service_role') OR
    (EXISTS (
      SELECT 1 FROM contacts JOIN profiles ON profiles.tenant_id = contacts.tenant_id
      WHERE contacts.contact_id = contact_comments.contact_id
      AND profiles.id = auth.uid()
    ))
  );

-- Email templates & notification configs: tenant admins manage, members may read
CREATE POLICY "email_templates_select_tenant" ON email_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = email_templates.tenant_id
    )
  );

CREATE POLICY "email_templates_insert_admin" ON email_templates
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'role' = 'service_role') OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = email_templates.tenant_id
      AND profiles.role = 'ADMIN'
    ))
  );

CREATE POLICY "notification_configs_select_tenant" ON notification_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = notification_configs.tenant_id
    )
  );

CREATE POLICY "notification_configs_insert_admin" ON notification_configs
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'role' = 'service_role') OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = notification_configs.tenant_id
      AND profiles.role = 'ADMIN'
    ))
  );

-- Service-role policies for the other new tables
CREATE POLICY "service_role_all_email_templates" ON email_templates FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "service_role_all_notification_configs" ON notification_configs FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- SAMPLE DATA INSERTS (optional)
-- The front-end may seed these values on first-run; included here for convenience
-- ============================================

-- Insert common visa statuses if not exists
INSERT INTO visa_status(code, label)
SELECT v.code, v.label FROM (VALUES
  ('F1','F1'),('OPT','OPT'),('STEM_OPT','STEM OPT'),('H1B','H1B'),('H4','H4'),('H4_EAD','H4 EAD'),('GC_EAD','GC EAD'),('L1B','L1B'),('L2S','L2S'),('B1B2','B1/B2'),('J1','J1'),('TN','TN'),('E3','E3'),('GC','Green Card'),('USC','US Citizen')
) AS v(code,label)
WHERE NOT EXISTS (SELECT 1 FROM visa_status WHERE code = v.code);

-- Insert sample years_experience buckets
INSERT INTO years_experience(code, label)
SELECT y.code, y.label FROM (VALUES
  ('0','0'),('1_3','1 to 3'),('4_6','4 to 6'),('7_9','7 to 9'),('10_15','10 to 15'),('15_plus','15+')
) AS y(code,label)
WHERE NOT EXISTS (SELECT 1 FROM years_experience WHERE code = y.code);

-- Insert some default contact statuses
INSERT INTO contact_statuses(code, label)
SELECT s.code, s.label FROM (VALUES
  ('INITIAL','Initial Contact'),('SPOKE','Spoke to candidate'),('RESUME_PREP','Resume needs to be prepared'),('RESUME_DONE','Resume prepared and sent for review'),
  ('ASSIGNED','Assigned to Recruiter'),('MARKETING','Recruiter started marketing'),('PLACED','Placed into Job'),('DECLINED','Candidate declined marketing'),('VACATION','Candidate on vacation'),('NO_RESPONSE','Candidate not responding')
) AS s(code,label)
WHERE NOT EXISTS (SELECT 1 FROM contact_statuses WHERE code = s.code);

-- Insert some role types
INSERT INTO role_types(code,label)
SELECT r.code, r.label FROM (VALUES
  ('REMOTE','Remote'),('HYBRID','Hybrid Local'),('ONSITE','Onsite Local'),('RELOCATE','Open to Relocate')
) AS r(code,label)
WHERE NOT EXISTS (SELECT 1 FROM role_types WHERE code = r.code);

-- Insert referral sources
INSERT INTO referral_sources(code,label)
SELECT f.code, f.label FROM (VALUES
  ('FB','Facebook'),('GOOGLE','Google'),('FRIEND','Friend')
) AS f(code,label)
WHERE NOT EXISTS (SELECT 1 FROM referral_sources WHERE code = f.code);

-- Insert a small set of IT job titles (the UI can seed more if needed)
INSERT INTO job_titles(category,title)
SELECT j.category, j.title FROM (VALUES
  ('IT','Java Back End Developer'),('IT','Java Full Stack Developer'),('IT','Dotnet Developer'),('IT','Python Developer'),('IT','Data Analyst'),('IT','AWS Data Engineer'),('IT','Azure Data Engineer'),('IT','GCP Data Engineer')
) AS j(category,title)
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE category = j.category AND title = j.title LIMIT 1);

-- ============================================
-- END
-- ============================================
