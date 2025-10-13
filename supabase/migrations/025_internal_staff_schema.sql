-- ============================================
-- INTERNAL STAFF DIRECTORY
-- Creates internal_staff table linked to tenants and businesses
-- Run this AFTER 024_add_business_id_to_lookup_tables.sql
-- ============================================

CREATE OR REPLACE FUNCTION migrate_business_fk(p_table_name text, p_on_delete text)
RETURNS void AS $$
DECLARE
  has_column boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = 'business_id'
  ) INTO has_column;

  IF NOT has_column THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS business_id_uuid uuid', p_table_name);
  EXECUTE format('
    UPDATE %I AS t
    SET business_id_uuid = b.business_id
    FROM businesses b
    WHERE t.business_id IS NOT NULL
      AND b.business_id_legacy IS NOT NULL
      AND t.business_id = b.business_id_legacy
  ', p_table_name);
  EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', p_table_name, p_table_name || '_business_id_fkey');
  EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS business_id', p_table_name);
  EXECUTE format('ALTER TABLE %I RENAME COLUMN business_id_uuid TO business_id', p_table_name);
  EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (business_id) REFERENCES businesses(business_id) ON DELETE %s', p_table_name, p_table_name || '_business_id_fkey', p_on_delete);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION migrate_businesses_to_uuid()
RETURNS void AS $$
DECLARE
  needs_migration boolean;
  legacy_column text := NULL;
  tables text[] := ARRAY[
    'business_documents',
    'business_folders',
    'contacts',
    'job_title',
    'pipelines',
    'reason_for_contact',
    'referral_sources',
    'role_business_access',
    'type_of_contact',
    'type_of_roles',
    'visa_status',
    'workflow_status',
    'years_of_experience'
  ];
  delete_modes text[] := ARRAY[
    'CASCADE',
    'CASCADE',
    'CASCADE',
    'CASCADE',
    'CASCADE',
    'CASCADE',
    'CASCADE',
    'CASCADE',
    'CASCADE',
    'CASCADE',
    'CASCADE',
    'CASCADE',
    'CASCADE'
  ];
  idx integer;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'businesses'
      AND column_name IN ('id', 'business_id')
      AND data_type <> 'uuid'
  ) INTO needs_migration;

  IF NOT needs_migration THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'business_id' AND data_type <> 'uuid'
  ) THEN
    legacy_column := 'business_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'id'
  ) THEN
    legacy_column := 'id';
  END IF;

  IF legacy_column IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE businesses RENAME COLUMN %I TO business_id_legacy', legacy_column);
  EXECUTE 'ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_id uuid';
  EXECUTE 'UPDATE businesses SET business_id = COALESCE(business_id, gen_random_uuid())';
  EXECUTE 'ALTER TABLE businesses ALTER COLUMN business_id SET NOT NULL';
  EXECUTE 'ALTER TABLE businesses ALTER COLUMN business_id SET DEFAULT gen_random_uuid()';
  EXECUTE 'ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_pkey CASCADE';
  EXECUTE 'ALTER TABLE businesses ADD CONSTRAINT businesses_pkey PRIMARY KEY (business_id)';

  FOR idx IN COALESCE(array_lower(tables, 1), 1)..COALESCE(array_upper(tables, 1), 0) LOOP
    PERFORM migrate_business_fk(tables[idx], delete_modes[idx]);
  END LOOP;

  EXECUTE 'ALTER TABLE businesses DROP COLUMN IF EXISTS business_id_legacy';
END;
$$ LANGUAGE plpgsql;

SELECT migrate_businesses_to_uuid();

DROP FUNCTION migrate_business_fk(text, text);
DROP FUNCTION migrate_businesses_to_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'businesses'
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    EXECUTE 'ALTER TABLE businesses ADD PRIMARY KEY (business_id)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'businesses'
      AND column_name = 'business_id'
      AND data_type = 'uuid'
  ) THEN
    EXECUTE 'ALTER TABLE businesses ALTER COLUMN business_id SET DEFAULT gen_random_uuid()';
    EXECUTE 'ALTER TABLE businesses ALTER COLUMN business_id SET NOT NULL';
  END IF;
