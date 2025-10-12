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
    // Log the start
    console.log('createTenantAndProfile function called')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey })
      throw new Error('Server configuration error: Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { userId, email, companyName, phoneNumber } = await req.json()
    console.log('Request data:', { userId: !!userId, email: !!email, companyName, phoneNumber: !!phoneNumber })

    if (!userId || !email || !companyName) {
      throw new Error('Missing required fields: userId, email, companyName')
    }

    // Extract email domain
    const emailDomain = email.toLowerCase().split('@')[1]
    if (!emailDomain) {
      throw new Error('Invalid email format')
    }
    console.log('Email domain:', emailDomain)

    // Check if profile already exists
    console.log('Checking for existing profile...')
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      console.log('User already exists:', existingProfile.email)
      throw new Error('An account with this email already exists. Please try logging in instead.')
    }

    // Check if email is already used
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single()

    if (existingEmail) {
      console.log('Email already in use:', email)
      throw new Error('This email address is already registered. Please try logging in instead.')
    }

    // Check if domain is already registered to another tenant
    console.log('Checking for existing tenant with same domain...')
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('tenant_id, company_name, email_domain')
      .ilike('email_domain', emailDomain)
      .single()

    if (existingTenant) {
      console.log('Domain already registered:', emailDomain, 'to tenant:', existingTenant.company_name)
      throw new Error(`A company account with the domain @${emailDomain} already exists (${existingTenant.company_name}). Please contact your company administrator to be added to the existing account.`)
    }

    // Create tenant
    console.log('Creating tenant...')
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        company_name: companyName,
        email_domain: emailDomain,
        status: 'ACTIVE'
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Tenant creation error:', tenantError)
      
      // Check for unique constraint violation on email_domain
      if (tenantError.code === '23505' && tenantError.message.includes('email_domain')) {
        throw new Error(`A company account with the domain @${emailDomain} already exists. Please contact your company administrator to be added to the existing account.`)
      }
      
      throw new Error(`Failed to create tenant: ${tenantError.message}`)
    }
    console.log('Tenant created:', tenant.tenant_id, 'with domain:', emailDomain)

    // Create profile
    console.log('Creating profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        phone_number: phoneNumber || null,
        tenant_id: tenant.tenant_id,
        role: 'ADMIN',
        status: 'PENDING' // Will be ACTIVE after email verification
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      
      // Check for duplicate key error (PostgreSQL error code 23505)
      if (profileError.code === '23505') {
        throw new Error('This account already exists. Please try logging in instead.')
      }
      
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }
    console.log('Profile created successfully')

    // Create audit log
    console.log('Creating audit log...')
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

    console.log('Registration completed successfully')
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
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
