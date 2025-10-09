-- ============================================
-- STAFFING CRM - COMPLETE DATABASE SCHEMA
-- Combined Migration Script
-- This script combines all migrations (001-013) into one comprehensive file
-- Run this on a fresh Supabase database to set up the entire CRM system
-- ============================================
-- 
-- INCLUDES:
-- - Core schema (tenants, profiles, subscriptions, payments)
-- - RLS policies for multi-tenancy
-- - Tenant invites system
-- - CRM contacts and reference tables
-- - Contact status history tracking
-- - Pipelines and kanban boards
-- - Multi-business support
-- - User feedback/suggestions system
-- - Issue reports and bug tracking
-- - Reference data population (countries, states, job titles, etc.)
--
-- Created: October 8, 2025
-- Updated: October 9, 2025
-- Version: 1.3.0
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PART 1: CORE SCHEMA (from 001_initial_schema.sql)
-- ============================================

-- TENANTS: Stores company/organization information
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     text NOT NULL,
  status           text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- PROFILES: One-to-one relationship with auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            text NOT NULL,
  username         text,
  tenant_id        uuid REFERENCES tenants(tenant_id) ON DELETE SET NULL,
  role             text DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'SUPER_ADMIN')),
  status           text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED')),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- EMAIL TOKENS: For custom email verification and password reset flows
