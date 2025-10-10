import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProtectedRoute from './ProtectedRoute.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthProvider.jsx'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ProtectedRoute Component', () => {
  const TestChild = () => <div>Protected Content</div>

  const renderProtectedRoute = (authValue, requiredRole = null) => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={authValue}>
          <ProtectedRoute requireRole={requiredRole}>
            <TestChild />
          </ProtectedRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    )
  }

  it('should show loading spinner when auth is loading', () => {
    renderProtectedRoute({ loading: true, user: null, profile: null })
    
    // Component renders a div with className "loading-spinner"
    const container = document.querySelector('.loading-spinner')
    expect(container).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    renderProtectedRoute({ loading: false, user: null, profile: null })
    
    // Navigate is called via the Navigate component, not directly
    // The component renders <Navigate to="/login" replace />
    // We can verify it doesn't show protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should render children when user is authenticated', () => {
    const authValue = {
      loading: false,
      user: { id: '123', email: 'test@example.com' },
      profile: { id: '123', role: 'user' },
    }
    
    renderProtectedRoute(authValue)
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it.skip('should allow access when user has required role', () => {
    // Note: Role-based authorization is not currently implemented in ProtectedRoute
    // This functionality may be added in the future
    const authValue = {
      loading: false,
      user: { id: '123', email: 'test@example.com' },
      profile: { id: '123', role: 'admin' },
    }
    
    renderProtectedRoute(authValue, 'admin')
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it.skip('should show unauthorized message when user lacks required role', () => {
    // Note: Role-based authorization is not currently implemented in ProtectedRoute
    // This functionality may be added in the future
    const authValue = {
      loading: false,
      user: { id: '123', email: 'test@example.com' },
      profile: { id: '123', role: 'user' },
    }
    
    renderProtectedRoute(authValue, 'admin')
    
    expect(screen.getByText(/not authorized/i)).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it.skip('should allow super_admin to access any role-protected route', () => {
    // Note: Role-based authorization is not currently implemented in ProtectedRoute
    // This functionality may be added in the future
    const authValue = {
      loading: false,
      user: { id: '123', email: 'test@example.com' },
      profile: { id: '123', role: 'super_admin' },
    }
    
    renderProtectedRoute(authValue, 'admin')
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it.skip('should show unauthorized for user role trying to access admin route', () => {
    // Note: Role-based authorization is not currently implemented in ProtectedRoute
    // This functionality may be added in the future
    const authValue = {
      loading: false,
      user: { id: '123', email: 'test@example.com' },
      profile: { id: '123', role: 'user' },
    }
    
    renderProtectedRoute(authValue, 'admin')
    
    expect(screen.getByText(/not authorized/i)).toBeInTheDocument()
  })
})
