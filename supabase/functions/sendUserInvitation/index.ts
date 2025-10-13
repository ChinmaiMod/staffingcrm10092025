// Supabase Edge Function: sendUserInvitation
// Sends email invitation to a user to join a tenant organization

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate secure random token
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('sendUserInvitation function called')

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

    const { email, fullName, message, tenantId, invitedBy } = await req.json()
    console.log('Request data:', { email: !!email, fullName: !!fullName, tenantId: !!tenantId, invitedBy: !!invitedBy })

    if (!email || !fullName || !tenantId || !invitedBy) {
      throw new Error('Missing required fields: email, fullName, tenantId, invitedBy')
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      throw new Error('A user with this email already exists in the system')
    }

    // Check if active invitation exists
    const { data: existingInvite } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('tenant_id', tenantId)
      .in('status', ['PENDING', 'SENT'])
      .single()

    if (existingInvite) {
      throw new Error('An active invitation already exists for this email')
    }

    // Get tenant information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('company_name, email_domain')
      .eq('tenant_id', tenantId)
      .single()

    if (tenantError || !tenant) {
      throw new Error('Tenant not found')
    }

    // Get inviter information
    const { data: inviter, error: inviterError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', invitedBy)
      .single()

    if (inviterError || !inviter) {
      throw new Error('Inviter profile not found')
    }

    // Generate secure token
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase(),
        invited_user_name: fullName,
        token: token,
        status: 'SENT',
        message: message || null,
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      throw new Error(`Failed to create invitation: ${inviteError.message}`)
    }

    // TODO: Send actual email using Supabase Auth or email service
    // For now, we'll just log the invitation details
    const invitationUrl = `${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.vercel.app')}/accept-invitation?token=${token}`
    
    console.log('Invitation created:', {
      id: invitation.id,
      email: email,
      url: invitationUrl,
      expiresAt: expiresAt
    })

    // In production, integrate with an email service like:
    // - Supabase Auth email templates
    // - SendGrid
    // - AWS SES
    // - Resend
    
    const emailContent = {
      to: email,
      subject: `You're invited to join ${tenant.company_name} on Staffing CRM`,
      html: `
        <h2>You've been invited!</h2>
        <p>Hi ${fullName},</p>
        <p>${inviter.full_name || inviter.email} has invited you to join <strong>${tenant.company_name}</strong> on Staffing CRM.</p>
        ${message ? `<p><em>"${message}"</em></p>` : ''}
        <p>Click the link below to accept the invitation and create your account:</p>
        <p><a href="${invitationUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
        <p>Or copy and paste this link into your browser:</p>
        <p>${invitationUrl}</p>
        <p>This invitation will expire on ${expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      `
    }

    console.log('Email content prepared:', emailContent)

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: invitedBy,
        tenant_id: tenantId,
        action: 'USER_INVITED',
        resource_type: 'invitation',
        resource_id: invitation.id,
        details: {
          invited_email: email,
          invited_name: fullName
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: email,
          expiresAt: expiresAt
        }
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
        error: error?.message || 'Failed to send invitation',
        code: error?.code || 'invitation_error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
