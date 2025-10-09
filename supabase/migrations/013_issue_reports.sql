-- Migration: Issue Reports / Bug Tracking
-- Created: 2025-10-09
-- Description: Table for storing user-reported issues and bugs

-- =============================================================================
-- PART 1: ISSUE REPORTS TABLE
-- =============================================================================

-- Table: issue_reports
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

-- Add comment
COMMENT ON TABLE issue_reports IS 'Stores user-reported issues, bugs, and problems with the application';

-- =============================================================================
-- PART 2: INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_issue_reports_tenant_id ON issue_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_user_id ON issue_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_severity ON issue_reports(severity);
CREATE INDEX IF NOT EXISTS idx_issue_reports_created_at ON issue_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_reports_assigned_to ON issue_reports(assigned_to);

-- =============================================================================
-- PART 3: TRIGGERS
-- =============================================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_issue_reports_updated_at
  BEFORE UPDATE ON issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 4: RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own issue reports
CREATE POLICY "issue_reports_select_own"
  ON issue_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own issue reports
CREATE POLICY "issue_reports_insert_own"
  ON issue_reports
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

-- Policy: Users can update their own issue reports (only if status is OPEN)
CREATE POLICY "issue_reports_update_own"
  ON issue_reports
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'OPEN')
  WITH CHECK (auth.uid() = user_id AND status = 'OPEN');

-- Policy: Admins can view all issue reports for their tenant
CREATE POLICY "issue_reports_select_admin"
  ON issue_reports
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
    AND is_tenant_admin(auth.uid())
  );

-- Policy: Admins can update all issue reports for their tenant
CREATE POLICY "issue_reports_update_admin"
  ON issue_reports
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
    AND is_tenant_admin(auth.uid())
  );

-- Policy: Super admins can view all issue reports
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

-- Policy: Super admins can update all issue reports
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
