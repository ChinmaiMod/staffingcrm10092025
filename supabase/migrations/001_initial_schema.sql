-- ============================================
-- Staffing CRM SaaS - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLES
-- ============================================

-- TENANTS
-- Stores company/organization information
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     text NOT NULL,
  status           text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- PROFILES
-- One-to-one relationship with auth.users
-- Contains user profile and tenant association
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

-- EMAIL TOKENS
-- For custom email verification and password reset flows
CREATE TABLE IF NOT EXISTS email_tokens (
  token_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES profiles(id) ON DELETE CASCADE,
  token            text NOT NULL UNIQUE,
  token_type       text NOT NULL CHECK (token_type IN ('VERIFY', 'RESET')),
  expires_at       timestamptz NOT NULL,
  used             boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

-- SUBSCRIPTIONS
-- Tracks tenant subscription plans and billing
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

-- PAYMENTS / INVOICES
-- Records all payment transactions
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

-- PROMO CODES
-- Promotional discount codes
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

-- AUDIT LOGS
-- Tracks all important actions for compliance and debugging
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
-- INDEXES
-- ============================================

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

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS ux_profiles_email ON profiles(lower(email));

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE tenants IS 'Stores tenant/company information for multi-tenancy';
COMMENT ON TABLE profiles IS 'User profiles linked to auth.users with tenant association';
COMMENT ON TABLE subscriptions IS 'Subscription plans and billing information';
COMMENT ON TABLE payments IS 'Payment transaction records';
COMMENT ON TABLE promo_codes IS 'Promotional discount codes';
COMMENT ON TABLE email_tokens IS 'Email verification and password reset tokens';
COMMENT ON TABLE audit_logs IS 'Audit trail for compliance and debugging';
