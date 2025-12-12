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

    const { tenant_id, status } = await req.json()
    if (!tenant_id || !status) throw new Error('Missing tenant_id or status')
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) throw new Error('Invalid status')

    // Validate caller via Authorization header
    const authHeader = req.headers.get('authorization') || ''
    const tokenMatch = authHeader.match(/Bearer (.*)/i)
    if (!tokenMatch) throw new Error('Missing Authorization bearer token')
    const accessToken = tokenMatch[1]

    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken)
    if (userErr || !userData?.user) throw new Error('Invalid access token')
    const callerId = userData.user.id

    // Check caller role; only SUPER_ADMIN allowed
    const { data: callerProfile, error: profErr } = await supabase.from('profiles').select('role').eq('id', callerId).maybeSingle()
    if (profErr) throw profErr
    if (!callerProfile || callerProfile.role !== 'SUPER_ADMIN') throw new Error('Unauthorized: only SUPER_ADMIN can update tenant status')

    const { data, error } = await supabase.from('tenants').update({ status }).eq('tenant_id', tenant_id).select().single()
    if (error) throw error

    // Audit log
    await supabase.from('audit_logs').insert({ user_id: callerId, tenant_id, action: 'TENANT_STATUS_UPDATED', resource_type: 'tenant', resource_id: tenant_id, details: { status } })

    return new Response(JSON.stringify({ success: true, tenant: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
