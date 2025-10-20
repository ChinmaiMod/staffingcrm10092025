-- Migration: Sync tenant email domains with business email mappings
-- Description: Ensures tenant primary domains map to default business Resend configs and adds automation to keep them up to date

BEGIN;

-- Drop expression-based unique index in favor of normalized column for easier upserts
DROP INDEX IF EXISTS idx_business_email_domains_unique_domain;

-- Add normalized domain column to simplify unique constraint handling
ALTER TABLE public.business_email_domains
  ADD COLUMN IF NOT EXISTS normalized_domain TEXT GENERATED ALWAYS AS (lower(email_domain)) STORED;

-- Ensure uniqueness per tenant/domain combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_email_domains_unique_normalized
  ON public.business_email_domains(tenant_id, normalized_domain);

-- Backfill tenant default business domain mappings
INSERT INTO public.business_email_domains (
  tenant_id,
  business_id,
  email_domain,
  is_primary,
  created_at,
  created_by,
  updated_at,
  updated_by
)
SELECT
  b.tenant_id,
  b.business_id,
  lower(t.email_domain) AS email_domain,
  true AS is_primary,
  now() AS created_at,
  NULL::uuid AS created_by,
  now() AS updated_at,
  NULL::uuid AS updated_by
FROM public.businesses b
JOIN public.tenants t ON t.tenant_id = b.tenant_id
WHERE b.is_default = true
  AND t.email_domain IS NOT NULL
  AND length(trim(t.email_domain)) > 0
ON CONFLICT (tenant_id, normalized_domain) DO UPDATE
SET
  business_id = EXCLUDED.business_id,
  is_primary = true,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by;

-- Helper function to keep default business domain mapping in sync
CREATE OR REPLACE FUNCTION public.ensure_default_business_email_domain()
RETURNS trigger AS $$
DECLARE
  tenant_domain TEXT;
  actor UUID;
BEGIN
  SELECT email_domain INTO tenant_domain
  FROM public.tenants
  WHERE tenant_id = NEW.tenant_id;

  IF tenant_domain IS NULL OR length(trim(tenant_domain)) = 0 THEN
    RETURN NEW;
  END IF;

  actor := COALESCE(NEW.updated_by, NEW.created_by);

  INSERT INTO public.business_email_domains (
    tenant_id,
    business_id,
    email_domain,
    is_primary,
    created_at,
    created_by,
    updated_at,
    updated_by
  )
  VALUES (
    NEW.tenant_id,
    NEW.business_id,
    lower(tenant_domain),
    true,
    now(),
    actor,
    now(),
    actor
  )
  ON CONFLICT (tenant_id, normalized_domain) DO UPDATE
  SET
    business_id = EXCLUDED.business_id,
    is_primary = true,
    updated_at = now(),
    updated_by = COALESCE(EXCLUDED.updated_by, actor);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_businesses_default_domain ON public.businesses;
CREATE TRIGGER trg_businesses_default_domain
AFTER INSERT OR UPDATE OF is_default ON public.businesses
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.ensure_default_business_email_domain();

-- Helper function to react to tenant domain changes
CREATE OR REPLACE FUNCTION public.sync_tenant_email_domain_mapping()
RETURNS trigger AS $$
DECLARE
  default_business UUID;
BEGIN
  SELECT business_id INTO default_business
  FROM public.businesses
  WHERE tenant_id = NEW.tenant_id
    AND is_default = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF default_business IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.business_email_domains (
    tenant_id,
    business_id,
    email_domain,
    is_primary,
    created_at,
    created_by,
    updated_at,
    updated_by
  )
  VALUES (
    NEW.tenant_id,
    default_business,
    lower(NEW.email_domain),
    true,
    now(),
    NULL::uuid,
    now(),
    NULL::uuid
  )
  ON CONFLICT (tenant_id, normalized_domain) DO UPDATE
  SET
    business_id = EXCLUDED.business_id,
    is_primary = true,
    updated_at = now(),
    updated_by = NULL::uuid;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenants_email_domain_sync ON public.tenants;
CREATE TRIGGER trg_tenants_email_domain_sync
AFTER INSERT OR UPDATE OF email_domain ON public.tenants
FOR EACH ROW
WHEN (NEW.email_domain IS NOT NULL AND length(trim(NEW.email_domain)) > 0)
EXECUTE FUNCTION public.sync_tenant_email_domain_mapping();

COMMIT;