CREATE TABLE IF NOT EXISTS email_tokens (
  token_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES profiles(id) ON DELETE CASCADE,
  token            text NOT NULL UNIQUE,
  token_type       text NOT NULL CHECK (token_type IN ('VERIFY', 'RESET')),
  expires_at       timestamptz NOT NULL,
  used             boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

-- SUBSCRIPTIONS: Tracks tenant subscription plans and billing
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  plan_name        text NOT NULL CHECK (plan_name IN ('FREE', 'CRM', 'SUITE')),
  billing_cycle    text NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
  status           text NOT NULL CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE')),
  start_date       timestamptz,
  end_date         timestamptz,
  promo_code       text,
  amount_paid      numeric(10,2),
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- PAYMENTS / INVOICES: Records all payment transactions
CREATE TABLE IF NOT EXISTS payments (
  payment_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid REFERENCES tenants(tenant_id) ON DELETE SET NULL,
  subscription_id  uuid REFERENCES subscriptions(subscription_id) ON DELETE SET NULL,
  amount           numeric(10,2) NOT NULL,
  currency         text DEFAULT 'usd',
  status           text CHECK (status IN ('SUCCEEDED', 'FAILED', 'PENDING', 'REFUNDED')),
  provider_txn_id  text,
  payment_method   text,
  created_at       timestamptz DEFAULT now()
);

-- PROMO CODES: Promotional discount codes
CREATE TABLE IF NOT EXISTS promo_codes (
  code             text PRIMARY KEY,
  discount_percent numeric(5,2) CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount  numeric(10,2),
  max_uses         integer,
  current_uses     integer DEFAULT 0,
  expires_at       timestamptz,
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

-- AUDIT LOGS: Tracks all important actions for compliance and debugging
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid,
  tenant_id        uuid,
  action           text NOT NULL,
  resource_type    text,
  resource_id      uuid,
  details          jsonb,
  ip_address       inet,
  user_agent       text,
  created_at       timestamptz DEFAULT now()
);

-- ============================================
-- PART 2: TENANT INVITES (from 005_tenant_invites.sql)
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_invites (
  invite_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  role text DEFAULT 'USER' CHECK (role IN ('ADMIN','USER')),
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','EXPIRED','REVOKED')),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- PART 3: BUSINESSES TABLE (Multi-business support from 011)
-- ============================================

CREATE TABLE IF NOT EXISTS businesses (
  business_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE NOT NULL,
  business_name text NOT NULL,
  business_type text NOT NULL CHECK (business_type IN ('IT_STAFFING','HEALTHCARE_STAFFING','GENERAL','OTHER')),
  description text,
  industry text,
  enabled_contact_types text[] DEFAULT ARRAY['IT_CANDIDATE','HEALTHCARE_CANDIDATE','VENDOR_CLIENT','VENDOR_EMPANELMENT','EMPLOYEE_INDIA','EMPLOYEE_USA'],
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, business_name)
);

-- ============================================
-- PART 4: CRM REFERENCE TABLES (from 007_crm_contacts_schema.sql)
-- ============================================

-- VISA STATUS
CREATE TABLE IF NOT EXISTS visa_status (
  visa_status_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- JOB TITLES
CREATE TABLE IF NOT EXISTS job_titles (
  job_title_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('IT','HEALTHCARE')),
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- REASONS FOR CONTACT
CREATE TABLE IF NOT EXISTS reasons_for_contact (
  reason_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL
);

-- CONTACT STATUSES
CREATE TABLE IF NOT EXISTS contact_statuses (
  status_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL
);

-- ROLE TYPES
CREATE TABLE IF NOT EXISTS role_types (
  role_type_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL
);

-- COUNTRIES (Global - no tenant/business scoping)
CREATE TABLE IF NOT EXISTS countries (
  country_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL
);

-- STATES (Global - linked to countries)
CREATE TABLE IF NOT EXISTS states (
  state_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES countries(country_id) ON DELETE CASCADE,
  code text,
  name text NOT NULL
);

-- CITIES (Global - linked to states)
CREATE TABLE IF NOT EXISTS cities (
  city_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid REFERENCES states(state_id) ON DELETE CASCADE,
  name text NOT NULL
);

-- YEARS EXPERIENCE
CREATE TABLE IF NOT EXISTS years_experience (
  years_experience_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL
);

-- REFERRAL SOURCES
CREATE TABLE IF NOT EXISTS referral_sources (
  referral_source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL
);

-- ============================================
-- PART 5: CONTACTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS contacts (
  contact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
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

-- CONTACT REASONS (Many-to-Many)
CREATE TABLE IF NOT EXISTS contact_reasons (
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE,
  reason_id uuid REFERENCES reasons_for_contact(reason_id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, reason_id)
);

-- CONTACT ROLE TYPES (Many-to-Many)
CREATE TABLE IF NOT EXISTS contact_role_types (
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE,
  role_type_id uuid REFERENCES role_types(role_type_id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, role_type_id)
);

-- CONTACT ATTACHMENTS
CREATE TABLE IF NOT EXISTS contact_attachments (
  attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text,
  description text,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- CONTACT COMMENTS
CREATE TABLE IF NOT EXISTS contact_comments (
  comment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  comment_text text NOT NULL,
  comment_type text DEFAULT 'GENERAL' CHECK (comment_type IN ('GENERAL', 'STATUS_CHANGE')),
  related_status_history_id uuid,
  created_at timestamptz DEFAULT now()
);

-- EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS email_templates (
  template_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text,
  body_html text,
  body_text text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, lower(name))
);

-- NOTIFICATION CONFIGS
CREATE TABLE IF NOT EXISTS notification_configs (
  config_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_event text NOT NULL,
  trigger_value text,
  email_template_id uuid REFERENCES email_templates(template_id) ON DELETE SET NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('CANDIDATE','RECRUITER','CUSTOM')),
  custom_recipients jsonb,
  enabled boolean DEFAULT true,
  send_immediately boolean DEFAULT true,
  schedule jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- DATA POPULATION: REFERENCE TABLES
-- ============================================

-- Visa Status
INSERT INTO visa_status (code, label, tenant_id, business_id) 
SELECT code, label, NULL, NULL FROM (VALUES
  ('F1', 'F1'),
  ('OPT', 'OPT'),
  ('STEM_OPT', 'STEM OPT'),
  ('H1B', 'H1B'),
  ('H4', 'H4'),
  ('H4_EAD', 'H4 EAD'),
  ('GC_EAD', 'GC EAD'),
  ('L1B', 'L1B'),
  ('L2S', 'L2S'),
  ('B1_B2', 'B1/B2'),
  ('J1', 'J1'),
  ('TN', 'TN'),
  ('E3', 'E3'),
  ('GC', 'GC'),
  ('USC', 'USC')
) AS t(code, label)
ON CONFLICT DO NOTHING;

-- Job Titles (IT and Healthcare)
INSERT INTO job_titles (category, title, tenant_id, business_id)
SELECT category, title, NULL, NULL FROM (VALUES
  ('IT', 'Java Back End Developer'),
  ('IT', 'Java Full Stack Developer'),
  ('IT', 'Dotnet Developer'),
  ('IT', 'Python Developer'),
  ('IT', 'Data Analyst'),
  ('IT', 'AWS Data Engineer'),
  ('IT', 'Azure Data Engineer'),
  ('IT', 'GCP Data Engineer'),
  ('IT', 'Big Data Developer'),
  ('IT', 'Power BI Developer'),
  ('IT', 'Qliksense Developer'),
  ('IT', 'Tableau Developer'),
  ('IT', 'Informatica Developer'),
  ('IT', 'Talend Developer'),
  ('IT', 'Abinitio Developer'),
  ('IT', 'Oracle PL/SQL Developer'),
  ('IT', 'Oracle Apex Developer'),
  ('IT', 'Oracle EBS Techno-functional consultant'),
  ('IT', 'Oracle EBS Functional consultant'),
  ('IT', 'Business Analyst'),
  ('IT', 'Manual QA'),
  ('IT', 'Automation QA'),
  ('IT', 'ETL Tester'),
  ('IT', 'iOS Developer'),
  ('IT', 'Android Developer'),
  ('IT', 'AWS Devops'),
  ('IT', 'Azure Devops'),
  ('IT', 'GCP Devops'),
  ('IT', 'Manhattan WMS'),
  ('IT', 'Embedded Engineer'),
  ('IT', 'Servicenow Admin'),
  ('IT', 'Servicenow Developer'),
  ('IT', 'Oracle DBA'),
  ('IT', 'SQL DBA'),
  ('IT', 'Scrum Master'),
  ('IT', 'Project Manager'),
  ('IT', 'Mainframe Developer'),
  ('IT', 'Mainframe Architect'),
  ('HEALTHCARE', 'Licensed Practical Nurse(LPN)'),
  ('HEALTHCARE', 'GNA'),
  ('HEALTHCARE', 'Registered nurse (RN)'),
  ('HEALTHCARE', 'Respiratory Therapist (RRT)'),
  ('HEALTHCARE', 'Nurse Practitioner (NP)')
) AS t(category, title)
ON CONFLICT DO NOTHING;

-- Reasons for Contact
INSERT INTO reasons_for_contact (code, label, tenant_id, business_id)
SELECT code, label, NULL, NULL FROM (VALUES
  ('TRAINING_PLACEMENT', 'Training and Placement'),
  ('MARKETING_PLACEMENT', 'Marketing and Placement'),
  ('H1B_SPONSORSHIP', 'H1B Sponsorship'),
  ('H1B_TRANSFER', 'H1B Transfer'),
  ('GC_PROCESSING', 'GC Processing')
) AS t(code, label)
ON CONFLICT DO NOTHING;

-- Contact Statuses
INSERT INTO contact_statuses (code, label, tenant_id, business_id)
SELECT code, label, NULL, NULL FROM (VALUES
  ('INITIAL_CONTACT', 'Initial Contact'),
  ('SPOKE_TO_CANDIDATE', 'Spoke to candidate'),
  ('RESUME_NEEDS_PREP', 'Resume needs to be prepared'),
  ('RESUME_PREPARED', 'Resume prepared and sent for review'),
  ('ASSIGNED_TO_RECRUITER', 'Assigned to Recruiter'),
  ('RECRUITER_MARKETING', 'Recruiter started marketing'),
  ('PLACED', 'Placed into Job'),
  ('DECLINED_MARKETING', 'Candidate declined marketing'),
  ('ON_VACATION', 'Candidate on vacation'),
  ('NOT_RESPONDING', 'Candidate not responding'),
  ('EXCLUSIVE_ROLES', 'Exclusive roles only')
) AS t(code, label)
ON CONFLICT DO NOTHING;

-- Role Types
INSERT INTO role_types (code, label, tenant_id, business_id)
SELECT code, label, NULL, NULL FROM (VALUES
  ('REMOTE', 'Remote'),
  ('HYBRID_LOCAL', 'Hybrid Local'),
  ('ONSITE_LOCAL', 'Onsite Local'),
  ('RELOCATE', 'Open to Relocate')
) AS t(code, label)
ON CONFLICT DO NOTHING;

-- Countries
INSERT INTO countries (code, name)
SELECT code, name FROM (VALUES
  ('USA', 'USA'),
  ('INDIA', 'India')
) AS t(code, name)
ON CONFLICT DO NOTHING;

-- USA States
INSERT INTO states (country_id, code, name)
SELECT c.country_id, t.code, t.name
FROM countries c
CROSS JOIN (VALUES
  ('AL', 'Alabama'),
  ('AK', 'Alaska'),
  ('AZ', 'Arizona'),
  ('AR', 'Arkansas'),
  ('CA', 'California'),
  ('CO', 'Colorado'),
  ('CT', 'Connecticut'),
  ('DE', 'Delaware'),
  ('FL', 'Florida'),
  ('GA', 'Georgia'),
  ('HI', 'Hawaii'),
  ('ID', 'Idaho'),
  ('IL', 'Illinois'),
  ('IN', 'Indiana'),
  ('IA', 'Iowa'),
  ('KS', 'Kansas'),
  ('KY', 'Kentucky'),
  ('LA', 'Louisiana'),
  ('ME', 'Maine'),
  ('MD', 'Maryland'),
  ('MA', 'Massachusetts'),
  ('MI', 'Michigan'),
  ('MN', 'Minnesota'),
  ('MS', 'Mississippi'),
  ('MO', 'Missouri'),
  ('MT', 'Montana'),
  ('NE', 'Nebraska'),
  ('NV', 'Nevada'),
  ('NH', 'New Hampshire'),
  ('NJ', 'New Jersey'),
  ('NM', 'New Mexico'),
  ('NY', 'New York'),
  ('NC', 'North Carolina'),
  ('ND', 'North Dakota'),
  ('OH', 'Ohio'),
  ('OK', 'Oklahoma'),
  ('OR', 'Oregon'),
  ('PA', 'Pennsylvania'),
  ('RI', 'Rhode Island'),
  ('SC', 'South Carolina'),
  ('SD', 'South Dakota'),
  ('TN', 'Tennessee'),
  ('TX', 'Texas'),
  ('UT', 'Utah'),
  ('VT', 'Vermont'),
  ('VA', 'Virginia'),
  ('WA', 'Washington'),
  ('WV', 'West Virginia'),
  ('WI', 'Wisconsin'),
  ('WY', 'Wyoming')
) AS t(code, name)
WHERE c.code = 'USA'
ON CONFLICT DO NOTHING;

-- India States
INSERT INTO states (country_id, code, name)
SELECT c.country_id, NULL, t.name
FROM countries c
CROSS JOIN (VALUES
  ('Andhra Pradesh'),
  ('Arunachal Pradesh'),
  ('Assam'),
  ('Bihar'),
  ('Chhattisgarh'),
  ('Goa'),
  ('Gujarat'),
  ('Haryana'),
  ('Himachal Pradesh'),
  ('Jharkhand'),
  ('Karnataka'),
  ('Kerala'),
  ('Madhya Pradesh'),
  ('Maharashtra'),
  ('Manipur'),
  ('Meghalaya'),
  ('Mizoram'),
  ('Nagaland'),
  ('Odisha'),
  ('Punjab'),
  ('Rajasthan'),
  ('Sikkim'),
  ('Tamil Nadu'),
  ('Telangana'),
  ('Tripura'),
  ('Uttar Pradesh'),
  ('Uttarakhand'),
  ('West Bengal')
) AS t(name)
WHERE c.code = 'INDIA'
ON CONFLICT DO NOTHING;

-- Years of Experience
INSERT INTO years_experience (code, label, tenant_id, business_id)
SELECT code, label, NULL, NULL FROM (VALUES
  ('0', '0'),
  ('1_3', '1 to 3'),
  ('4_6', '4 to 6'),
  ('7_9', '7 to 9'),
  ('10_15', '10 to 15'),
  ('15_PLUS', '15+')
) AS t(code, label)
ON CONFLICT DO NOTHING;

-- Referral Sources
INSERT INTO referral_sources (code, label, tenant_id, business_id)
SELECT code, label, NULL, NULL FROM (VALUES
  ('FB', 'FB'),
  ('GOOGLE', 'Google'),
  ('FRIEND', 'Friend')
) AS t(code, label)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 6: CONTACT STATUS HISTORY (from 008)
-- ============================================

CREATE TABLE IF NOT EXISTS contact_status_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  old_status text,
  new_status text NOT NULL,
  remarks text NOT NULL,
  changed_at timestamptz DEFAULT now()
);

-- Add foreign key for related_status_history_id after table creation
ALTER TABLE contact_comments 
ADD CONSTRAINT fk_contact_comments_status_history 
FOREIGN KEY (related_status_history_id) 
REFERENCES contact_status_history(history_id) ON DELETE SET NULL;

-- ============================================
-- PART 7: PIPELINES (from 010_pipelines_schema.sql)
-- ============================================

-- PIPELINES
CREATE TABLE IF NOT EXISTS pipelines (
  pipeline_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#4F46E5',
  icon text,
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- PIPELINE STAGES
CREATE TABLE IF NOT EXISTS pipeline_stages (
  stage_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES pipelines(pipeline_id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366F1',
  display_order integer DEFAULT 0,
  is_final boolean DEFAULT false,
  automation_rules jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pipeline_id, name)
);

-- CONTACT PIPELINE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS contact_pipeline_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE NOT NULL,
  pipeline_id uuid REFERENCES pipelines(pipeline_id) ON DELETE CASCADE NOT NULL,
  stage_id uuid REFERENCES pipeline_stages(stage_id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  last_stage_change timestamptz DEFAULT now(),
  notes text,
  UNIQUE(contact_id, pipeline_id)
);

-- PIPELINE STAGE HISTORY
CREATE TABLE IF NOT EXISTS pipeline_stage_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES contact_pipeline_assignments(assignment_id) ON DELETE CASCADE NOT NULL,
  from_stage_id uuid REFERENCES pipeline_stages(stage_id) ON DELETE SET NULL,
  to_stage_id uuid REFERENCES pipeline_stages(stage_id) ON DELETE SET NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- ============================================
-- PART 8: USER FEEDBACK (from 012_user_feedback.sql)
-- ============================================

-- USER FEEDBACK: Stores user suggestions, ideas, and feedback
CREATE TABLE IF NOT EXISTS user_feedback (
  feedback_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED')),
  priority text CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  category text CHECK (category IN ('BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'QUESTION', 'OTHER')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_feedback IS 'Stores user suggestions, ideas, and feedback';

-- ============================================
-- PART 9: ISSUE REPORTS (from 013_issue_reports.sql)
-- ============================================

-- ISSUE REPORTS: Stores user-reported issues and bugs
CREATE TABLE IF NOT EXISTS issue_reports (
  issue_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  issue_type text CHECK (issue_type IN ('BUG', 'UI_ISSUE', 'PERFORMANCE', 'DATA_ERROR', 'FEATURE_NOT_WORKING', 'OTHER')),
  page_url text,
  browser_info text,
  screenshot_url text,
  steps_to_reproduce text,
  expected_behavior text,
  actual_behavior text,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'DUPLICATE', 'WONT_FIX')),
  priority text CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes text,
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE issue_reports IS 'Stores user-reported issues, bugs, and problems with the application';

-- ============================================
-- PART 10: INDEXES
-- ============================================

-- Core tables
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant ON tenant_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_email ON tenant_invites(lower(email));

-- Business tables
CREATE INDEX IF NOT EXISTS idx_businesses_tenant ON businesses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(tenant_id, is_active);

-- CRM reference tables
CREATE INDEX IF NOT EXISTS idx_visa_status_business ON visa_status(business_id);
CREATE INDEX IF NOT EXISTS idx_job_titles_business ON job_titles(business_id);
CREATE INDEX IF NOT EXISTS idx_reasons_for_contact_business ON reasons_for_contact(business_id);
CREATE INDEX IF NOT EXISTS idx_contact_statuses_business ON contact_statuses(business_id);
CREATE INDEX IF NOT EXISTS idx_role_types_business ON role_types(business_id);
CREATE INDEX IF NOT EXISTS idx_years_experience_business ON years_experience(business_id);
CREATE INDEX IF NOT EXISTS idx_referral_sources_business ON referral_sources(business_id);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_business ON contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status_id);
CREATE INDEX IF NOT EXISTS idx_contacts_jobtitle ON contacts(job_title_id);
CREATE INDEX IF NOT EXISTS idx_contact_attachments_contact ON contact_attachments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_comments_contact ON contact_comments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_comments_type ON contact_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_status_history_contact ON contact_status_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON contact_status_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_business ON email_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_notification_configs_business ON notification_configs(business_id);

-- Pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_business ON pipelines(business_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_is_default ON pipelines(tenant_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(pipeline_id, display_order);
CREATE INDEX IF NOT EXISTS idx_contact_pipeline_contact ON contact_pipeline_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_pipeline_pipeline ON contact_pipeline_assignments(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_contact_pipeline_stage ON contact_pipeline_assignments(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_assignment ON pipeline_stage_history(assignment_id);

-- User Feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_tenant_id ON user_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- Issue Reports
CREATE INDEX IF NOT EXISTS idx_issue_reports_tenant_id ON issue_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_user_id ON issue_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_severity ON issue_reports(severity);
CREATE INDEX IF NOT EXISTS idx_issue_reports_created_at ON issue_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_reports_assigned_to ON issue_reports(assigned_to);

-- ============================================
-- PART 11: UNIQUE CONSTRAINTS
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS ux_profiles_email ON profiles(lower(email));

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_configs_updated_at BEFORE UPDATE ON notification_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_feedback_updated_at BEFORE UPDATE ON user_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_issue_reports_updated_at BEFORE UPDATE ON issue_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure single default business per tenant
CREATE OR REPLACE FUNCTION ensure_default_business()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE businesses
    SET is_default = false
    WHERE tenant_id = NEW.tenant_id
      AND business_id != NEW.business_id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_default_business_trigger
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_default_business();

-- Log contact status changes
CREATE OR REPLACE FUNCTION log_contact_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status_id IS DISTINCT FROM NEW.status_id) THEN
    INSERT INTO contact_status_history (
      contact_id,
      changed_by,
      old_status,
      new_status,
      remarks
    ) VALUES (
      NEW.contact_id,
      auth.uid(),
      (SELECT code FROM contact_statuses WHERE status_id = OLD.status_id),
      (SELECT code FROM contact_statuses WHERE status_id = NEW.status_id),
      COALESCE(NEW.remarks, 'Status changed via database update')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_contact_status_change
  AFTER UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION log_contact_status_change();

-- Track pipeline stage changes
CREATE OR REPLACE FUNCTION track_pipeline_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO pipeline_stage_history (
      assignment_id,
      from_stage_id,
      to_stage_id,
      changed_by,
      changed_at
    ) VALUES (
      NEW.assignment_id,
      OLD.stage_id,
      NEW.stage_id,
      NEW.assigned_by,
      now()
    );
    NEW.last_stage_change := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_stage_change_trigger
  BEFORE UPDATE ON contact_pipeline_assignments
  FOR EACH ROW
  EXECUTE FUNCTION track_pipeline_stage_change();

-- Ensure single default pipeline per tenant
CREATE OR REPLACE FUNCTION ensure_single_default_pipeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE pipelines 
    SET is_default = false 
    WHERE tenant_id = NEW.tenant_id 
      AND pipeline_id != NEW.pipeline_id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_default_pipeline_trigger
  BEFORE INSERT OR UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_pipeline();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user is tenant admin
CREATE OR REPLACE FUNCTION is_tenant_admin(check_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND tenant_id = check_tenant_id
    AND role = 'ADMIN'
    AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get default business for a tenant
CREATE OR REPLACE FUNCTION get_default_business(p_tenant_id uuid)
RETURNS uuid AS $$
  SELECT business_id
  FROM businesses
  WHERE tenant_id = p_tenant_id
  AND is_default = true
  AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Get all active businesses for a tenant
CREATE OR REPLACE FUNCTION get_tenant_businesses(p_tenant_id uuid)
RETURNS TABLE (
  business_id uuid,
  business_name text,
  business_type text,
  is_default boolean
) AS $$
  SELECT business_id, business_name, business_type, is_default
  FROM businesses
  WHERE tenant_id = p_tenant_id
  AND is_active = true
  ORDER BY is_default DESC, business_name;
$$ LANGUAGE sql STABLE;

-- Get pipeline statistics
CREATE OR REPLACE FUNCTION get_pipeline_stats(p_pipeline_id uuid)
RETURNS TABLE (
  stage_id uuid,
  stage_name text,
  contact_count bigint,
  avg_time_in_stage interval
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.stage_id,
    ps.name as stage_name,
    COUNT(cpa.assignment_id) as contact_count,
    AVG(now() - cpa.last_stage_change) as avg_time_in_stage
  FROM pipeline_stages ps
  LEFT JOIN contact_pipeline_assignments cpa ON cpa.stage_id = ps.stage_id
  WHERE ps.pipeline_id = p_pipeline_id
  GROUP BY ps.stage_id, ps.name, ps.display_order
  ORDER BY ps.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Move contact to different stage
CREATE OR REPLACE FUNCTION move_contact_to_stage(
  p_contact_id uuid,
  p_pipeline_id uuid,
  p_new_stage_id uuid,
  p_changed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  SELECT assignment_id INTO v_assignment_id
  FROM contact_pipeline_assignments
  WHERE contact_id = p_contact_id AND pipeline_id = p_pipeline_id;
  
  IF v_assignment_id IS NULL THEN
    INSERT INTO contact_pipeline_assignments (
      contact_id, pipeline_id, stage_id, assigned_by, notes
    ) VALUES (
      p_contact_id, p_pipeline_id, p_new_stage_id, p_changed_by, p_notes
    )
    RETURNING assignment_id INTO v_assignment_id;
  ELSE
    UPDATE contact_pipeline_assignments
    SET stage_id = p_new_stage_id,
        assigned_by = p_changed_by,
        notes = COALESCE(p_notes, notes)
    WHERE assignment_id = v_assignment_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing data to default business
CREATE OR REPLACE FUNCTION migrate_to_default_business()
RETURNS void AS $$
DECLARE
  tenant_rec RECORD;
  default_bus_id uuid;
BEGIN
  FOR tenant_rec IN SELECT DISTINCT tenant_id FROM tenants
  LOOP
    SELECT business_id INTO default_bus_id
    FROM businesses
    WHERE tenant_id = tenant_rec.tenant_id
    AND is_default = true
    LIMIT 1;
    
    IF default_bus_id IS NULL THEN
      INSERT INTO businesses (tenant_id, business_name, business_type, is_default)
      VALUES (tenant_rec.tenant_id, 'Default Business', 'GENERAL', true)
      RETURNING business_id INTO default_bus_id;
    END IF;
    
    UPDATE contacts SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE visa_status SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE job_titles SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE reasons_for_contact SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE contact_statuses SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE role_types SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE years_experience SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE referral_sources SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE email_templates SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE notification_configs SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE pipelines SET business_id = default_bus_id WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE contact_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_pipeline_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stage_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - PROFILES
-- ============================================

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_service_role_all" ON profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- RLS POLICIES - TENANTS
-- ============================================

CREATE POLICY "tenants_select_own" ON tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.tenant_id = tenants.tenant_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "tenants_update_admin" ON tenants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.tenant_id = tenants.tenant_id
      AND profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "tenants_insert_own" ON tenants
  FOR INSERT WITH CHECK (true); -- Allow during registration

CREATE POLICY "tenants_service_role_all" ON tenants
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- RLS POLICIES - BUSINESSES
-- ============================================

CREATE POLICY "businesses_service_role_all" ON businesses
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "businesses_select_tenant" ON businesses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = businesses.tenant_id
    )
  );

CREATE POLICY "businesses_insert_admin" ON businesses
  FOR INSERT
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role') OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = businesses.tenant_id
      AND profiles.role = 'ADMIN'
    ))
  );

CREATE POLICY "businesses_update_admin" ON businesses
  FOR UPDATE
  USING (
    (auth.jwt()->>'role' = 'service_role') OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = businesses.tenant_id
      AND profiles.role = 'ADMIN'
    ))
  );

CREATE POLICY "businesses_delete_admin" ON businesses
  FOR DELETE
  USING (
    (auth.jwt()->>'role' = 'service_role') OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = businesses.tenant_id
      AND profiles.role = 'ADMIN'
    ))
  );

-- ============================================
-- RLS POLICIES - CONTACTS
-- ============================================

CREATE POLICY "service_role_all_contacts" ON contacts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

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

-- ============================================
-- RLS POLICIES - REFERENCE TABLES (Business-Scoped)
-- ============================================

-- Global reference tables (countries, states, cities)
CREATE POLICY "refs_select_countries" ON countries FOR SELECT USING (true);
CREATE POLICY "refs_select_states" ON states FOR SELECT USING (true);
CREATE POLICY "refs_select_cities" ON cities FOR SELECT USING (true);

-- Business-scoped reference tables
CREATE POLICY "visa_status_select_business" ON visa_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.tenant_id = b.tenant_id
      WHERE p.id = auth.uid()
      AND (visa_status.business_id = b.business_id OR visa_status.business_id IS NULL)
    )
  );

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

