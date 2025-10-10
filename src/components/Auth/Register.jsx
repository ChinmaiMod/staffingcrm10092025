import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthProvider'
import { supabase } from '../../api/supabaseClient'
import { 
  validateEmail, 
  validatePassword, 
  validatePasswordConfirmation,
  validateUsername,
  validateCompanyName,
  handleError
} from '../../utils/validators'
import './Auth.css'

export default function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    company: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const validateForm = () => {
    const errors = {}
    
    // Validate company name
    const companyValidation = validateCompanyName(formData.company)
    if (!companyValidation.valid) {
      errors.company = companyValidation.error
    }

    // Validate email
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.valid) {
      errors.email = emailValidation.error
    }
    
    // Validate username (optional but validate if provided)
    const usernameValidation = validateUsername(formData.username, false)
    if (!usernameValidation.valid) {
      errors.username = usernameValidation.error
    }

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
      setError('Please fix the errors below before continuing')
      setIsSubmitting(false)
      return
    }

    setLoading(true)

    try {
      // Sign up user with Supabase Auth
      const { data, error: signUpError } = await signUp(
        formData.email.trim(),
        formData.password
      )

      if (signUpError) throw signUpError

      if (!data.user) {
        throw new Error('Registration failed. Please try again.')
      }

      // Create tenant and profile using Edge Function
      try {
        console.log('Calling createTenantAndProfile with:', {
          userId: data.user.id,
          email: formData.email.trim(),
          username: formData.username.trim() || formData.email.split('@')[0],
          companyName: formData.company.trim(),
        })

        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'createTenantAndProfile',
          {
            body: {
              userId: data.user.id,
              email: formData.email.trim(),
              username: formData.username.trim() || formData.email.split('@')[0],
              companyName: formData.company.trim(),
            },
          }
        )

        console.log('Function response:', { functionData, functionError })

        // Handle Edge Function errors
        // When Edge Function returns non-2xx status, the error details are in functionData.error
        if (functionError || functionData?.error) {
          console.error('Function error details:', { functionError, functionData })
          
          // Extract the error message from the response body
          let errorMessage = functionData?.error || functionError?.message || 'Registration failed. Please try again.'
          
          console.log('Extracted error message:', errorMessage)
          
          // Check if it's a duplicate user/email error
          if (errorMessage.includes('already exists') || 
              errorMessage.includes('already registered') ||
              errorMessage.includes('already in use')) {
            setError(errorMessage)
            setLoading(false)
            return
          }
          
          // For other errors, throw to be caught by outer catch
          throw new Error(errorMessage)
        }

        if (!functionData?.success) {
          console.error('Function response invalid:', functionData)
          throw new Error('Invalid response from registration service. Please try again.')
        }

        setSuccess(
          'Registration successful! Please check your email to verify your account, then you can login.'
        )

        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } catch (dbError) {
        console.error('Database error:', dbError)
        throw dbError
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError(handleError(err, 'registration'))
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
        <h1>Create Your Account</h1>
        <p className="auth-subtitle">Start your free trial today</p>

        {error && (
          <div className="alert alert-error">
            {error}
            {error.includes('already exists') || error.includes('already registered') ? (
              <div style={{ marginTop: '10px' }}>
                <Link to="/login" style={{ color: '#fff', textDecoration: 'underline' }}>
                  Go to Login Page
                </Link>
              </div>
            ) : null}
          </div>
        )}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="company">Company Name *</label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className={fieldErrors.company ? 'error' : ''}
              placeholder="Your Company Inc."
              autoComplete="organization"
            />
            {fieldErrors.company && (
              <small className="error-text">{fieldErrors.company}</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={fieldErrors.email ? 'error' : ''}
              placeholder="you@company.com"
              autoComplete="email"
            />
            {fieldErrors.email && (
              <small className="error-text">{fieldErrors.email}</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="username">Username (optional)</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={fieldErrors.username ? 'error' : ''}
              placeholder="johndoe"
              autoComplete="username"
            />
            {fieldErrors.username && (
              <small className="error-text">{fieldErrors.username}</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
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
            <label htmlFor="confirmPassword">Confirm Password *</label>
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
