// Supabase Edge Function: stripeWebhook
// Deploy to: supabase/functions/stripeWebhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    const signature = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

    if (!signature) {
      throw new Error('No signature provided')
    }

    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    )

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const tenantId = session.metadata?.tenant_id
        const profileId = session.metadata?.profile_id
        const billingCycle = session.metadata?.billing_cycle || 'MONTHLY'

        if (!tenantId) break

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        // Determine plan name based on price
        let planName = 'CRM'
        // You should map price IDs to plan names here

        // Create subscription record
        await supabase.from('subscriptions').insert({
          tenant_id: tenantId,
          plan_name: planName,
          billing_cycle: billingCycle,
          status: 'ACTIVE',
          start_date: new Date(subscription.current_period_start * 1000).toISOString(),
          end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          amount_paid: (session.amount_total || 0) / 100,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: session.customer as string,
        })

        // Create payment record
        await supabase.from('payments').insert({
          tenant_id: tenantId,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency || 'usd',
          status: 'SUCCEEDED',
          provider_txn_id: session.payment_intent as string,
          payment_method: 'card',
        })

        // Create audit log
        await supabase.from('audit_logs').insert({
          user_id: profileId,
          tenant_id: tenantId,
          action: 'SUBSCRIPTION_CREATED',
          resource_type: 'subscription',
          details: { plan: planName, amount: (session.amount_total || 0) / 100 },
        })

        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        // Update subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscriptionId)
          .single()

        if (sub) {
          await supabase.from('payments').insert({
            tenant_id: sub.tenant_id,
            subscription_id: sub.subscription_id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency || 'usd',
            status: 'SUCCEEDED',
            provider_txn_id: invoice.payment_intent as string,
            payment_method: 'card',
          })
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        // Update subscription status
        await supabase
          .from('subscriptions')
          .update({ status: 'PAST_DUE' })
          .eq('stripe_subscription_id', subscriptionId)

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELLED',
            end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        await supabase
          .from('subscriptions')
          .update({ status: 'CANCELLED' })
          .eq('stripe_subscription_id', subscription.id)

        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