CREATE POLICY "reasons_select_business" ON reasons_for_contact
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.tenant_id = b.tenant_id
      WHERE p.id = auth.uid()
      AND (reasons_for_contact.business_id = b.business_id OR reasons_for_contact.business_id IS NULL)
    )
  );

CREATE POLICY "statuses_select_business" ON contact_statuses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.tenant_id = b.tenant_id
      WHERE p.id = auth.uid()
      AND (contact_statuses.business_id = b.business_id OR contact_statuses.business_id IS NULL)
    )
  );

CREATE POLICY "role_types_select_business" ON role_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.tenant_id = b.tenant_id
      WHERE p.id = auth.uid()
      AND (role_types.business_id = b.business_id OR role_types.business_id IS NULL)
    )
  );

CREATE POLICY "years_exp_select_business" ON years_experience
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.tenant_id = b.tenant_id
      WHERE p.id = auth.uid()
      AND (years_experience.business_id = b.business_id OR years_experience.business_id IS NULL)
    )
  );

CREATE POLICY "referrals_select_business" ON referral_sources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.tenant_id = b.tenant_id
      WHERE p.id = auth.uid()
      AND (referral_sources.business_id = b.business_id OR referral_sources.business_id IS NULL)
    )
  );

-- ============================================
-- RLS POLICIES - CONTACT ATTACHMENTS & COMMENTS
-- ============================================

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

