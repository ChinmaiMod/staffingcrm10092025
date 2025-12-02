// Supabase Edge Function: getInvitationDetails
// Provides invitation metadata for the Accept Invitation flow without requiring authentication

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
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

    const { token } = await req.json()

    if (!token || typeof token !== 'string') {
      throw new Error('Missing or invalid invitation token')
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .select(`
        id,
        email,
        invited_user_name,
        message,
        status,
        expires_at,
        tenant_id,
        invited_by,
        created_at,
        tenants ( company_name, email_domain )
      `)
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      throw new Error('Invitation not found or invalid')
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('getInvitationDetails error:', error)
    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to load invitation',
        code: error?.code || 'get_invitation_error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