END $$;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS enabled_contact_types text[] DEFAULT ARRAY['IT_CANDIDATE','HEALTHCARE_CANDIDATE','VENDOR_CLIENT','VENDOR_EMPANELMENT','EMPLOYEE_INDIA','EMPLOYEE_USA'],
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE INDEX IF NOT EXISTS idx_businesses_tenant ON businesses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(tenant_id, is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'businesses'
      AND constraint_name = 'businesses_tenant_name_key'
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_tenant_name_key UNIQUE (tenant_id, business_name);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION ensure_default_business()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE businesses
    SET is_default = false
    WHERE tenant_id = NEW.tenant_id
      AND business_id != NEW.business_id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_default_business_trigger ON businesses;
CREATE TRIGGER ensure_default_business_trigger
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_default_business();

-- Enable required extensions (safety)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLE DEFINITION
-- ============================================

CREATE TABLE IF NOT EXISTS internal_staff (
  staff_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE SET NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  job_title text,
  department text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ON_LEAVE')),
  is_billable boolean DEFAULT false,
  start_date date,
  end_date date,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (tenant_id, email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_internal_staff_tenant ON internal_staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_internal_staff_business ON internal_staff(business_id);
CREATE INDEX IF NOT EXISTS idx_internal_staff_status ON internal_staff(status);
CREATE INDEX IF NOT EXISTS idx_internal_staff_name ON internal_staff(tenant_id, last_name, first_name);

-- Updated at trigger
CREATE TRIGGER trg_internal_staff_updated_at
  BEFORE UPDATE ON internal_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE internal_staff ENABLE ROW LEVEL SECURITY;

-- service_role bypass
CREATE POLICY "internal_staff_service_role" ON internal_staff
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Tenant users can read staff for their tenant
CREATE POLICY "internal_staff_select_tenant" ON internal_staff
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = internal_staff.tenant_id
    )
  );

-- Admin-level roles can manage staff
CREATE POLICY "internal_staff_insert_admin" ON internal_staff
  FOR INSERT
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role') OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = internal_staff.tenant_id
        AND profiles.role IN ('ADMIN','SUPER_ADMIN','CEO')
    )
  );

CREATE POLICY "internal_staff_update_admin" ON internal_staff
  FOR UPDATE
  USING (
    (auth.jwt()->>'role' = 'service_role') OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = internal_staff.tenant_id
        AND profiles.role IN ('ADMIN','SUPER_ADMIN','CEO')
    )
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role') OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = internal_staff.tenant_id
        AND profiles.role IN ('ADMIN','SUPER_ADMIN','CEO')
    )
  );

CREATE POLICY "internal_staff_delete_admin" ON internal_staff
  FOR DELETE
  USING (
    (auth.jwt()->>'role' = 'service_role') OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = internal_staff.tenant_id
        AND profiles.role IN ('ADMIN','SUPER_ADMIN','CEO')
    )
  );

-- ============================================
-- DEFAULT BUSINESS MIGRATION SUPPORT
-- ============================================

-- Ensure migrate_to_default_business() also assigns staff
CREATE OR REPLACE FUNCTION migrate_to_default_business()
RETURNS void AS $$
DECLARE
  tenant_rec RECORD;
  default_bus_id uuid;
BEGIN
  FOR tenant_rec IN SELECT DISTINCT tenant_id FROM tenants LOOP
    SELECT business_id INTO default_bus_id
    FROM businesses
    WHERE tenant_id = tenant_rec.tenant_id
      AND is_default = true
      AND is_active = true
    LIMIT 1;

    IF default_bus_id IS NULL THEN
      INSERT INTO businesses (tenant_id, business_name, business_type, is_default)
      VALUES (tenant_rec.tenant_id, 'Default Business', 'GENERAL', true)
      RETURNING business_id INTO default_bus_id;
    END IF;

    UPDATE contacts SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE visa_status SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE job_titles SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE reasons_for_contact SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE contact_statuses SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE role_types SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE years_experience SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE referral_sources SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE email_templates SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE notification_configs SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE pipelines SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
    UPDATE internal_staff SET business_id = default_bus_id
      WHERE tenant_id = tenant_rec.tenant_id AND business_id IS NULL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE VIEW FOR DASHBOARDS (optional convenience)
-- ============================================

CREATE OR REPLACE VIEW tenant_internal_staff AS
SELECT 
  s.staff_id,
  s.tenant_id,
  s.business_id,
  b.business_name,
  s.profile_id,
  s.first_name,
  s.last_name,
  s.email,
  s.phone,
  s.job_title,
  s.department,
  s.status,
  s.is_billable,
  s.start_date,
  s.end_date,
  s.notes,
  s.created_at,
  s.updated_at
FROM internal_staff s
LEFT JOIN businesses b ON b.business_id = s.business_id;

COMMENT ON VIEW tenant_internal_staff IS 'Convenience view joining internal staff to business metadata for CRM dashboards.';