-- ============================================
-- RLS POLICIES - PIPELINES
-- ============================================

CREATE POLICY "pipelines_service_role_all" ON pipelines
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "pipelines_select_tenant" ON pipelines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pipelines.tenant_id
    )
  );

CREATE POLICY "pipelines_insert_admin" ON pipelines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pipelines.tenant_id
      AND profiles.role IN ('tenant_admin', 'ADMIN')
    )
  );

CREATE POLICY "pipelines_update_admin" ON pipelines
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pipelines.tenant_id
      AND profiles.role IN ('tenant_admin', 'ADMIN')
    )
  );

CREATE POLICY "pipelines_delete_admin" ON pipelines
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pipelines.tenant_id
      AND profiles.role IN ('tenant_admin', 'ADMIN')
    )
  );

-- ============================================
-- RLS POLICIES - PIPELINE STAGES
-- ============================================

CREATE POLICY "pipeline_stages_service_role_all" ON pipeline_stages
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "pipeline_stages_select_tenant" ON pipeline_stages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipelines p
      JOIN profiles prof ON prof.tenant_id = p.tenant_id
      WHERE p.pipeline_id = pipeline_stages.pipeline_id
      AND prof.id = auth.uid()
    )
  );

CREATE POLICY "pipeline_stages_insert_admin" ON pipeline_stages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipelines p
      JOIN profiles prof ON prof.tenant_id = p.tenant_id
      WHERE p.pipeline_id = pipeline_stages.pipeline_id
      AND prof.id = auth.uid()
      AND prof.role IN ('tenant_admin', 'ADMIN')
    )
  );

