-- Migration: Create business_resend_api_keys table
-- Description: Store Resend API keys per business for custom email domain support

CREATE TABLE IF NOT EXISTS public.business_resend_api_keys (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(business_id) ON DELETE CASCADE,
  resend_api_key TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  CONSTRAINT unique_business_api_key UNIQUE (tenant_id, business_id)
);

-- Create indexes
CREATE INDEX idx_business_resend_api_keys_tenant_id ON public.business_resend_api_keys(tenant_id);
CREATE INDEX idx_business_resend_api_keys_business_id ON public.business_resend_api_keys(business_id);
CREATE INDEX idx_business_resend_api_keys_is_active ON public.business_resend_api_keys(is_active);

-- Enable RLS
ALTER TABLE public.business_resend_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow users to view API keys in their tenant
CREATE POLICY "Users can view API keys in their tenant"
ON public.business_resend_api_keys
FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Allow authenticated users to create API keys
CREATE POLICY "Authenticated users can create API keys"
ON public.business_resend_api_keys
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Allow users to update API keys in their tenant
CREATE POLICY "Users can update API keys in their tenant"
ON public.business_resend_api_keys
FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Allow users to delete API keys in their tenant
CREATE POLICY "Users can delete API keys in their tenant"
ON public.business_resend_api_keys
FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Service role has full access
CREATE POLICY "Service role has full access to API keys"
ON public.business_resend_api_keys
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments
COMMENT ON TABLE public.business_resend_api_keys IS 'Stores Resend API keys per business for custom email domain support';
COMMENT ON COLUMN public.business_resend_api_keys.resend_api_key IS 'Encrypted Resend API key for the business';
COMMENT ON COLUMN public.business_resend_api_keys.from_email IS 'Verified sender email address in Resend';
COMMENT ON COLUMN public.business_resend_api_keys.from_name IS 'Display name for sender';
