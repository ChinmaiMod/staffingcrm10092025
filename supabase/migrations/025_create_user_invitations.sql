-- Migration: Create user_invitations table for inviting users to join a tenant
-- This enables CEOs/Admins to invite users via email with secure tokens

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant and user information
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  invited_user_name text NOT NULL,
  
  -- Invitation token and security
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  
  -- Optional personal message
  message text,
  
  -- Tracking
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  
  -- Revocation tracking
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Prevent duplicate active invitations
  UNIQUE(tenant_id, email, status)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant ON user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON user_invitations(expires_at);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see invitations for their tenant
CREATE POLICY "user_invitations_select_own_tenant" ON user_invitations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Only admins/CEOs can insert invitations
CREATE POLICY "user_invitations_insert_admin" ON user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tenant_id = user_invitations.tenant_id
      AND role IN ('ADMIN', 'CEO')
    )
  );

-- RLS Policy: Only admins/CEOs can update invitations (revoke, etc)
CREATE POLICY "user_invitations_update_admin" ON user_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tenant_id = user_invitations.tenant_id
      AND role IN ('ADMIN', 'CEO')
    )
  );

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'EXPIRED'
  WHERE status IN ('PENDING', 'SENT')
  AND expires_at < now();
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE user_invitations IS 'Stores user invitation requests for joining a tenant organization';
COMMENT ON COLUMN user_invitations.token IS 'Secure random token used in invitation acceptance URL';
COMMENT ON COLUMN user_invitations.status IS 'PENDING: created but not sent, SENT: email sent, ACCEPTED: user registered, EXPIRED: past expiration date, REVOKED: manually cancelled';
COMMENT ON COLUMN user_invitations.expires_at IS 'Invitation link expires after 7 days by default';
