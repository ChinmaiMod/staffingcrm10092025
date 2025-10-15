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

    // Get Resend API key - try business-specific first, then fall back to system default
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured - invitation created but email not sent')
      // Continue without sending email - invitation still saved in database
    }

    // Build invitation URL using configured frontend URL
    const invitationUrl = `${FRONTEND_URL}/accept-invitation?token=${token}`
    
    console.log('Invitation created:', {
      id: invitation.id,
      email: email,
      url: invitationUrl,
      expiresAt: expiresAt
    })

    // Send email using Resend API
    if (RESEND_API_KEY) {
      try {
        const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'no-reply@staffingcrm.app'
        const FROM_NAME = Deno.env.get('FROM_NAME') || 'Staffing CRM'
        
        const emailData = {
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [email],
          subject: `You're invited to join ${tenant.company_name} on Staffing CRM`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Invitation to ${tenant.company_name}</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <h2 style="color: #1e293b; margin-top: 0;">You've been invited!</h2>
                  <p style="font-size: 16px;">Hi ${fullName},</p>
                  <p style="font-size: 16px;">${inviter.full_name || inviter.email} has invited you to join <strong>${tenant.company_name}</strong> on Staffing CRM.</p>
                  ${message ? `<div style="background: white; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;"><em>"${message}"</em></div>` : ''}
                </div>
                
                <p style="font-size: 16px;">Click the button below to accept the invitation and create your account:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${invitationUrl}" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Accept Invitation</a>
                </div>
                
                <p style="font-size: 14px; color: #64748b;">Or copy and paste this link into your browser:</p>
                <p style="font-size: 14px; word-break: break-all; background: #f1f5f9; padding: 12px; border-radius: 4px;">${invitationUrl}</p>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                  <p style="font-size: 14px; color: #64748b;">
                    <strong>Important:</strong> This invitation will expire on ${expiresAt.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}.
                  </p>
                  <p style="font-size: 14px; color: #64748b;">
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                  This email was sent from Staffing CRM
                </p>
              </body>
            </html>
          `,
          text: `You've been invited!
          
Hi ${fullName},

${inviter.full_name || inviter.email} has invited you to join ${tenant.company_name} on Staffing CRM.

${message ? `Message: "${message}"\n\n` : ''}Click the link below to accept the invitation and create your account:

${invitationUrl}

This invitation will expire on ${expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.

If you didn't expect this invitation, you can safely ignore this email.`,
        }

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailData),
        })

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text()
          console.error('Failed to send email via Resend:', errorText)
          throw new Error(`Email sending failed: ${errorText}`)
        }

        const emailResult = await emailResponse.json()
        console.log('Email sent successfully via Resend:', emailResult)
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // Don't throw - invitation is still created in database
        // Admin can manually share the link or resend
      }
    } else {
      console.log('Email not sent - RESEND_API_KEY not configured. Invitation URL:', invitationUrl)
    }

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
