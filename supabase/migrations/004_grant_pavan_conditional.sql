-- Combined preview + conditional apply script for pavan@intuites.com
-- This script will:
-- 1) Show pre-check information about auth.users, profiles, tenants, subscriptions
-- 2) Proceed to apply changes ONLY if a profiles row exists for pavan@intuites.com
-- 3) Create tenant 'Intuites' if missing, associate profile, and insert/update SUITE subscription

-- -------------------------
-- PRE-CHECK (read-only)
-- -------------------------
SELECT '=== Pre-check: auth.users row for pavan@intuites.com ===' AS info;
SELECT id, email, created_at FROM auth.users WHERE lower(email) = lower('pavan@intuites.com');

SELECT '=== Pre-check: profiles row for pavan@intuites.com ===' AS info;
SELECT id, email, tenant_id, role, status, created_at, updated_at FROM profiles WHERE lower(email) = lower('pavan@intuites.com');

SELECT '=== Pre-check: tenant named Intuites ===' AS info;
SELECT tenant_id, company_name, status, created_at FROM tenants WHERE lower(company_name) = lower('Intuites');

SELECT '=== Pre-check: subscriptions for Intuites ===' AS info;
SELECT s.subscription_id, s.tenant_id, s.plan_name, s.status, s.start_date FROM subscriptions s JOIN tenants t ON s.tenant_id = t.tenant_id WHERE lower(t.company_name)=lower('Intuites');

-- -------------------------
-- CONDITIONAL APPLY
-- -------------------------
DO $$
DECLARE
  user_exists_count integer;
  prof_exists_count integer;
  tid uuid;
BEGIN
  -- Count auth user and profile
  SELECT COUNT(*) INTO user_exists_count FROM auth.users WHERE lower(email) = lower('pavan@intuites.com');
  SELECT COUNT(*) INTO prof_exists_count FROM profiles WHERE lower(email) = lower('pavan@intuites.com');

  IF user_exists_count = 0 THEN
    RAISE NOTICE 'ABORT: No auth.users entry found for pavan@intuites.com. Please create the auth user first.';
    RETURN;
  END IF;

  IF prof_exists_count = 0 THEN
    RAISE NOTICE 'ABORT: No profiles row found for pavan@intuites.com. Please create a profiles row (via app sign-up or manually) before running this script.';
    RETURN;
  END IF;

  -- At this point auth user and profile both exist; safe to proceed
  RAISE NOTICE 'Proceeding: auth user and profile exist. Applying updates...';

  -- Activate profile and set ADMIN
  UPDATE profiles
  SET status = 'ACTIVE', role = 'ADMIN', updated_at = now()
  WHERE lower(email) = lower('pavan@intuites.com');

  -- Find or create tenant
  SELECT tenant_id INTO tid FROM tenants WHERE lower(company_name) = lower('Intuites') LIMIT 1;
  IF tid IS NULL THEN
    INSERT INTO tenants (company_name, status, created_at, updated_at)
    VALUES ('Intuites', 'ACTIVE', now(), now())
    RETURNING tenant_id INTO tid;
    RAISE NOTICE 'Created tenant Intuites with id %', tid;
  ELSE
    RAISE NOTICE 'Found existing tenant Intuites with id %', tid;
  END IF;

  -- Associate profile with tenant
  UPDATE profiles
  SET tenant_id = tid, updated_at = now()
  WHERE lower(email) = lower('pavan@intuites.com');
  RAISE NOTICE 'Associated profile with tenant %', tid;

  -- Insert or update subscription to SUITE
  IF NOT EXISTS (SELECT 1 FROM subscriptions WHERE tenant_id = tid AND plan_name = 'SUITE' AND status = 'ACTIVE') THEN
    INSERT INTO subscriptions (tenant_id, plan_name, billing_cycle, status, start_date, created_at, updated_at)
    VALUES (tid, 'SUITE', 'MONTHLY', 'ACTIVE', now(), now(), now());
    RAISE NOTICE 'Inserted ACTIVE SUITE subscription for tenant %', tid;
  ELSE
    UPDATE subscriptions
    SET status = 'ACTIVE', plan_name = 'SUITE', updated_at = now()
    WHERE tenant_id = tid;
    RAISE NOTICE 'Updated existing subscription(s) for tenant % to ACTIVE SUITE', tid;
  END IF;
END $$;

-- Summary SELECTs
SELECT '=== Post-apply summary ===' AS info;
SELECT id, email, tenant_id, role, status FROM profiles WHERE lower(email)=lower('pavan@intuites.com');
SELECT t.tenant_id, t.company_name, s.subscription_id, s.plan_name, s.status FROM tenants t LEFT JOIN subscriptions s ON s.tenant_id = t.tenant_id WHERE lower(t.company_name)=lower('Intuites');

-- End of script
