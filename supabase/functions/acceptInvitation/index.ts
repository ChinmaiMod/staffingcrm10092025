// Supabase Edge Function: acceptInvitation
// Handles invitation acceptance, profile creation, and role assignment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error: Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { token, userId, password } = await req.json()

    if (!token || !userId) {
      throw new Error('Missing required fields: token, userId')
    }

    // Verify invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .select(`
        *,
        tenants(company_name, email_domain)
      `)
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      throw new Error('Invitation not found or invalid')
    }

    // Check invitation status
    if (invitation.status === 'ACCEPTED') {
      throw new Error('This invitation has already been accepted')
    }

    if (invitation.status === 'REVOKED') {
      throw new Error('This invitation has been revoked')
    }

    if (invitation.status === 'EXPIRED' || new Date(invitation.expires_at) < new Date()) {
      throw new Error('This invitation has expired')
    }

    // Verify user ID matches the invitation email
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    
    if (authError || !authUser.user) {
      throw new Error('User not found')
    }

    if (authUser.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error('User email does not match invitation email')
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      // Profile already exists, just mark invitation as accepted
      await supabase
        .from('user_invitations')
        .update({
          status: 'ACCEPTED',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account already exists. Invitation marked as accepted.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Create profile using service_role (bypasses RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: invitation.email.toLowerCase(),
        full_name: invitation.invited_user_name,
        tenant_id: invitation.tenant_id,
        role: 'USER', // Legacy role field
        status: 'ACTIVE' // Set to ACTIVE since user completed signup
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      throw new Error(`Failed to create user profile: ${profileError.message}`)
    }

    // Assign READ_ONLY role (role_id = 1) as default for invited users
    const { error: roleError } = await supabase
      .from('user_role_assignments')
      .insert({
        user_id: userId,
        role_id: 1, // READ_ONLY role
        tenant_id: invitation.tenant_id,
        assigned_by: invitation.invited_by,
        is_active: true
      })

    if (roleError) {
      console.error('Role assignment error:', roleError)
      // Don't throw - user is created, admin can assign role later
    }

    // Mark invitation as accepted
    await supabase
      .from('user_invitations')
      .update({
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        tenant_id: invitation.tenant_id,
        action: 'INVITATION_ACCEPTED',
        resource_type: 'invitation',
        resource_id: invitation.id,
        details: {
          email: invitation.email
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('acceptInvitation error:', error)
    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to accept invitation',
        code: error?.code || 'accept_invitation_error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

