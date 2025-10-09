// Supabase Edge Function: verifyToken
// Deploy to: supabase/functions/verifyToken

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
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

    if (!token) {
      throw new Error('Token is required')
    }

    // Find token
    const { data: emailToken, error: tokenError } = await supabase
      .from('email_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .eq('token_type', 'VERIFY')
      .single()

    if (tokenError || !emailToken) {
      throw new Error('Invalid or expired token')
    }

    // Check if token is expired
    if (new Date(emailToken.expires_at) < new Date()) {
      throw new Error('Token has expired')
    }

    // Mark token as used
    await supabase
      .from('email_tokens')
      .update({ used: true })
      .eq('token_id', emailToken.token_id)

    // Activate user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ status: 'ACTIVE' })
      .eq('id', emailToken.user_id)

    if (profileError) throw profileError

    // Create audit log
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', emailToken.user_id)
      .single()

    if (profile) {
      await supabase.from('audit_logs').insert({
        user_id: emailToken.user_id,
        tenant_id: profile.tenant_id,
        action: 'EMAIL_VERIFIED',
        resource_type: 'profile',
        resource_id: emailToken.user_id,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email verified successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
