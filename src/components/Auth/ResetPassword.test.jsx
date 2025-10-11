import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils.jsx'
import ResetPassword from './ResetPassword.jsx'
import { mockAuthContext } from '../../test/mocks.js'

const setSessionMock = vi.fn(() => Promise.resolve({ data: null, error: null }))
const exchangeCodeForSessionMock = vi.fn(() => Promise.resolve({ data: null, error: null }))

vi.mock('../../api/supabaseClient', () => ({
  supabase: {
    auth: {
      setSession: (...args) => setSessionMock(...args),
      exchangeCodeForSession: (...args) => exchangeCodeForSessionMock(...args),
    },
  },
}))

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (route = '/reset-password', overrides = {}) => {
    const authValue = {
      ...mockAuthContext,
      updatePassword: vi.fn(() => Promise.resolve({ data: null, error: null })),
      ...overrides,
    }

    return render(<ResetPassword />, {
      authValue,
      route,
    })
  }

  it('shows error and recovery actions when no token is present', async () => {
    renderComponent('/reset-password')

    await waitFor(() => {
      expect(screen.getByText(/invalid or missing reset token/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /request new reset link/i })).toBeInTheDocument()
    expect(setSessionMock).not.toHaveBeenCalled()
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled()
  })

  it('exchanges code parameter for a session and renders the form', async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({ data: { session: {} }, error: null })

    renderComponent('/reset-password?code=test-hash&type=recovery')

    await waitFor(() => {
      expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('test-hash')
    })

    await waitFor(() => {
      expect(screen.getByLabelText('New Password *')).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
    })
  })
})