CREATE POLICY "pipeline_stages_update_admin" ON pipeline_stages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pipelines p
      JOIN profiles prof ON prof.tenant_id = p.tenant_id
      WHERE p.pipeline_id = pipeline_stages.pipeline_id
      AND prof.id = auth.uid()
      AND prof.role IN ('tenant_admin', 'ADMIN')
    )
  );

CREATE POLICY "pipeline_stages_delete_admin" ON pipeline_stages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pipelines p
      JOIN profiles prof ON prof.tenant_id = p.tenant_id
      WHERE p.pipeline_id = pipeline_stages.pipeline_id
      AND prof.id = auth.uid()
      AND prof.role IN ('tenant_admin', 'ADMIN')
    )
  );

-- ============================================
-- RLS POLICIES - CONTACT PIPELINE ASSIGNMENTS
-- ============================================

CREATE POLICY "contact_pipeline_service_role_all" ON contact_pipeline_assignments
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "contact_pipeline_select_tenant" ON contact_pipeline_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN profiles prof ON prof.tenant_id = c.tenant_id
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
      AND prof.id = auth.uid()
    )
  );

CREATE POLICY "contact_pipeline_insert_member" ON contact_pipeline_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN profiles prof ON prof.tenant_id = c.tenant_id
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
      AND prof.id = auth.uid()
    )
  );

