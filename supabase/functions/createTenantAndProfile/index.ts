// Supabase Edge Function: createTenantAndProfile
// Deploy to: supabase/functions/createTenantAndProfile

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const MAX_USER_CHECK_ATTEMPTS = 6
const USER_CHECK_DELAY_MS = 250

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

    // Ensure auth.users row has finished replicating before we create the profile
    console.log('Verifying auth user availability...')
    let authUserReady = false
    for (let attempt = 1; attempt <= MAX_USER_CHECK_ATTEMPTS; attempt++) {
      const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(userId)

      if (authUserData?.user) {
        authUserReady = true
        break
      }

      console.log('Auth user not ready yet', { attempt, authUserError })
      await wait(USER_CHECK_DELAY_MS * attempt)
    }

    if (!authUserReady) {
      throw new Error('Your account is still being provisioned. Please retry registration in a few seconds.')
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
  let createdTenantId: string | null = null
  let createdBusinessId: string | null = null
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
    createdTenantId = tenant.tenant_id

    // Create default business for the tenant
    console.log('Creating default business for tenant...')
    let businessResponse = null
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        tenant_id: tenant.tenant_id,
        business_name: companyName,
        business_type: 'GENERAL',
        description: 'Default business created during registration',
        industry: null,
        is_default: true,
        is_active: true,
        created_by: userId,
        updated_by: userId,
        settings: {
          initializedBy: 'createTenantAndProfile',
          initializedAt: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (businessError) {
      console.error('Business creation error:', businessError)

      if (businessError.code === '23505') {
        console.log('Business already exists, fetching existing record...')
        const { data: existingBusiness, error: fetchBusinessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('tenant_id', tenant.tenant_id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        if (fetchBusinessError || !existingBusiness) {
          console.error('Failed to fetch existing business after conflict:', fetchBusinessError)
          await supabase.from('tenants').delete().eq('tenant_id', tenant.tenant_id)
          throw new Error('Failed to create default business: please contact support.')
        }

        businessResponse = existingBusiness

        const { error: updateBusinessError } = await supabase
          .from('businesses')
          .update({
            is_default: true,
            is_active: true,
            updated_by: userId
          })
          .eq('business_id', existingBusiness.business_id)

        if (updateBusinessError) {
          console.warn('Warning: failed to update existing business flags:', updateBusinessError)
        }
      } else {
        if (createdTenantId) {
          await supabase.from('tenants').delete().eq('tenant_id', createdTenantId)
        }
        throw new Error(`Failed to create default business: ${businessError.message}`)
      }
    } else {
      businessResponse = business
      createdBusinessId = business.business_id
      console.log('Business created:', business.business_id)
    }

    if (!businessResponse) {
      console.log('Business response missing, fetching latest business for tenant...')
      const { data: fallbackBusiness, error: fallbackBusinessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (fallbackBusinessError) {
        console.error('Failed to fetch fallback business record:', fallbackBusinessError)
        if (createdTenantId) {
          await supabase.from('tenants').delete().eq('tenant_id', createdTenantId)
        }
        throw new Error('Unable to determine default business for the new tenant. Please contact support.')
      }

      businessResponse = fallbackBusiness
    }

    // Audit log for business creation
    if (businessResponse?.business_id) {
      console.log('Recording business creation audit log...')
      const { error: businessAuditError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          tenant_id: tenant.tenant_id,
          action: 'BUSINESS_CREATED',
          resource_type: 'business',
          resource_id: businessResponse.business_id,
          details: {
            business_name: businessResponse.business_name,
            business_type: businessResponse.business_type
          }
        })

      if (businessAuditError) {
        console.warn('Failed to create business audit log:', businessAuditError)
      }
    }

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
      if (createdBusinessId) {
        console.log('Rolling back business due to profile creation failure', { businessId: createdBusinessId })
        await supabase.from('businesses').delete().eq('business_id', createdBusinessId)
      }
      if (createdTenantId) {
        console.log('Rolling back tenant due to profile creation failure', { tenantId: createdTenantId })
        await supabase.from('tenants').delete().eq('tenant_id', createdTenantId)
      }
      
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }
    console.log('Profile created successfully')

    // Assign CEO role to the first user (tenant creator)
    console.log('Assigning CEO role to tenant creator...')
    const { data: ceoRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('role_code', 'CEO')
      .single()

    if (roleError || !ceoRole) {
      console.error('Failed to fetch CEO role:', roleError)
      // Don't throw error - tenant and profile created successfully
      console.warn('Warning: Could not assign CEO role. Role may need to be assigned manually.')
    } else {
      const { error: assignmentError } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: ceoRole.role_id,
          tenant_id: tenant.tenant_id,
          assigned_by: userId, // Self-assigned during registration
          is_active: true
        })

      if (assignmentError) {
        console.error('Failed to assign CEO role:', assignmentError)
        // Don't throw error - tenant and profile created successfully
        console.warn('Warning: Could not assign CEO role. Role may need to be assigned manually.')
      } else {
        console.log('CEO role assigned successfully')
      }
    }

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
        profile,
        business: businessResponse
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    const errorResponse = {
      error: error?.message || 'Unknown error occurred',
      code: error?.code ?? error?.name ?? 'unknown_error',
      details: error?.stack || error?.toString()
    }
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
