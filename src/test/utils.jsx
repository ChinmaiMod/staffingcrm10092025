import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthProvider.jsx'
import { TenantContext } from '../contexts/TenantProvider.jsx'
import { mockAuthContext, mockTenantContext } from './mocks.js'

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui,
  {
    authValue = mockAuthContext,
    tenantValue = mockTenantContext,
    route = '/',
    ...renderOptions
  } = {}
) {
  window.history.pushState({}, 'Test page', route)

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <AuthContext.Provider value={authValue}>
          <TenantContext.Provider value={tenantValue}>
            {children}
          </TenantContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Wait for async updates to complete
 */
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0))

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { renderWithProviders as render }
