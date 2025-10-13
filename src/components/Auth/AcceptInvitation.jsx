import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../api/supabaseClient'
import { validateEmail, validatePassword, validatePasswordConfirmation } from '../../utils/validators'
import '../Auth/Auth.css'

export default function AcceptInvitation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link')
        setLoading(false)
        return
      }

      try {
        const { data, error: inviteError } = await supabase
          .from('user_invitations')
          .select(`
            *,
            tenants(company_name, email_domain)
          `)
          .eq('token', token)
          .single()

        if (inviteError || !data) {
          setError('Invitation not found or invalid')
          setLoading(false)
          return
        }

        // Check if invitation is still valid
        if (data.status === 'ACCEPTED') {
          setError('This invitation has already been accepted')
          setLoading(false)
          return
        }

        if (data.status === 'REVOKED') {
          setError('This invitation has been revoked')
          setLoading(false)
          return
        }

        if (data.status === 'EXPIRED' || new Date(data.expires_at) < new Date()) {
          setError('This invitation has expired')
          setLoading(false)
          return
        }

        setInvitation(data)
      } catch (err) {
        console.error('Error loading invitation:', err)
        setError('Failed to load invitation details')
      } finally {
        setLoading(false)
      }
    }

    loadInvitation()
  }, [token])

  const validateForm = () => {
    const errors = {}

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.error
    }

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

    if (!validateForm()) {
      setError('Please fix the errors below')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Sign up the user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          data: {
            full_name: invitation.invited_user_name
          }
        }
      })

      if (signUpError) throw signUpError

      if (!authData.user) {
        throw new Error('Failed to create account')
      }

      // Create profile for the user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: invitation.email.toLowerCase(),
          full_name: invitation.invited_user_name,
          tenant_id: invitation.tenant_id,
          role: 'USER', // Default role, can be changed by admin
          status: 'PENDING' // Will be ACTIVE after email verification
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw new Error('Failed to create user profile')
      }

      // Mark invitation as accepted
      await supabase
        .from('user_invitations')
        .update({
          status: 'ACCEPTED',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: authData.user.id,
          tenant_id: invitation.tenant_id,
          action: 'INVITATION_ACCEPTED',
          resource_type: 'invitation',
          resource_id: invitation.id,
          details: {
            email: invitation.email
          }
        })

      setSuccess(
        'Account created successfully! Please check your email to verify your account, then you can log in.'
      )

      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: ''
      })
    }
  }

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading-spinner">Loading invitation...</div>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Invalid Invitation</h1>
          <div className="alert alert-error">{error}</div>
          <button
            className="btn btn-secondary btn-block"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Accept Invitation</h1>
        <p className="auth-subtitle">
          You've been invited to join <strong>{invitation?.tenants?.company_name}</strong>
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!success && (
          <>
            <div style={{ 
              background: '#f8fafc', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Name:</strong> {invitation?.invited_user_name}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Email:</strong> {invitation?.email}
              </div>
              <div>
                <strong>Organization:</strong> {invitation?.tenants?.company_name}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="password">Create Password *</label>
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
                disabled={submitting}
              >
                {submitting ? 'Creating Account...' : 'Accept Invitation & Create Account'}
              </button>
            </form>
          </>
        )}

        <p className="auth-footer">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  )
}
