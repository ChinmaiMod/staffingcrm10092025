// Supabase Edge Function: resendUserInvitation
// Regenerates an invitation token, updates expiry, and sends the email again

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getResendConfigForDomain } from '../_shared/resendConfig.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
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

    const { invitationId, invitedBy } = await req.json()

    if (!invitationId) {
      throw new Error('Missing required field: invitationId')
    }

    const { data: invitation, error: invitationError } = await supabase
      .from('user_invitations')
      .select('id, email, invited_user_name, tenant_id, status, message, invited_by')
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      throw new Error('Invitation not found')
    }

    if (invitation.status === 'REVOKED') {
      throw new Error('Cannot resend a revoked invitation')
    }

    if (invitation.status === 'ACCEPTED') {
      throw new Error('User has already accepted this invitation')
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('company_name, email_domain')
      .eq('tenant_id', invitation.tenant_id)
      .single()

    if (tenantError || !tenant) {
      throw new Error('Tenant not found')
    }

    const inviterId = invitedBy || invitation.invited_by
    let inviterName = 'Staffing CRM'
    let inviterEmail = ''

    if (inviterId) {
      const { data: inviter, error: inviterError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', inviterId)
        .single()

      if (!inviterError && inviter) {
        inviterName = inviter.full_name || inviter.email || inviterName
        inviterEmail = inviter.email || inviterEmail
      }
    }

    const token = generateToken()
    const now = new Date()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const updatePayload: Record<string, unknown> = {
      token,
      status: 'SENT',
      expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString()
    }

    if (invitedBy && invitedBy !== invitation.invited_by) {
      updatePayload.invited_by = invitedBy
    }

    const { error: updateError } = await supabase
      .from('user_invitations')
      .update(updatePayload)
      .eq('id', invitationId)

    if (updateError) {
      throw new Error(`Failed to update invitation: ${updateError.message}`)
    }

    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'
    const invitationUrl = `${FRONTEND_URL}/accept-invitation?token=${token}`

    const emailDomain = invitation.email.split('@')[1]?.toLowerCase() ?? null
    const resendConfigLookup = await getResendConfigForDomain(emailDomain, invitation.tenant_id)
    const resendConfig = resendConfigLookup.config

    console.log('Resend configuration (resendUserInvitation):', {
      emailDomain,
      businessId: resendConfigLookup.businessId,
      businessName: resendConfigLookup.businessName,
      fromEmailDomain: resendConfigLookup.fromEmailDomain,
      hasApiKey: Boolean(resendConfig.apiKey)
    })

    if (resendConfig.apiKey) {
      try {
        const subject = `Reminder: You're invited to join ${tenant.company_name} on Staffing CRM`

        const emailData = {
          from: `${resendConfig.fromName} <${resendConfig.fromEmail}>`,
          to: [invitation.email],
          subject,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Invitation Reminder</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <h2 style="color: #1e293b; margin-top: 0;">Reminder: You're invited!</h2>
                  <p style="font-size: 16px;">Hi ${invitation.invited_user_name},</p>
                  <p style="font-size: 16px;">${inviterName}${inviterEmail ? ` (${inviterEmail})` : ''} wants to make sure you saw their invitation to join <strong>${tenant.company_name}</strong> on Staffing CRM.</p>
                  ${invitation.message ? `<div style="background: white; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;"><em>"${invitation.message}"</em></div>` : ''}
                </div>
                <p style="font-size: 16px;">Click the button below to accept the invitation and create your account. We've refreshed your access link and extended the expiration date.</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${invitationUrl}" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Accept Invitation</a>
                </div>
                <p style="font-size: 14px; color: #64748b;">Or copy and paste this link into your browser:</p>
                <p style="font-size: 14px; word-break: break-all; background: #f1f5f9; padding: 12px; border-radius: 4px;">${invitationUrl}</p>
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                  <p style="font-size: 14px; color: #64748b;">
                    <strong>Important:</strong> This invitation will now expire on ${expiresAt.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}.
                  </p>
                  <p style="font-size: 14px; color: #64748b;">
                    If you have any questions, reply to this email and we'll help you get started.
                  </p>
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                  This email was sent from Staffing CRM
                </p>
              </body>
            </html>
          `,
          text: `Reminder: You're invited!\n\n${inviterName}${inviterEmail ? ` (${inviterEmail})` : ''} wants to make sure you saw their invitation to join ${tenant.company_name} on Staffing CRM.\n\n${invitation.message ? `Message: "${invitation.message}"\n\n` : ''}Use this refreshed link to accept the invitation and create your account (expires on ${expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}):\n\n${invitationUrl}\n\nIf you did not expect this, you can ignore this email.`,
        }

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendConfig.apiKey}`
          },
          body: JSON.stringify(emailData)
        })

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text()
          console.error('Failed to send resend email via Resend:', errorText)
          throw new Error(`Email sending failed: ${errorText}`)
        }

        const emailResult = await emailResponse.json()
        console.log('Invitation resent successfully via Resend:', emailResult)
      } catch (emailError) {
        console.error('Error sending resend email:', emailError)
        // Continue - the invitation is still valid with refreshed token
      }
    } else {
      console.log('Resend email skipped - Resend configuration missing. Invitation URL:', invitationUrl)
    }

    await supabase.from('audit_logs').insert({
      user_id: invitedBy || null,
      tenant_id: invitation.tenant_id,
      action: 'USER_INVITATION_RESENT',
      resource_type: 'invitation',
      resource_id: invitationId,
      details: {
        invited_email: invitation.email,
        invited_name: invitation.invited_user_name,
        resend_business: resendConfigLookup.businessName || null
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        invitationId,
        expiresAt
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Edge function resendUserInvitation error:', error)
    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to resend invitation',
        code: error?.code || 'resend_invitation_error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
