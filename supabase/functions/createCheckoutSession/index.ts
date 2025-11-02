// Supabase Edge Function: createCheckoutSession
// Deploy to: supabase/functions/createCheckoutSession

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    const { priceId, tenantId, profileId, billingCycle, promoCode, frontendUrl: requestFrontendUrl } = await req.json()

    if (!priceId || !tenantId || !profileId) {
      throw new Error('Missing required fields')
    }

    // Get frontend URL from request, fallback to env, or default
    const frontendUrl = requestFrontendUrl 
      ? new URL(requestFrontendUrl).origin 
      : (Deno.env.get('FRONTEND_URL') || Deno.env.get('VITE_FRONTEND_URL') || 'http://localhost:5173')

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/plans`,
      client_reference_id: tenantId,
      metadata: {
        tenant_id: tenantId,
        profile_id: profileId,
        billing_cycle: billingCycle,
      },
    }

    // Add promo code if provided
    if (promoCode) {
      // Get the promotion code from Stripe
      const promotionCodes = await stripe.promotionCodes.list({
        code: promoCode,
        active: true,
        limit: 1,
      })

      if (promotionCodes.data.length > 0) {
        sessionParams.discounts = [
          {
            promotion_code: promotionCodes.data[0].id,
          },
        ]
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
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
