// Supabase Edge Function: createTenantAndProfile
// Deploy to: supabase/functions/createTenantAndProfile

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId, email, username, companyName } = await req.json()

    if (!userId || !email || !companyName) {
      throw new Error('Missing required fields: userId, email, companyName')
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        company_name: companyName,
        status: 'ACTIVE'
      })
      .select()
      .single()

    if (tenantError) throw tenantError

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        username: username || email.split('@')[0],
        tenant_id: tenant.tenant_id,
        role: 'ADMIN',
        status: 'PENDING' // Will be ACTIVE after email verification
      })
      .select()
      .single()

    if (profileError) throw profileError

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        tenant_id: tenant.tenant_id,
        action: 'TENANT_CREATED',
        resource_type: 'tenant',
        resource_id: tenant.tenant_id,
        details: { company_name: companyName }
      })

    return new Response(
      JSON.stringify({
        success: true,
        tenant,
        profile
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