CREATE POLICY "contact_pipeline_update_member" ON contact_pipeline_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN profiles prof ON prof.tenant_id = c.tenant_id
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
      AND prof.id = auth.uid()
    )
  );

CREATE POLICY "contact_pipeline_delete_admin" ON contact_pipeline_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN profiles prof ON prof.tenant_id = c.tenant_id
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
      AND prof.id = auth.uid()
      AND prof.role IN ('tenant_admin', 'ADMIN')
    )
  );

-- ============================================
-- RLS POLICIES - PIPELINE STAGE HISTORY
-- ============================================

CREATE POLICY "pipeline_history_service_role_all" ON pipeline_stage_history
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "pipeline_history_select_tenant" ON pipeline_stage_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contact_pipeline_assignments cpa
      JOIN contacts c ON c.contact_id = cpa.contact_id
      JOIN profiles prof ON prof.tenant_id = c.tenant_id
      WHERE cpa.assignment_id = pipeline_stage_history.assignment_id
      AND prof.id = auth.uid()
    )
  );

CREATE POLICY "pipeline_history_insert_system" ON pipeline_stage_history
  FOR INSERT WITH CHECK (true);

-- ============================================
-- RLS POLICIES - STATUS HISTORY
-- ============================================

CREATE POLICY "status_history_select_tenant" ON contact_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.contact_id = contact_status_history.contact_id
        AND contacts.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "status_history_insert_member" ON contact_status_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.contact_id = contact_status_history.contact_id
        AND contacts.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ============================================
