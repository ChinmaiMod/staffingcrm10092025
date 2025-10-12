-- ============================================
-- Remove tenant_id from user_roles (Make Roles Global)
-- Working with existing BIGINT structure
-- ============================================

-- STEP 1: Drop RLS policies that depend on tenant_id
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;
DROP POLICY IF EXISTS "service_role_all_user_roles" ON user_roles;

-- STEP 2: Drop foreign key constraint on user_roles.tenant_id
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_tenant_id_fkey;

-- STEP 3: Drop indexes on user_roles.tenant_id
DROP INDEX IF EXISTS idx_user_roles_tenant;

-- STEP 4: Drop unique constraints that include tenant_id
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_tenant_id_role_code_key;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_tenant_id_role_name_key;

-- STEP 5: Remove tenant_id column from user_roles
ALTER TABLE user_roles DROP COLUMN IF EXISTS tenant_id;

-- STEP 6: Add new unique constraints (global, not per-tenant)
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_code_unique UNIQUE (role_code);
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_name_unique UNIQUE (role_name);

-- STEP 7: Recreate RLS policies (without tenant_id dependency)
CREATE POLICY "service_role_all_user_roles" ON user_roles 
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "user_roles_select_all" ON user_roles 
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- STEP 8: Add tenant_id to user_role_assignments (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_role_assignments' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE user_role_assignments 
    ADD COLUMN tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE;
    
    -- Add index for tenant_id
    CREATE INDEX idx_user_role_assignments_tenant ON user_role_assignments(tenant_id);
    
    -- Add composite unique constraint
    ALTER TABLE user_role_assignments 
    DROP CONSTRAINT IF EXISTS user_role_assignments_user_id_role_id_key;
    
    ALTER TABLE user_role_assignments 
    ADD CONSTRAINT user_role_assignments_user_role_tenant_unique 
    UNIQUE (user_id, role_id, tenant_id);
  END IF;
END $$;

-- STEP 9: Update comments
COMMENT ON TABLE user_roles IS 'GLOBAL role definitions (not tenant-specific). Same roles apply to all tenants.';
COMMENT ON TABLE user_role_assignments IS 'Tenant-specific role assignments. Links users to roles within their tenant.';
COMMENT ON COLUMN user_role_assignments.tenant_id IS 'Tenant context for this role assignment. User can have different roles in different tenants.';

-- STEP 10: Display results
DO $$
DECLARE
  has_tenant_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'tenant_id'
  ) INTO has_tenant_id;
  
  IF has_tenant_id THEN
    RAISE NOTICE '❌ Migration failed: tenant_id still exists in user_roles';
  ELSE
    RAISE NOTICE '✅ SUCCESS: tenant_id removed from user_roles';
    RAISE NOTICE '✅ user_roles is now GLOBAL';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_role_assignments' AND column_name = 'tenant_id'
  ) INTO has_tenant_id;
  
  IF has_tenant_id THEN
    RAISE NOTICE '✅ SUCCESS: tenant_id added to user_role_assignments';
  ELSE
    RAISE NOTICE '❌ Warning: tenant_id missing from user_role_assignments';
  END IF;
END $$;

-- ============================================
-- END
-- ============================================
