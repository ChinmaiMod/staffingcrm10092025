import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantProvider'
import './Billing.css'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshTenantData } = useTenant()
  const [countdown, setCountdown] = useState(5)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Refresh tenant data to get new subscription
    refreshTenantData()

    // Countdown and redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [refreshTenantData, navigate])

  return (
    <div className="payment-success-container">
      <div className="payment-success-card">
        <div className="success-icon">✓</div>
        <h1>Payment Successful!</h1>
        <p>Thank you for subscribing. Your account has been upgraded.</p>
        
        {sessionId && (
          <p className="session-info">
            <small>Session ID: {sessionId}</small>
          </p>
        )}

        <p className="redirect-message">
          Redirecting to your dashboard in {countdown} seconds...
        </p>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard Now
        </button>
      </div>
    </div>
  )
}