-- RLS POLICIES - OTHER TABLES
-- ============================================

-- Subscriptions
CREATE POLICY "subscriptions_select_tenant" ON subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = subscriptions.tenant_id
    )
  );

CREATE POLICY "subscriptions_service_role_all" ON subscriptions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Payments
CREATE POLICY "payments_select_tenant" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = payments.tenant_id
    )
  );

CREATE POLICY "payments_service_role_all" ON payments
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Promo codes
CREATE POLICY "promo_codes_select_all" ON promo_codes
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "promo_codes_service_role_all" ON promo_codes
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Email tokens
CREATE POLICY "email_tokens_select_own" ON email_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "email_tokens_service_role_all" ON email_tokens
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Audit logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = audit_logs.tenant_id
      AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "audit_logs_service_role_all" ON audit_logs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- RLS POLICIES - USER FEEDBACK
-- ============================================

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "user_feedback_select_own"
  ON user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "user_feedback_insert_own"
  ON user_feedback
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

-- Users can update their own feedback (only if status is NEW)
CREATE POLICY "user_feedback_update_own"
  ON user_feedback
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'NEW')
  WITH CHECK (auth.uid() = user_id AND status = 'NEW');

-- Admins can view all feedback for their tenant
CREATE POLICY "user_feedback_select_admin"
  ON user_feedback
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
    AND is_tenant_admin(auth.uid())
  );

