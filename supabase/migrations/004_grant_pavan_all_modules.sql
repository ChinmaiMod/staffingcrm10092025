-- Migration: Grant pavan@intuites.com access to CRM, HRMS, Finance
-- This migration will:
-- 1) Ensure a profile exists for the email and set status to ACTIVE and role to ADMIN
-- 2) Create a tenant named 'Intuites (Auto-created)' if none exists for this email
-- 3) Associate the profile with the tenant
-- 4) Insert or update an ACTIVE 'SUITE' subscription so all modules are available

BEGIN;

-- 1) Ensure the profile exists in profiles (profiles.id must reference auth.users.id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE lower(email) = lower('pavan@intuites.com')) THEN
    RAISE NOTICE 'Profile for pavan@intuites.com not found. Please ensure the user exists in auth.users and a corresponding profiles row is created before running this migration.';
  ELSE
    UPDATE profiles
    SET status = 'ACTIVE', role = 'ADMIN', updated_at = now()
    WHERE lower(email) = lower('pavan@intuites.com');
  END IF;
END$$;

-- 2) Ensure a tenant exists for Intuites, associate the profile, and create/update subscription
DO $$
DECLARE
  tid uuid;
BEGIN
  -- Try to find an existing tenant
  SELECT tenant_id INTO tid FROM tenants WHERE lower(company_name) = lower('Intuites') LIMIT 1;

  -- Create tenant if missing
  IF tid IS NULL THEN
    INSERT INTO tenants (company_name, status, created_at, updated_at)
    VALUES ('Intuites', 'ACTIVE', now(), now())
    RETURNING tenant_id INTO tid;
  END IF;

  -- Associate profile with tenant only if profile exists
  UPDATE profiles
  SET tenant_id = tid, updated_at = now()
  WHERE lower(email) = lower('pavan@intuites.com')
    AND EXISTS (SELECT 1 FROM profiles WHERE lower(email) = lower('pavan@intuites.com'));

  -- Insert or update SUITE subscription
  IF NOT EXISTS (SELECT 1 FROM subscriptions WHERE tenant_id = tid AND plan_name = 'SUITE' AND status = 'ACTIVE') THEN
    INSERT INTO subscriptions (tenant_id, plan_name, billing_cycle, status, start_date, created_at, updated_at)
    VALUES (tid, 'SUITE', 'MONTHLY', 'ACTIVE', now(), now(), now());
  ELSE
    UPDATE subscriptions
    SET status = 'ACTIVE', plan_name = 'SUITE', updated_at = now()
    WHERE tenant_id = tid;
  END IF;
END $$;

COMMIT;
