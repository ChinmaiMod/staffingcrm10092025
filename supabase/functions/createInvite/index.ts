import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { v4 } from 'https://deno.land/std@0.168.0/uuid/mod.ts'
import { getResendConfigForDomain } from '../_shared/resendConfig.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { tenant_id, email, role, frontendUrl: requestFrontendUrl } = await req.json()
    if (!tenant_id || !email) throw new Error('Missing tenant_id or email')

    // Validate caller: expect Authorization: Bearer <access_token>
    const authHeader = req.headers.get('authorization') || ''
    const tokenMatch = authHeader.match(/Bearer (.*)/i)
    if (!tokenMatch) throw new Error('Missing Authorization bearer token')
    const accessToken = tokenMatch[1]

    // Get user from provided access token
    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken)
    if (userErr || !userData?.user) throw new Error('Invalid access token')
    const callerId = userData.user.id

    // Check caller's profile role and tenant
    const { data: callerProfile, error: profErr } = await supabase
      .from('profiles')
      .select('id, tenant_id, role')
      .eq('id', callerId)
      .maybeSingle()
    if (profErr) throw profErr
    if (!callerProfile) throw new Error('Caller has no profile')

    // Allow if SUPER_ADMIN, or if ADMIN for same tenant
    if (!(callerProfile.role === 'SUPER_ADMIN' || (callerProfile.role === 'ADMIN' && callerProfile.tenant_id === tenant_id))) {
      throw new Error('Unauthorized: only tenant ADMIN or SUPER_ADMIN can create invites')
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString() // 7 days

    const { data, error } = await supabase.from('tenant_invites').insert({
      tenant_id,
      email: email.toLowerCase(),
      token,
      role: role || 'USER',
      status: 'PENDING',
      expires_at: expiresAt,
      created_by: callerId
    }).select().single()

    if (error) throw error

    // Insert audit log
    await supabase.from('audit_logs').insert({
      user_id: callerId,
      tenant_id,
      action: 'INVITE_CREATED',
      resource_type: 'tenant_invite',
      resource_id: data.invite_id,
      details: { email: email.toLowerCase(), role: data.role }
    })

    // Try to send email via Resend (https://resend.com/)
    // Get frontend URL from request, fallback to env, or default
    const frontendUrl = requestFrontendUrl 
      ? new URL(requestFrontendUrl).origin 
      : (Deno.env.get('FRONTEND_URL') || Deno.env.get('VITE_FRONTEND_URL') || 'http://localhost:5173')
    const emailDomain = (email.split('@')[1] || '').toLowerCase()
    const resendLookup = await getResendConfigForDomain(emailDomain || null, tenant_id)
    const resendCfg = resendLookup.config
    if (resendCfg.apiKey && frontendUrl) {
      const inviteLink = `${frontendUrl.replace(/\/$/, '')}/register?invite=${data.token}`
      const fromAddr = `${resendCfg.fromName} <${resendCfg.fromEmail}>`
      const subject = Deno.env.get('INVITE_SUBJECT') || `You are invited to join`

      // Load HTML template and substitute variables
      // Inline template to avoid file system access issues in deployment
      const tenantData = await supabase.from('tenants').select('company_name').eq('tenant_id', tenant_id).maybeSingle()
      const callerData = await supabase.from('profiles').select('email').eq('id', callerId).maybeSingle()
      const companyName = tenantData?.data?.company_name || 'your company'
      const inviterEmail = callerData?.data?.email || ''
      
      let template = `
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>You're invited</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height:1.5; color:#111;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="max-width:600px; margin:0 auto; padding:20px;">
          <h2 style="color:#0b5cff;">You've been invited to join ${companyName}</h2>
          <p>Hi,</p>
          <p>${inviterEmail} has invited you to join <strong>${companyName}</strong> on our platform.</p>
          <p style="text-align:center; margin:24px 0;">
            <a href="${inviteLink}" style="background:#0b5cff;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invitation</a>
          </p>
          <p>If the button doesn't work, copy and paste the following link into your browser:</p>
          <p style="word-break:break-all">${inviteLink}</p>
          <hr />
          <p style="font-size:12px;color:#666;">If you did not expect this invitation, you can ignore this email.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendCfg.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddr,
            to: [data.email],
            subject,
            html: template
          })
        })

        // record audit
        await supabase.from('audit_logs').insert({
          user_id: callerId,
          tenant_id,
          action: 'INVITE_EMAIL_SENT',
          resource_type: 'tenant_invite',
          resource_id: data.invite_id,
          details: { email: data.email }
        })
      } catch (sendErr) {
        console.error('Resend error', sendErr)
      }
    }

    return new Response(JSON.stringify({ success: true, invite: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
