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
    is_active?: boolean | null
  } | null
}

interface ResendConfigLookupResult {
  config: ResendConfig
  businessId: string | null
  businessName: string | null
  fromEmailDomain: string | null
}

interface BusinessDomainMapping {
  business_id: string
  email_domain: string
  is_primary: boolean
  businesses?: {
    business_name: string | null
    is_active?: boolean | null
  } | null
}

const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL')
const RESEND_FROM_NAME = Deno.env.get('RESEND_FROM_NAME')

const DEFAULT_FROM_EMAIL =
  RESEND_FROM_EMAIL ||
  Deno.env.get('DEFAULT_FROM_EMAIL') ||
  Deno.env.get('FROM_EMAIL') ||
  'no-reply@staffingcrm.app'

const DEFAULT_FROM_NAME =
  RESEND_FROM_NAME ||
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

function getSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Resend lookup')
    return null
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
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
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('business_resend_api_keys')
    .select('business_id, resend_api_key, from_email, from_name, businesses!inner(business_name, is_active)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error || !data) {
    console.error('Failed to load business Resend configs:', error)
    return []
  }

  return data as TenantResendConfig[]
}

async function fetchTenantDomainMappings(
  tenantId: string
): Promise<BusinessDomainMapping[]> {
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('business_email_domains')
    .select('business_id, email_domain, is_primary, businesses!inner(business_name, is_active)')
    .eq('tenant_id', tenantId)

  if (error || !data) {
    console.error('Failed to load business email domain mappings:', error)
    return []
  }

  return (data as BusinessDomainMapping[]).filter(
    (mapping) => mapping.businesses?.is_active !== false
  )
}

function domainMatches(domain: string, candidate: string): boolean {
  if (!domain || !candidate) return false
  if (domain === candidate) return true
  return domain.endsWith(`.${candidate}`)
}

function mapTenantConfig(config: TenantResendConfig): ResendConfig {
  return {
    apiKey: config.resend_api_key,
    fromEmail: config.from_email || DEFAULT_FROM_EMAIL,
    fromName: config.from_name || DEFAULT_FROM_NAME
  }
}

function mapTenantConfigToLookup(
  config: TenantResendConfig
): ResendConfigLookupResult {
  return {
    config: mapTenantConfig(config),
    businessId: config.business_id,
    businessName: config.businesses?.business_name ?? null,
    fromEmailDomain: extractDomain(config.from_email)
  }
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

  return mapTenantConfig(match)
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
  const [configs, domainMappings] = await Promise.all([
    fetchTenantResendConfigs(tenantId),
    fetchTenantDomainMappings(tenantId)
  ])

  const activeConfigs = configs.filter((config) => {
    if (!config.resend_api_key || !config.from_email) {
      return false
    }
    if (config.businesses?.is_active === false) {
      return false
    }
    return true
  })

  if (!activeConfigs.length) {
    return {
      config: systemConfig,
      businessId: null,
      businessName: null,
      fromEmailDomain: null
    }
  }

  const configByBusiness = new Map<string, TenantResendConfig>()
  activeConfigs.forEach((config) => {
    configByBusiness.set(config.business_id, config)
  })

  const filteredDomainMappings = domainMappings.filter(
    (mapping) => mapping.businesses?.is_active !== false
  )
  const sortedDomainMappings = [...filteredDomainMappings].sort((a, b) => {
    if (a.is_primary === b.is_primary) {
      return 0
    }
    return a.is_primary ? -1 : 1
  })

  const directMappingMatch = sortedDomainMappings.find((mapping) => {
    const mappingDomain = mapping.email_domain?.trim().toLowerCase() ?? ''
    return domainMatches(cleanedDomain, mappingDomain)
  })

  if (directMappingMatch) {
    const matchedConfig = configByBusiness.get(directMappingMatch.business_id)

    if (matchedConfig) {
      return mapTenantConfigToLookup(matchedConfig)
    }

    console.warn('Domain mapping found but no active Resend config for business', {
      tenantId,
      emailDomain: cleanedDomain,
      businessId: directMappingMatch.business_id
    })
  }

  const directSenderMatch = activeConfigs.find((config) => {
    const configDomain = extractDomain(config.from_email)
    return configDomain ? domainMatches(cleanedDomain, configDomain) : false
  })

  if (directSenderMatch) {
    return mapTenantConfigToLookup(directSenderMatch)
  }

  const mappingKeyFallback = sortedDomainMappings.find((mapping) => {
    if (!domainKey) {
      return false
    }

    const mappingDomain = mapping.email_domain?.trim().toLowerCase() ?? ''
    const mappingDomainKey = mappingDomain ? deriveDomainKey(mappingDomain) : ''
    const businessKey = normalizeToken(mapping.businesses?.business_name ?? '')

    if (mappingDomainKey && (mappingDomainKey === domainKey || mappingDomainKey.includes(domainKey) || domainKey.includes(mappingDomainKey))) {
      return true
    }

    if (businessKey && businessKey.includes(domainKey)) {
      return true
    }

    return false
  })

  if (mappingKeyFallback) {
    const matchedConfig = configByBusiness.get(mappingKeyFallback.business_id)

    if (matchedConfig) {
      return mapTenantConfigToLookup(matchedConfig)
    }
  }

  const fallbackConfig = activeConfigs.find((config) => {
    const businessKey = normalizeToken(config.businesses?.business_name ?? '')
    const configDomain = extractDomain(config.from_email)
    const configDomainKey = configDomain ? deriveDomainKey(configDomain) : ''
    if (domainKey && businessKey && businessKey.includes(domainKey)) {
      return true
    }
    if (domainKey && configDomainKey && configDomainKey.includes(domainKey)) {
      return true
    }
    return false
  })

  if (fallbackConfig) {
    return mapTenantConfigToLookup(fallbackConfig)
  }

  const primaryMappingConfig = sortedDomainMappings.find(
    (mapping) => mapping.is_primary && configByBusiness.has(mapping.business_id)
  )

  if (primaryMappingConfig) {
    const matchedConfig = configByBusiness.get(primaryMappingConfig.business_id)

    if (matchedConfig) {
      return mapTenantConfigToLookup(matchedConfig)
    }
  }

  if (activeConfigs.length === 1) {
    return mapTenantConfigToLookup(activeConfigs[0])
  }

  return {
    config: systemConfig,
    businessId: null,
    businessName: null,
    fromEmailDomain: null
  }
}
