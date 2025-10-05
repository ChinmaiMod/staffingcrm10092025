import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { v4 } from 'https://deno.land/std@0.168.0/uuid/mod.ts'

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

    const { tenant_id, email, role } = await req.json()
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

    // Try to send email via Resend (https://resend.com/) if API key and FRONTEND_URL available
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const frontendUrl = Deno.env.get('FRONTEND_URL') || Deno.env.get('VITE_FRONTEND_URL')
    if (resendKey && frontendUrl) {
      const inviteLink = `${frontendUrl.replace(/\/$/, '')}/register?invite=${data.token}`
      const fromAddr = Deno.env.get('INVITE_FROM') || 'no-reply@example.com'
      const subject = Deno.env.get('INVITE_SUBJECT') || 'You are invited'

      // Load HTML template and substitute variables
      let template = ''
      try {
        const filePath = new URL('../templates/invite_template.html', import.meta.url)
        template = await Deno.readTextFile(filePath)
        template = template.replace(/{{INVITE_LINK}}/g, inviteLink)
        template = template.replace(/{{COMPANY_NAME}}/g, (await supabase.from('tenants').select('company_name').eq('tenant_id', tenant_id).maybeSingle()).data?.company_name || 'your company')
        template = template.replace(/{{INVITER_EMAIL}}/g, (await supabase.from('profiles').select('email').eq('id', callerId).maybeSingle()).data?.email || '')
      } catch (tmplErr) {
        console.error('Template load error', tmplErr)
      }

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddr,
            to: [data.email],
            subject,
            html
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
