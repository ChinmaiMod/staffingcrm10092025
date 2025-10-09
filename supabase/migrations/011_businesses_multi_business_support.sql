-- ============================================
-- MULTI-BUSINESS SUPPORT
-- Adds businesses table and links all CRM entities to business_id
-- Allows one tenant to manage multiple businesses (e.g., IT Staffing, Healthcare Staffing)
-- Run this AFTER 010_pipelines_schema.sql
-- ============================================

-- ============================================
-- BUSINESSES TABLE
-- Multiple businesses per tenant with their own configurations
-- ============================================

CREATE TABLE IF NOT EXISTS businesses (
  business_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE NOT NULL,
  business_name text NOT NULL,
  business_type text NOT NULL CHECK (business_type IN ('IT_STAFFING','HEALTHCARE_STAFFING','GENERAL','OTHER')),
  description text,
  industry text, -- e.g., "Technology", "Healthcare", "Finance"
  
  -- Contact configuration
  enabled_contact_types text[] DEFAULT ARRAY['IT_CANDIDATE','HEALTHCARE_CANDIDATE','VENDOR_CLIENT','VENDOR_EMPANELMENT','EMPLOYEE_INDIA','EMPLOYEE_USA'],
  
  -- Business settings
  settings jsonb DEFAULT '{}'::jsonb, -- Flexible settings: email templates, branding, etc.
  
  -- Status
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false, -- One default business per tenant
  
  -- Metadata
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, business_name)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_businesses_tenant ON businesses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(tenant_id, is_active);

-- ============================================
-- UPDATE EXISTING TABLES TO ADD business_id
-- ============================================

-- Update contacts table: make business_id required with proper foreign key
ALTER TABLE contacts 
  DROP COLUMN IF EXISTS business_id CASCADE;
  
ALTER TABLE contacts
  ADD COLUMN business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;

-- Create index on business_id
CREATE INDEX IF NOT EXISTS idx_contacts_business ON contacts(business_id);

-- Update reference/lookup tables to be business-scoped

-- Visa Status - business scoped
ALTER TABLE visa_status
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;
  
CREATE INDEX IF NOT EXISTS idx_visa_status_business ON visa_status(business_id);

-- Job Titles - business scoped
ALTER TABLE job_titles
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;
  
CREATE INDEX IF NOT EXISTS idx_job_titles_business ON job_titles(business_id);

-- Reasons for Contact - business scoped
ALTER TABLE reasons_for_contact
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;
  
CREATE INDEX IF NOT EXISTS idx_reasons_for_contact_business ON reasons_for_contact(business_id);

-- Contact Statuses - business scoped
ALTER TABLE contact_statuses
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;
  
CREATE INDEX IF NOT EXISTS idx_contact_statuses_business ON contact_statuses(business_id);

-- Role Types - business scoped
ALTER TABLE role_types
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;
  
CREATE INDEX IF NOT EXISTS idx_role_types_business ON role_types(business_id);

-- Years Experience - business scoped
ALTER TABLE years_experience
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;
  
CREATE INDEX IF NOT EXISTS idx_years_experience_business ON years_experience(business_id);

-- Referral Sources - business scoped
ALTER TABLE referral_sources
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;
  
CREATE INDEX IF NOT EXISTS idx_referral_sources_business ON referral_sources(business_id);

-- Email Templates - business scoped
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;
  
CREATE INDEX IF NOT EXISTS idx_email_templates_business ON email_templates(business_id);

-- Notification Configs - business scoped
ALTER TABLE notification_configs
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;
  
CREATE INDEX IF NOT EXISTS idx_notification_configs_business ON notification_configs(business_id);

-- Pipelines - business scoped
ALTER TABLE pipelines
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(business_id) ON DELETE CASCADE;
  
CREATE INDEX IF NOT EXISTS idx_pipelines_business ON pipelines(business_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure only one default business per tenant
CREATE OR REPLACE FUNCTION ensure_default_business()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset all other defaults for this tenant
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

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY "service_role_all_businesses" ON businesses
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Tenant members can view businesses in their tenant
CREATE POLICY "businesses_select_tenant" ON businesses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = businesses.tenant_id
    )
  );

