import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils.jsx'
import Register from './Register.jsx'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  }
})

describe('Register Component', () => {
  const mockSignUp = vi.fn()

  it('should render registration form', () => {
    render(<Register />, {
      authValue: { signUp: mockSignUp, loading: false },
    })

    expect(screen.getByRole('heading', { name: /create.*account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
  })

  it('should validate all required fields', async () => {
    const user = userEvent.setup()
    
    render(<Register />, {
      authValue: { signUp: mockSignUp, loading: false },
    })

    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      expect(screen.getByText(/company name is required/i)).toBeInTheDocument()
    })
  })

  it('should validate password strength', async () => {
    const user = userEvent.setup()
    
    render(<Register />, {
      authValue: { signUp: mockSignUp, loading: false },
    })

    const passwordInput = screen.getByLabelText(/^password/i)
    
    // Test weak password
    await user.type(passwordInput, 'weak')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('should validate password confirmation match', async () => {
    const user = userEvent.setup()
    
    render(<Register />, {
      authValue: { signUp: mockSignUp, loading: false },
    })

    await user.type(screen.getByLabelText(/^password/i), 'Password123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/passwords.*do not match/i)).toBeInTheDocument()
    })
  })

  it('should successfully register with valid data', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
    
    render(<Register />, {
      authValue: { signUp: mockSignUp, loading: false },
    })

    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
    await user.type(screen.getByLabelText(/^username/i), 'newuser')
    await user.type(screen.getByLabelText(/company name/i), 'Test Company')
    await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        'newuser@example.com',
        'SecurePass123!'
      )
    })
  })

  it('should display error message on registration failure', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ 
      data: null,
      error: { message: 'User already registered' } 
    })
    
    render(<Register />, {
      authValue: { signUp: mockSignUp, loading: false },
    })

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/^username/i), 'existinguser')
    await user.type(screen.getByLabelText(/company name/i), 'Test Company')
    await user.type(screen.getByLabelText(/^password/i), 'Password123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/user already registered/i)).toBeInTheDocument()
    })
  })

  it('should have link to login page', () => {
    render(<Register />, {
      authValue: { signUp: mockSignUp, loading: false },
    })

    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
  })

  // Note: Email format validation is tested in validators.test.js
  // The browser's native email validation prevents form submission for invalid emails
  it.skip('should validate email format', async () => {
    const user = userEvent.setup()
    
    render(<Register />, {
      authValue: { signUp: mockSignUp, loading: false },
    })

    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument()
    })
  })
})
