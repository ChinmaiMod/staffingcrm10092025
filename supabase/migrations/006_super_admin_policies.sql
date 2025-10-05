-- Migration: Add SUPER_ADMIN update policy for tenants

-- Ensure tenants table has status check (already in initial migration) and allow SUPER_ADMIN to update

CREATE POLICY IF NOT EXISTS "tenants_update_super_admin" ON tenants
  FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'SUPER_ADMIN'
  );

-- Note: this policy complements tenants_update_admin; service_role still allowed via tenants_service_role_all
