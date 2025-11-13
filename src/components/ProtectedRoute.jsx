import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthProvider'
import { logger } from '../utils/logger'

export default function ProtectedRoute({ children, requireRole }) {
  const { user, profile, loading } = useAuth()
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  // Bug #12 fix: Add timeout to prevent infinite loading spinner
  useEffect(() => {
    if (loading) {
      // Set a timeout to detect if loading takes too long (10 seconds)
      const timer = setTimeout(() => {
        setLoadingTimeout(true)
      }, 10000)

      return () => clearTimeout(timer)
    } else {
      setLoadingTimeout(false)
    }
  }, [loading])

  if (loading && !loadingTimeout) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  // If loading timed out, show error and redirect to login
  if (loadingTimeout) {
    logger.error('Authentication loading timed out')
    return <Navigate to="/login" replace />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check role-based authorization if requireRole is specified
  if (requireRole && profile) {
    const userRole = profile.role

    // Super admin can access everything
    if (userRole === 'SUPER_ADMIN') {
      return children
    }

    // Check if user has the required role
    if (userRole !== requireRole) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h2>Access Denied</h2>
          <p>You don&apos;t have permission to access this page.</p>
          <p>Required role: <strong>{requireRole}</strong></p>
          <p>Your role: <strong>{userRole || 'None'}</strong></p>
        </div>
      )
    }
  }

  return children
}
