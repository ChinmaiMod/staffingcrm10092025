// Supabase Edge Function: resendVerification
// Deploy to: supabase/functions/resendVerification

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

    const { email, frontendUrl: requestFrontendUrl } = await req.json()

    if (!email) {
      throw new Error('Email is required')
    }

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, status')
      .eq('email', email.toLowerCase())
      .single()

    if (profileError || !profile) {
      throw new Error('User not found')
    }

    if (profile.status === 'ACTIVE') {
      throw new Error('Email already verified')
    }

    // Create verification token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiry

    const { error: tokenError } = await supabase
      .from('email_tokens')
      .insert({
        user_id: profile.id,
        token,
        token_type: 'VERIFY',
        expires_at: expiresAt.toISOString(),
        used: false,
      })

    if (tokenError) throw tokenError

    // Get frontend URL from request, fallback to env, or default
    const frontendUrl = requestFrontendUrl 
      ? new URL(requestFrontendUrl).origin 
      : (Deno.env.get('FRONTEND_URL') || Deno.env.get('VITE_FRONTEND_URL') || 'http://localhost:5173')
    const verificationUrl = `${frontendUrl.replace(/\/$/, '')}/verify?token=${token}`

    // In production, you would send this via SendGrid:
    // await sendEmail({
    //   to: email,
    //   subject: 'Verify your email',
    //   html: `Click here to verify: <a href="${verificationUrl}">${verificationUrl}</a>`
    // })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification email sent',
        // Remove this in production!
        debug_url: verificationUrl
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