-- Admins can update all feedback for their tenant
CREATE POLICY "user_feedback_update_admin"
  ON user_feedback
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
    AND is_tenant_admin(auth.uid())
  );

-- Super admins can view all feedback
CREATE POLICY "user_feedback_select_super_admin"
  ON user_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );

-- Super admins can update all feedback
CREATE POLICY "user_feedback_update_super_admin"
  ON user_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );

-- ============================================
-- RLS POLICIES - ISSUE REPORTS
-- ============================================

ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own issue reports
CREATE POLICY "issue_reports_select_own"
  ON issue_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own issue reports
CREATE POLICY "issue_reports_insert_own"
  ON issue_reports
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

-- Users can update their own issue reports (only if status is OPEN)
CREATE POLICY "issue_reports_update_own"
  ON issue_reports
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'OPEN')
  WITH CHECK (auth.uid() = user_id AND status = 'OPEN');

-- Admins can view all issue reports for their tenant
CREATE POLICY "issue_reports_select_admin"
  ON issue_reports
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
    AND is_tenant_admin(auth.uid())
  );

-- Admins can update all issue reports for their tenant
CREATE POLICY "issue_reports_update_admin"
  ON issue_reports
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
    AND is_tenant_admin(auth.uid())
  );

-- Super admins can view all issue reports
CREATE POLICY "issue_reports_select_super_admin"
  ON issue_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );

-- Super admins can update all issue reports
CREATE POLICY "issue_reports_update_super_admin"
  ON issue_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE tenants IS 'Stores tenant/company information for multi-tenancy';
COMMENT ON TABLE profiles IS 'User profiles linked to auth.users with tenant association';
COMMENT ON TABLE businesses IS 'Multiple businesses per tenant (e.g., IT Staffing, Healthcare Staffing)';
COMMENT ON TABLE subscriptions IS 'Subscription plans and billing information';
COMMENT ON TABLE payments IS 'Payment transaction records';
COMMENT ON TABLE promo_codes IS 'Promotional discount codes';
COMMENT ON TABLE email_tokens IS 'Email verification and password reset tokens';
COMMENT ON TABLE audit_logs IS 'Audit trail for compliance and debugging';
COMMENT ON TABLE contact_status_history IS 'Tracks all status changes for contacts with mandatory remarks';
COMMENT ON TABLE pipelines IS 'Workflow pipelines for managing contacts through stages';
COMMENT ON TABLE pipeline_stages IS 'Stages within pipelines (e.g., Lead, Qualified, Placed)';
COMMENT ON TABLE contact_pipeline_assignments IS 'Links contacts to pipelines with current stage';
COMMENT ON TABLE pipeline_stage_history IS 'Tracks movement of contacts between pipeline stages';

-- ============================================
-- END OF COMBINED SCHEMA
-- ============================================
