// Supabase Edge Function: getPostLoginRoute
// Deploy to: supabase/functions/getPostLoginRoute

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
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('userId is required')
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id, status')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new Error('Profile not found')
    }

    // Check if email is verified
    if (profile.status !== 'ACTIVE') {
      return new Response(
        JSON.stringify({
          route: '/verify-required',
          message: 'Email verification required',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError && subError.code !== 'PGRST116') {
      throw subError
    }

    // Determine route based on subscription
    let route = '/plans'
    
    if (!subscription) {
      route = '/plans'
    } else if (subscription.plan_name === 'FREE') {
      route = '/crm'
    } else if (subscription.plan_name === 'CRM') {
      route = '/crm'
    } else if (subscription.plan_name === 'SUITE') {
      route = '/suite'
    }

    return new Response(
      JSON.stringify({
        route,
        subscription: subscription || null,
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
