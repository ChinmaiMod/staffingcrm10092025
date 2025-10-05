import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { verifyToken, resendVerification, acceptInvite as acceptInviteEdge } from '../../api/edgeFunctions'
import { useAuth } from '../../contexts/AuthProvider'
import './Auth.css'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const inviteToken = searchParams.get('invite')
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (token) {
      handleVerify()
    }
  }, [token])

  const handleVerify = async () => {
    setLoading(true)
    setError('')
    
    try {
      await verifyToken(token)
      setSuccess('Email verified successfully! You can now sign in.')

      // If an invite token was present and user is authenticated, accept invite
      if (inviteToken && user?.id) {
        try {
          await acceptInviteEdge(inviteToken, user.id)
        } catch (inviteErr) {
          console.error('Accept invite error:', inviteErr)
          // non-fatal: user can link later
        }
      }
      
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      console.error('Verification error:', err)
      setError(err.message || 'Verification failed. The link may be expired.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setResending(true)

    try {
      await resendVerification(email)
      setSuccess('Verification email sent! Please check your inbox.')
      setEmail('')
    } catch (err) {
      console.error('Resend error:', err)
      setError(err.message || 'Failed to resend verification email')
    } finally {
      setResending(false)
    }
  }

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading-spinner"></div>
          <p>Verifying your email...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Email Verification</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!token && !success && (
          <>
            <p className="auth-subtitle">
              Didn't receive a verification email? Enter your email below to resend it.
            </p>

            <form onSubmit={handleResend} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={resending}
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </form>
          </>
        )}

        <p className="auth-footer">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
