import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantProvider'
import { useAuth } from '../../contexts/AuthProvider'
import CheckoutButton from './CheckoutButton'
import './Billing.css'

const PLANS = {
  FREE: {
    name: 'Free Trial',
    description: 'Perfect for getting started',
    price: { monthly: 0, annual: 0 },
    features: [
      'CRM module access',
      'Up to 5 users',
      '30-day trial',
      'Basic support',
      'Limited storage (1GB)',
    ],
    stripePriceId: null,
  },
  CRM: {
    name: 'CRM Plan',
    description: 'For sales and customer management',
    price: { monthly: 49, annual: 470 },
    features: [
      'Full CRM module',
      'Unlimited users',
      'Priority support',
      'Advanced reporting',
      '50GB storage',
      'API access',
    ],
    stripePriceId: {
      monthly: 'price_crm_monthly', // Replace with actual Stripe price ID
      annual: 'price_crm_annual',
    },
  },
  SUITE: {
    name: 'Complete Suite',
    description: 'All-in-one business solution',
    price: { monthly: 149, annual: 1490 },
    features: [
      'CRM + HRMS + Finance modules',
      'Unlimited users',
      '24/7 premium support',
      'Advanced analytics',
      'Unlimited storage',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
    ],
    stripePriceId: {
      monthly: 'price_suite_monthly', // Replace with actual Stripe price ID
      annual: 'price_suite_annual',
    },
    popular: true,
  },
}

export default function Plans() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { subscription } = useTenant()
  const [billingCycle, setBillingCycle] = useState('monthly')

  const handleFreeTrial = () => {
    // For free trial, redirect directly to CRM
    navigate('/crm')
  }

  const currentPlan = subscription?.plan_name || null

  return (
    <div className="plans-container">
      <div className="plans-header">
        <h1>Choose Your Plan</h1>
        <p>Select the perfect plan for your business needs</p>

        <div className="billing-toggle">
          <button
            className={billingCycle === 'monthly' ? 'active' : ''}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={billingCycle === 'annual' ? 'active' : ''}
            onClick={() => setBillingCycle('annual')}
          >
            Annual
            <span className="save-badge">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="plans-grid">
        {Object.entries(PLANS).map(([planKey, plan]) => {
          const price = plan.price[billingCycle]
          const priceId = plan.stripePriceId?.[billingCycle]
          const isCurrentPlan = currentPlan === planKey

          return (
            <div
              key={planKey}
              className={`plan-card ${plan.popular ? 'popular' : ''} ${
                isCurrentPlan ? 'current' : ''
              }`}
            >
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              {isCurrentPlan && <div className="current-badge">Current Plan</div>}

              <h2>{plan.name}</h2>
              <p className="plan-description">{plan.description}</p>

              <div className="plan-price">
                <span className="currency">$</span>
                <span className="amount">{price}</span>
                <span className="period">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
              </div>

              {billingCycle === 'annual' && price > 0 && (
                <p className="annual-note">
                  ${(price / 12).toFixed(2)}/month billed annually
                </p>
              )}

              <ul className="features-list">
                {plan.features.map((feature, index) => (
                  <li key={`${planKey}-feature-${index}`}>
                    <span className="checkmark">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {planKey === 'FREE' ? (
                <button
                  className="btn btn-outline btn-block"
                  onClick={handleFreeTrial}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Start Free Trial'}
                </button>
              ) : (
                <CheckoutButton
                  priceId={priceId}
                  planName={planKey}
                  billingCycle={billingCycle.toUpperCase()}
                  tenantId={profile?.tenant_id}
                  profileId={profile?.id}
                  disabled={isCurrentPlan}
                  label={isCurrentPlan ? 'Current Plan' : `Get ${plan.name}`}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="plans-footer">
        <p>All plans include a 14-day money-back guarantee</p>
        <p>Need help choosing? <a href="mailto:sales@example.com">Contact Sales</a></p>
      </div>
    </div>
  )
}
