import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
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
    console.error('Authentication loading timed out')
    return <Navigate to="/login" replace />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
