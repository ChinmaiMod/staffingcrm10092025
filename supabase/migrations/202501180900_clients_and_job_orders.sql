-- ============================================
-- CRM: Clients and Job Orders Feature
-- Adds clients table, job_orders table, extends contact_type with client_contact and job_order_applicant,
-- and adds client_id to contacts for linking contacts to clients
-- ============================================

-- Enable extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  client_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE SET NULL,
  
  -- Client Information
  client_name text NOT NULL,
  website text,
  revenue numeric(15, 2),  -- Annual revenue in dollars
  client_source text,  -- How the client was acquired (referral, cold call, etc.)
  
  -- Contact Information
  primary_contact_email text,
  primary_contact_phone text,
  
  -- Address
  address text,
  city text,
  state text,
  country text DEFAULT 'USA',
  postal_code text,
  
  -- Additional Details
  industry text,
  notes text,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PROSPECT', 'LOST')),
  
  -- Audit fields
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE clients IS 'Stores client/customer information for the CRM';
COMMENT ON COLUMN clients.revenue IS 'Annual revenue of the client company in USD';
COMMENT ON COLUMN clients.client_source IS 'Source of the client (referral, marketing, cold call, etc.)';
COMMENT ON COLUMN clients.status IS 'Current status of the client relationship';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_tenant_business ON clients(tenant_id, business_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);

-- ============================================
-- JOB ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS job_orders (
  job_order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(client_id) ON DELETE CASCADE,
  
  -- Job Details
  job_title text NOT NULL,
  job_description text,
  location text,
  industry text,
  employment_type text CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'CONTRACT_TO_HIRE', 'TEMPORARY')),
  
  -- Compensation
  salary_min numeric(12, 2),
  salary_max numeric(12, 2),
  salary_currency text DEFAULT 'USD',
  gross_margin numeric(5, 2),  -- Percentage
  
  -- Payment Terms
  payment_terms text,  -- e.g., "Net 30", "Net 60", custom terms
  billing_type text CHECK (billing_type IN ('HOURLY', 'FIXED_PRICE', 'RETAINER')),
  
  -- Job Requirements
  required_skills text[],  -- Array of required skills
  preferred_skills text[],  -- Array of preferred skills
  experience_years_min integer,
  experience_years_max integer,
  education_level text,
  certifications_required text[],
  
  -- Job Status
  status text DEFAULT 'OPEN' CHECK (status IN ('DRAFT', 'OPEN', 'FILLED', 'CLOSED', 'ON_HOLD', 'CANCELLED')),
  priority text CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  openings_count integer DEFAULT 1,
  filled_count integer DEFAULT 0,
  
  -- Dates
  start_date date,
  end_date date,
  deadline date,
  
  -- Additional Details
  notes text,
  internal_notes text,  -- Notes not visible to client
  
  -- Audit fields
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_salary_range CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max),
  CONSTRAINT valid_experience_range CHECK (experience_years_min IS NULL OR experience_years_max IS NULL OR experience_years_min <= experience_years_max),
  CONSTRAINT valid_filled_count CHECK (filled_count >= 0 AND filled_count <= openings_count)
);

COMMENT ON TABLE job_orders IS 'Stores job orders/requisitions from clients';
COMMENT ON COLUMN job_orders.gross_margin IS 'Gross margin percentage for the job order';
COMMENT ON COLUMN job_orders.payment_terms IS 'Payment terms agreed with the client (e.g., Net 30)';
COMMENT ON COLUMN job_orders.openings_count IS 'Number of positions to be filled';
COMMENT ON COLUMN job_orders.filled_count IS 'Number of positions already filled';
COMMENT ON COLUMN job_orders.internal_notes IS 'Internal notes not shared with the client';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_orders_tenant_business ON job_orders(tenant_id, business_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_client ON job_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_status ON job_orders(status);
CREATE INDEX IF NOT EXISTS idx_job_orders_priority ON job_orders(priority);

-- ============================================
-- EXTEND CONTACTS TABLE
-- ============================================

-- Add client_id column to contacts table to link contacts to clients
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(client_id) ON DELETE SET NULL;

COMMENT ON COLUMN contacts.client_id IS 'Optional reference to client for client_contact type contacts';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);

-- Add job_order_id column to contacts table to link contacts (applicants) to job orders
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS job_order_id uuid REFERENCES job_orders(job_order_id) ON DELETE SET NULL;

COMMENT ON COLUMN contacts.job_order_id IS 'Optional reference to job order for job_order_applicant type contacts';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_job_order_id ON contacts(job_order_id);

-- ============================================
-- RLS POLICIES FOR CLIENTS
-- ============================================

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view clients in their tenant
CREATE POLICY select_clients_policy ON clients
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert clients in their tenant
CREATE POLICY insert_clients_policy ON clients
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update clients in their tenant
CREATE POLICY update_clients_policy ON clients
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete clients in their tenant
CREATE POLICY delete_clients_policy ON clients
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES FOR JOB ORDERS
-- ============================================

-- Enable RLS
ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view job orders in their tenant
CREATE POLICY select_job_orders_policy ON job_orders
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert job orders in their tenant
CREATE POLICY insert_job_orders_policy ON job_orders
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update job orders in their tenant
CREATE POLICY update_job_orders_policy ON job_orders
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete job orders in their tenant
CREATE POLICY delete_job_orders_policy ON job_orders
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- UPDATE TRIGGER FOR UPDATED_AT
-- ============================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to clients table
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to job_orders table
DROP TRIGGER IF EXISTS update_job_orders_updated_at ON job_orders;
CREATE TRIGGER update_job_orders_updated_at
  BEFORE UPDATE ON job_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Note: contact_type is already VARCHAR in the contacts table
-- The new contact types 'client_contact' and 'job_order_applicant' can be used directly
-- No enum alteration needed since contact_type is not an enum type

COMMENT ON COLUMN contacts.contact_type IS 'Type of contact: it_candidate, healthcare_candidate, vendor_client, empanelment_contact, internal_india, internal_usa, client_contact, job_order_applicant';

-- ============================================
-- END OF MIGRATION
-- ============================================
