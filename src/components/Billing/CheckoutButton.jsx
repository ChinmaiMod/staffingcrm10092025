import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { createCheckoutSession } from '../../api/edgeFunctions'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export default function CheckoutButton({
  priceId,
  planName,
  billingCycle,
  tenantId,
  profileId,
  disabled,
  label = 'Subscribe',
  promoCode = null,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    if (!priceId || !tenantId || !profileId) {
      setError('Missing required information')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create checkout session
      const { sessionId, url, error: sessionError } = await createCheckoutSession(
        priceId,
        tenantId,
        profileId,
        billingCycle,
        promoCode
      )

      if (sessionError) throw new Error(sessionError)

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      } else {
        // Fallback: use Stripe.js
        const stripe = await stripePromise
        const { error: redirectError } = await stripe.redirectToCheckout({
          sessionId,
        })

        if (redirectError) {
          throw redirectError
        }
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.message || 'Failed to start checkout process')
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <div className="checkout-error">{error}</div>}
      <button
        className="btn btn-primary btn-block"
        onClick={handleCheckout}
        disabled={disabled || loading}
      >
        {loading ? 'Processing...' : label}
      </button>
    </div>
  )
}
