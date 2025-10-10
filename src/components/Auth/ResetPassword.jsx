import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthProvider'
import { validatePassword, validatePasswordConfirmation, handleError } from '../../utils/validators'
import './Auth.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { updatePassword } = useAuth()
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasValidToken, setHasValidToken] = useState(null)

  // Check for access_token or error in URL hash on mount
  useEffect(() => {
    const checkUrlHash = () => {
      const hash = location.hash.substring(1) // Remove the #
      const params = new URLSearchParams(hash)
      
      const accessToken = params.get('access_token')
      const errorParam = params.get('error')
      const errorCode = params.get('error_code')
      const errorDescription = params.get('error_description')
      
      if (errorParam) {
        // Handle error from Supabase
        let errorMessage = 'Unable to reset password. '
        
        if (errorCode === 'otp_expired') {
          errorMessage += 'The password reset link has expired. Please request a new one.'
        } else if (errorDescription) {
          errorMessage += decodeURIComponent(errorDescription.replace(/\+/g, ' '))
        } else {
          errorMessage += errorParam
        }
        
        setError(errorMessage)
        setHasValidToken(false)
      } else if (accessToken) {
        // Valid token found
        setHasValidToken(true)
      } else {
        // No token in URL
        setError('Invalid or missing reset token. Please request a new password reset link.')
        setHasValidToken(false)
      }
    }
    
    checkUrlHash()
  }, [location])

  const validateForm = () => {
    const errors = {}
    
    // Validate password
    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.error
    }

    // Validate password confirmation
    const confirmValidation = validatePasswordConfirmation(
      formData.password,
      formData.confirmPassword
    )
    if (!confirmValidation.valid) {
      errors.confirmPassword = confirmValidation.error
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isSubmitting) return
    
    setIsSubmitting(true)
    setError('')
    setSuccess('')
    setFieldErrors({})

    if (!validateForm()) {
      setError('Please fix the errors below')
      setIsSubmitting(false)
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await updatePassword(formData.password)

      if (updateError) throw updateError

      setSuccess('Password updated successfully! Redirecting to login...')
      
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      console.error('Password update error:', err)
      setError(handleError(err, 'password update'))
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: ''
      })
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Set New Password</h1>
        <p className="auth-subtitle">
          {hasValidToken === false 
            ? 'There was a problem with your reset link' 
            : 'Please enter your new password'}
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {hasValidToken === false && (
          <div className="auth-actions">
            <button
              onClick={() => navigate('/forgot-password')}
              className="btn btn-secondary btn-block"
            >
              Request New Reset Link
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-link btn-block"
            >
              Back to Login
            </button>
          </div>
        )}

        {hasValidToken !== false && (
          <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">New Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={fieldErrors.password ? 'error' : ''}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
            {fieldErrors.password ? (
              <small className="error-text">{fieldErrors.password}</small>
            ) : (
              <small>Must be at least 8 characters long</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={fieldErrors.confirmPassword ? 'error' : ''}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <small className="error-text">{fieldErrors.confirmPassword}</small>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
        )}
      </div>
    </div>
  )
}
