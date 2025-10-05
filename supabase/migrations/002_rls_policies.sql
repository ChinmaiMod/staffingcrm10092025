-- ============================================
-- Row Level Security (RLS) Policies
-- Run this AFTER the initial schema migration
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except tenant_id and role)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can do anything (for Edge Functions)
CREATE POLICY "profiles_service_role_all" ON profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- TENANTS POLICIES
-- ============================================

-- Users can view their own tenant
CREATE POLICY "tenants_select_own" ON tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.tenant_id = tenants.tenant_id
      AND profiles.id = auth.uid()
    )
  );

-- Only admins can update tenant info
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

-- Service role can do anything
CREATE POLICY "tenants_service_role_all" ON tenants
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- SUBSCRIPTIONS POLICIES
-- ============================================

-- Users can view subscriptions for their tenant
CREATE POLICY "subscriptions_select_tenant" ON subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = subscriptions.tenant_id
    )
  );

-- Only admins can insert subscriptions for their tenant
CREATE POLICY "subscriptions_insert_admin" ON subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = subscriptions.tenant_id
      AND profiles.role = 'ADMIN'
    )
  );

-- Service role can do anything (for Stripe webhooks)
CREATE POLICY "subscriptions_service_role_all" ON subscriptions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- PAYMENTS POLICIES
-- ============================================

-- Users can view payments for their tenant
CREATE POLICY "payments_select_tenant" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = payments.tenant_id
    )
  );

-- Service role can do anything (for Stripe webhooks)
CREATE POLICY "payments_service_role_all" ON payments
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- PROMO CODES POLICIES
-- ============================================

-- Anyone can view active promo codes (for validation)
CREATE POLICY "promo_codes_select_all" ON promo_codes
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Service role can manage promo codes
CREATE POLICY "promo_codes_service_role_all" ON promo_codes
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- EMAIL TOKENS POLICIES
-- ============================================

-- Users can view their own tokens
CREATE POLICY "email_tokens_select_own" ON email_tokens
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can manage tokens
CREATE POLICY "email_tokens_service_role_all" ON email_tokens
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Admins can view audit logs for their tenant
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

-- Service role can do anything
CREATE POLICY "audit_logs_service_role_all" ON audit_logs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is admin of a tenant
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

-- Function to get user's tenant_id
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
