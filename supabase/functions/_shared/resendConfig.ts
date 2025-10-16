/**
 * Shared utility for getting Resend API configuration
 * Used across edge functions to support business-specific email sending
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ResendConfig {
  apiKey: string
  fromEmail: string
  fromName: string
}

interface TenantResendConfig {
  business_id: string
  resend_api_key: string
  from_email: string
  from_name: string | null
  businesses?: {
    business_name: string | null
  } | null
}

interface ResendConfigLookupResult {
  config: ResendConfig
  businessId: string | null
  businessName: string | null
  fromEmailDomain: string | null
}

const DEFAULT_FROM_EMAIL =
  Deno.env.get('DEFAULT_FROM_EMAIL') ||
  Deno.env.get('FROM_EMAIL') ||
  'no-reply@staffingcrm.app'

const DEFAULT_FROM_NAME =
  Deno.env.get('DEFAULT_FROM_NAME') ||
  Deno.env.get('FROM_NAME') ||
  'Staffing CRM'

const SYSTEM_RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''

const GENERIC_SUBDOMAINS = ['www', 'mail', 'email', 'crm', 'app', 'portal', 'admin']

function normalizeToken(value: string | null | undefined): string {
  if (!value) return ''
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function extractDomain(email: string | null | undefined): string | null {
  if (!email) return null
  const [, domain] = email.split('@')
  return domain ? domain.trim().toLowerCase() : null
}

function deriveDomainKey(domain: string): string {
  const parts = domain.split('.').filter(Boolean)
  const filtered = parts.filter((part) => !GENERIC_SUBDOMAINS.includes(part))
  const keySource = filtered.length > 0 ? filtered.join('') : parts.join('')
  return normalizeToken(keySource)
}

export function getSystemResendConfig(): ResendConfig {
  return {
    apiKey: SYSTEM_RESEND_API_KEY,
    fromEmail: DEFAULT_FROM_EMAIL,
    fromName: DEFAULT_FROM_NAME
  }
}

async function fetchTenantResendConfigs(
  tenantId: string
): Promise<TenantResendConfig[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Resend lookup')
    return []
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const { data, error } = await supabaseAdmin
    .from('business_resend_api_keys')
    .select('business_id, resend_api_key, from_email, from_name, businesses!inner(business_name)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error || !data) {
    console.error('Failed to load business Resend configs:', error)
    return []
  }

  return data as TenantResendConfig[]
}

export async function getResendConfig(
  businessId: string | null,
  tenantId: string | null
): Promise<ResendConfig> {
  if (!businessId || !tenantId) {
    return getSystemResendConfig()
  }

  const configs = await fetchTenantResendConfigs(tenantId)
  const match = configs.find((config) => config.business_id === businessId)

  if (!match) {
    return getSystemResendConfig()
  }

  return {
    apiKey: match.resend_api_key,
    fromEmail: match.from_email,
    fromName: match.from_name || DEFAULT_FROM_NAME
  }
}

export async function getResendConfigForDomain(
  emailDomain: string | null,
  tenantId: string | null
): Promise<ResendConfigLookupResult> {
  const systemConfig = getSystemResendConfig()

  if (!emailDomain || !tenantId) {
    return {
      config: systemConfig,
      businessId: null,
      businessName: null,
      fromEmailDomain: null
    }
  }

  const cleanedDomain = emailDomain.trim().toLowerCase()
  const domainKey = deriveDomainKey(cleanedDomain)
  const configs = await fetchTenantResendConfigs(tenantId)

  if (!configs.length) {
    return {
      config: systemConfig,
      businessId: null,
      businessName: null,
      fromEmailDomain: null
    }
  }

  const directMatch = configs.find((config) => {
    const configDomain = extractDomain(config.from_email)
    return configDomain === cleanedDomain
  })

  if (directMatch) {
    return {
      config: {
        apiKey: directMatch.resend_api_key,
        fromEmail: directMatch.from_email,
        fromName: directMatch.from_name || DEFAULT_FROM_NAME
      },
      businessId: directMatch.business_id,
      businessName: directMatch.businesses?.business_name ?? null,
      fromEmailDomain: extractDomain(directMatch.from_email)
    }
  }

  const fallbackMatch = configs.find((config) => {
    const businessKey = normalizeToken(config.businesses?.business_name ?? '')
    const configDomain = extractDomain(config.from_email)
    const configDomainKey = configDomain ? deriveDomainKey(configDomain) : ''
    if (domainKey && businessKey.includes(domainKey)) {
      return true
    }
    if (domainKey && configDomainKey && configDomainKey.includes(domainKey)) {
      return true
    }
    return false
  })

  if (fallbackMatch) {
    return {
      config: {
        apiKey: fallbackMatch.resend_api_key,
        fromEmail: fallbackMatch.from_email,
        fromName: fallbackMatch.from_name || DEFAULT_FROM_NAME
      },
      businessId: fallbackMatch.business_id,
      businessName: fallbackMatch.businesses?.business_name ?? null,
      fromEmailDomain: extractDomain(fallbackMatch.from_email)
    }
  }

  return {
    config: systemConfig,
    businessId: null,
    businessName: null,
    fromEmailDomain: null
  }
}
