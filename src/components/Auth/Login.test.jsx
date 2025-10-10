import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils.jsx'
import Login from './Login.jsx'

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  }
})

describe('Login Component', () => {
  let mockSignIn

  beforeEach(() => {
    mockSignIn = vi.fn()
  })

  it('should render login form', () => {
    render(<Login />, {
      authValue: { signIn: mockSignIn, loading: false },
    })

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should display validation errors for empty fields', async () => {
    const user = userEvent.setup()
    
    render(<Login />, {
      authValue: { signIn: mockSignIn, loading: false },
    })

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  // Note: Email format validation is tested in validators.test.js
  // The browser's native email validation prevents form submission for invalid emails
  it.skip('should display validation error for invalid email', async () => {
    const user = userEvent.setup()
    
    render(<Login />, {
      authValue: { signIn: mockSignIn, loading: false },
    })

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'notanemail')
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('should call signIn with correct credentials', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ error: null })
    
    render(<Login />, {
      authValue: { signIn: mockSignIn, loading: false },
    })

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'Password123!')
    })
  })

  it('should display error message on login failure', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    
    render(<Login />, {
      authValue: { signIn: mockSignIn, loading: false },
    })

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword123!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup()
    
    // Mock signIn to delay so we can check loading state
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<Login />, {
      authValue: { signIn: mockSignIn, loading: false },
    })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)
    
    // Check that button is disabled and shows loading text
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /signing in/i })
      expect(button).toBeDisabled()
    })
  })

  it('should have links to register and forgot password', () => {
    render(<Login />, {
      authValue: { signIn: mockSignIn, loading: false },
    })

    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
    expect(screen.getByText(/forgot.*password/i)).toBeInTheDocument()
  })

  it('should prevent multiple submissions', async () => {
    const user = userEvent.setup()
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    render(<Login />, {
      authValue: { signIn: mockSignIn, loading: false },
    })

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)
    await user.click(submitButton)

    // Should only be called once due to isSubmitting flag
    expect(mockSignIn).toHaveBeenCalledTimes(1)
  })
})
