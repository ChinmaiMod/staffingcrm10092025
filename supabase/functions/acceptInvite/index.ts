import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY'))!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Accept expects the user to be authenticated client-side; pass userId in body
    const { token, userId } = await req.json()
    if (!token || !userId) throw new Error('Missing token or userId')

    // Find invite
    const { data: invite, error: inviteErr } = await supabase
      .from('tenant_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'PENDING')
      .limit(1)
      .maybeSingle()

    if (inviteErr) throw inviteErr
    if (!invite) throw new Error('Invalid or expired invite token')

    // Check expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await supabase.from('tenant_invites').update({ status: 'EXPIRED' }).eq('invite_id', invite.invite_id)
      throw new Error('Invite token expired')
    }

    // Link or create profile for the userId
    const email = invite.email

    // If profile exists for userId, update tenant and role. Otherwise create profile row.
    const { data: existingProfile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

    if (existingProfile) {
      await supabase.from('profiles').update({ tenant_id: invite.tenant_id, role: invite.role, status: 'ACTIVE', updated_at: new Date().toISOString() }).eq('id', userId)
    } else {
      // Create profile row linking to auth.users.id
      await supabase.from('profiles').insert({ id: userId, email: email.toLowerCase(), username: email.split('@')[0], tenant_id: invite.tenant_id, role: invite.role, status: 'ACTIVE' })
    }

    // Mark invite accepted
    await supabase.from('tenant_invites').update({ status: 'ACCEPTED' }).eq('invite_id', invite.invite_id)

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      tenant_id: invite.tenant_id,
      action: 'INVITE_ACCEPTED',
      resource_type: 'tenant_invite',
      resource_id: invite.invite_id,
      details: { email: invite.email }
    })

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
