-- ============================================
-- Migration: Add business_id to lookup tables
-- Ensures each lookup entry is scoped to a business
-- ============================================

-- Add business_id columns referencing businesses(id)
ALTER TABLE visa_status
  ADD COLUMN IF NOT EXISTS business_id bigint REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE job_title
  ADD COLUMN IF NOT EXISTS business_id bigint REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE reason_for_contact
  ADD COLUMN IF NOT EXISTS business_id bigint REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE workflow_status
  ADD COLUMN IF NOT EXISTS business_id bigint REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE type_of_roles
  ADD COLUMN IF NOT EXISTS business_id bigint REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE type_of_contact
  ADD COLUMN IF NOT EXISTS business_id bigint REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE referral_sources
  ADD COLUMN IF NOT EXISTS business_id bigint REFERENCES businesses(id) ON DELETE CASCADE;

-- Index new foreign keys for faster joins
CREATE INDEX IF NOT EXISTS idx_visa_status_business_id ON visa_status(business_id);
CREATE INDEX IF NOT EXISTS idx_job_title_business_id ON job_title(business_id);
CREATE INDEX IF NOT EXISTS idx_reason_for_contact_business_id ON reason_for_contact(business_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status_business_id ON workflow_status(business_id);
CREATE INDEX IF NOT EXISTS idx_type_of_roles_business_id ON type_of_roles(business_id);
CREATE INDEX IF NOT EXISTS idx_type_of_contact_business_id ON type_of_contact(business_id);
CREATE INDEX IF NOT EXISTS idx_referral_sources_business_id ON referral_sources(business_id);

-- Backfill existing rows by linking to the first business for each tenant
DO $$
DECLARE
  lookup RECORD;
BEGIN
  -- Helper function to update any lookup table that now has business_id
  FOR lookup IN (
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'business_id'
      AND table_name IN (
        'visa_status','job_title','reason_for_contact','workflow_status',
        'type_of_roles','type_of_contact','referral_sources'
      )
  ) LOOP
    EXECUTE format(
      'UPDATE %I AS t
       SET business_id = (
         SELECT id FROM businesses b
         WHERE b.tenant_id = t.tenant_id
         ORDER BY b.created_at NULLS LAST, b.id
         LIMIT 1
       )
       WHERE t.tenant_id IS NOT NULL
         AND t.business_id IS NULL',
      lookup.table_name
    );
  END LOOP;
END
$$;