-- Admins can insert/update/delete businesses
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
  )
  WITH CHECK (
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
-- UPDATE RLS POLICIES FOR REFERENCE TABLES
-- Add business-level filtering
-- ============================================

-- Drop old policies and create new ones that include business_id

-- VISA STATUS
DROP POLICY IF EXISTS "refs_select_tenant_visa" ON visa_status;
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

-- JOB TITLES
DROP POLICY IF EXISTS "refs_select_tenant_job_titles" ON job_titles;
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

-- REASONS FOR CONTACT
DROP POLICY IF EXISTS "refs_select_tenant_reasons" ON reasons_for_contact;
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

-- CONTACT STATUSES
DROP POLICY IF EXISTS "refs_select_tenant_statuses" ON contact_statuses;
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

-- ROLE TYPES
DROP POLICY IF EXISTS "refs_select_tenant_role_types" ON role_types;
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

-- YEARS EXPERIENCE
DROP POLICY IF EXISTS "refs_select_tenant_years_exp" ON years_experience;
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

-- REFERRAL SOURCES
DROP POLICY IF EXISTS "refs_select_tenant_referrals" ON referral_sources;
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
-- HELPER FUNCTIONS
-- ============================================

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

-- ============================================
-- SAMPLE DATA MIGRATION
-- Migrate existing NULL business_id records to default business
-- ============================================

-- This function should be run AFTER creating at least one business per tenant
-- It will assign all existing records with NULL business_id to the default business

CREATE OR REPLACE FUNCTION migrate_to_default_business()
RETURNS void AS $$
DECLARE
  tenant_rec RECORD;
  default_bus_id uuid;
BEGIN
  -- Loop through all tenants
  FOR tenant_rec IN SELECT DISTINCT tenant_id FROM tenants
  LOOP
    -- Get or create default business for this tenant
    SELECT business_id INTO default_bus_id
    FROM businesses
    WHERE tenant_id = tenant_rec.tenant_id
    AND is_default = true
    LIMIT 1;
    
    -- If no default business exists, create one
    IF default_bus_id IS NULL THEN
      INSERT INTO businesses (tenant_id, business_name, business_type, is_default)
      VALUES (tenant_rec.tenant_id, 'Default Business', 'GENERAL', true)
      RETURNING business_id INTO default_bus_id;
    END IF;
    
    -- Update all records with NULL business_id
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
-- EXAMPLE: Create sample businesses
-- Run this after migration to set up your businesses
-- ============================================

-- Example for creating IT and Healthcare businesses:
/*
-- Get your tenant_id first:
SELECT tenant_id FROM tenants WHERE company_name = 'Your Company Name';

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
  'YOUR_TENANT_ID',
  'IT Staffing Division',
  'IT_STAFFING',
  'Technology and IT staffing services',
  'Technology',
  ARRAY['IT_CANDIDATE','VENDOR_CLIENT','EMPLOYEE_INDIA','EMPLOYEE_USA'],
  true  -- Set as default
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
  'YOUR_TENANT_ID',
  'Healthcare Staffing Division',
  'HEALTHCARE_STAFFING',
  'Healthcare and medical staffing services',
  'Healthcare',
  ARRAY['HEALTHCARE_CANDIDATE','VENDOR_CLIENT','EMPLOYEE_USA'],
  false
);

-- After creating businesses, run migration to move existing data:
SELECT migrate_to_default_business();

-- Create business-specific job titles for IT Business:
INSERT INTO job_titles (tenant_id, business_id, category, title)
SELECT 
  'YOUR_TENANT_ID',
  (SELECT business_id FROM businesses WHERE tenant_id = 'YOUR_TENANT_ID' AND business_type = 'IT_STAFFING'),
  'IT',
  title
FROM (VALUES
  ('Java Developer'),
  ('Python Developer'),
  ('Data Engineer'),
  ('DevOps Engineer')
) AS t(title);

-- Create business-specific job titles for Healthcare Business:
INSERT INTO job_titles (tenant_id, business_id, category, title)
SELECT 
  'YOUR_TENANT_ID',
  (SELECT business_id FROM businesses WHERE tenant_id = 'YOUR_TENANT_ID' AND business_type = 'HEALTHCARE_STAFFING'),
  'HEALTHCARE',
  title
FROM (VALUES
  ('Registered Nurse (RN)'),
  ('Licensed Practical Nurse (LPN)'),
  ('Nurse Practitioner (NP)'),
  ('Respiratory Therapist (RRT)')
) AS t(title);
*/

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE businesses IS 'Multiple businesses per tenant (e.g., IT Staffing, Healthcare Staffing)';
COMMENT ON COLUMN businesses.enabled_contact_types IS 'Array of contact types allowed for this business';
COMMENT ON COLUMN businesses.settings IS 'Flexible JSON settings for business-specific configurations';
COMMENT ON FUNCTION ensure_default_business() IS 'Ensures only one default business per tenant';
COMMENT ON FUNCTION get_default_business(uuid) IS 'Returns the default business_id for a tenant';
COMMENT ON FUNCTION get_tenant_businesses(uuid) IS 'Returns all active businesses for a tenant';
COMMENT ON FUNCTION migrate_to_default_business() IS 'Migrates existing NULL business_id records to default business';

-- ============================================
-- END
-- ============================================
