import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthProvider'
import { supabase } from '../../api/supabaseClient'
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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.company) {
      setError('Please fill in all required fields')
      return false
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) return

    setLoading(true)

    try {
      // Sign up user with Supabase Auth
      const { data, error: signUpError } = await signUp(
        formData.email,
        formData.password
      )

      if (signUpError) throw signUpError

      if (!data.user) {
        throw new Error('No user returned from signup')
      }

      // Create tenant and profile using Edge Function
      try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'createTenantAndProfile',
          {
            body: {
              userId: data.user.id,
              email: formData.email,
              username: formData.username || formData.email.split('@')[0],
              companyName: formData.company,
            },
          }
        )

        if (functionError) {
          console.error('Function error:', functionError)
          throw new Error(functionError.message || 'Failed to create company profile')
        }

        if (functionData?.error) {
          console.error('Function returned error:', functionData.error)
          throw new Error(functionData.error)
        }

        setSuccess(
          'Registration successful! Please check your email to verify your account, then you can login.'
        )

        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } catch (dbError) {
        console.error('Database error:', dbError)
        // If database operations fail, we should clean up the auth user
        // but for now, we'll just show the error
        throw dbError
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Create Your Account</h1>
        <p className="auth-subtitle">Start your free trial today</p>

        {error && <div className="alert alert-error">{error}</div>}
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
              required
              placeholder="Your Company Inc."
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@company.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username (optional)</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Minimum 8 characters"
            />
            <small>
              Must be at least 8 characters long
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Re-enter your password"
            />
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
