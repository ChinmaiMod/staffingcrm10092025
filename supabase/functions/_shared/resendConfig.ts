/**
 * Shared utility for getting Resend API configuration
 * Used across edge functions to support business-specific email sending
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ResendConfig {
  apiKey: string
  fromEmail: string
  fromName: string
}

/**
 * Get Resend API configuration for a specific business
 * Falls back to system default if no business-specific config exists
 * 
 * @param businessId - The business ID to get config for (null for system default)
 * @param tenantId - The tenant ID
 * @returns Promise<ResendConfig>
 */
export async function getResendConfig(
  businessId: string | null,
  tenantId: string | null
): Promise<ResendConfig> {
  // System default configuration
  const systemConfig: ResendConfig = {
    apiKey: Deno.env.get('RESEND_API_KEY') || '',
    fromEmail: Deno.env.get('DEFAULT_FROM_EMAIL') || 'noreply@staffingcrm.com',
    fromName: Deno.env.get('DEFAULT_FROM_NAME') || 'Staffing CRM'
  }

  // If no business or tenant ID, return system default
  if (!businessId || !tenantId) {
    console.log('Using system default Resend configuration')
    return systemConfig
  }

  try {
    // Create service role client to query business API keys
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Query business-specific API key
    const { data, error } = await supabaseAdmin
      .from('business_resend_api_keys')
      .select('resend_api_key, from_email, from_name')
      .eq('tenant_id', tenantId)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      console.log('No business-specific Resend config found, using system default')
      return systemConfig
    }

    console.log(`Using business-specific Resend configuration for business ${businessId}`)
    return {
      apiKey: data.resend_api_key,
      fromEmail: data.from_email,
      fromName: data.from_name || systemConfig.fromName
    }
  } catch (err) {
    console.error('Error getting Resend config, falling back to system default:', err)
    return systemConfig
  }
}

/**
 * Get system default Resend configuration
 * Used for registration, password reset, and other non-business emails
 */
export function getSystemResendConfig(): ResendConfig {
  return {
    apiKey: Deno.env.get('RESEND_API_KEY') || '',
    fromEmail: Deno.env.get('DEFAULT_FROM_EMAIL') || 'noreply@staffingcrm.com',
    fromName: Deno.env.get('DEFAULT_FROM_NAME') || 'Staffing CRM'
  }
}
