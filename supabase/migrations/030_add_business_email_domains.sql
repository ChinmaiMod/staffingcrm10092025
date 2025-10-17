-- Migration: Create business_email_domains mapping table for domain-based email routing
-- Description: Maps email domains to businesses so edge functions can select the correct Resend credentials

BEGIN;

CREATE TABLE IF NOT EXISTS public.business_email_domains (
  domain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(business_id) ON DELETE CASCADE,
  email_domain TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  CONSTRAINT business_email_domains_domain_format CHECK (
    email_domain IS NOT NULL
    AND email_domain NOT LIKE '%@%'
    AND LENGTH(email_domain) > 2
  )
);

CREATE INDEX IF NOT EXISTS idx_business_email_domains_tenant ON public.business_email_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_business_email_domains_business ON public.business_email_domains(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_email_domains_unique_domain
  ON public.business_email_domains(tenant_id, LOWER(email_domain));

CREATE OR REPLACE FUNCTION public.update_business_email_domains_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_email_domains_updated_at ON public.business_email_domains;
CREATE TRIGGER trg_business_email_domains_updated_at
BEFORE UPDATE ON public.business_email_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_business_email_domains_updated_at();

ALTER TABLE public.business_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_email_domains_select_tenant" ON public.business_email_domains
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "business_email_domains_insert_tenant" ON public.business_email_domains
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "business_email_domains_update_tenant" ON public.business_email_domains
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "business_email_domains_delete_tenant" ON public.business_email_domains
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "business_email_domains_service_role" ON public.business_email_domains
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

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
  bak.tenant_id,
  bak.business_id,
  LOWER(split_part(bak.from_email, '@', 2)) AS email_domain,
  true AS is_primary,
  now() AS created_at,
  bak.created_by,
  now() AS updated_at,
  bak.updated_by
FROM public.business_resend_api_keys bak
WHERE bak.from_email LIKE '%@%'
ON CONFLICT (tenant_id, LOWER(email_domain)) DO NOTHING;

COMMENT ON TABLE public.business_email_domains IS 'Maps email domains to businesses for routing business-specific email settings.';
COMMENT ON COLUMN public.business_email_domains.email_domain IS 'Domain without @ symbol (e.g., example.com) mapped to a business.';
COMMENT ON COLUMN public.business_email_domains.is_primary IS 'Indicates the primary domain for the business.';

COMMIT;
