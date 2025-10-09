-- Migration: User Feedback/Suggestions
-- Created: 2025-10-08
-- Description: Table for storing user feedback and suggestions

-- =============================================================================
-- PART 1: USER FEEDBACK TABLE
-- =============================================================================

-- Table: user_feedback
CREATE TABLE IF NOT EXISTS user_feedback (
  feedback_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED')),
  priority text CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  category text CHECK (category IN ('BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'QUESTION', 'OTHER')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE user_feedback IS 'Stores user suggestions, ideas, and feedback';

-- =============================================================================
-- PART 2: INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_feedback_tenant_id ON user_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- =============================================================================
-- PART 3: TRIGGERS
-- =============================================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 4: RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own feedback
CREATE POLICY "user_feedback_select_own"
  ON user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own feedback
CREATE POLICY "user_feedback_insert_own"
  ON user_feedback
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

-- Policy: Users can update their own feedback (only if status is NEW)
CREATE POLICY "user_feedback_update_own"
  ON user_feedback
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'NEW')
  WITH CHECK (auth.uid() = user_id AND status = 'NEW');

-- Policy: Admins can view all feedback for their tenant
CREATE POLICY "user_feedback_select_admin"
  ON user_feedback
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
    AND is_tenant_admin(auth.uid())
  );

-- Policy: Admins can update all feedback for their tenant
CREATE POLICY "user_feedback_update_admin"
  ON user_feedback
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
    AND is_tenant_admin(auth.uid())
  );

-- Policy: Super admins can view all feedback
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

-- Policy: Super admins can update all feedback
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
