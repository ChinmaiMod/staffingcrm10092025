import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import TenantDashboard from './TenantDashboard'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock auth context
const mockAuthContext = {
  profile: {
    email: 'test@example.com',
    role: 'USER',
    status: 'ACTIVE',
  },
  signOut: vi.fn(),
}

// Mock tenant context
const mockTenantContext = {
  tenant: {
    company_name: 'Test Company',
  },
  subscription: {
    plan_name: 'FREE',
    billing_cycle: 'monthly',
    status: 'active',
    end_date: '2024-12-31',
  },
  getPlanName: vi.fn(() => 'FREE'),
}

vi.mock('../../contexts/AuthProvider', () => ({
  useAuth: () => mockAuthContext,
}))

vi.mock('../../contexts/TenantProvider', () => ({
  useTenant: () => mockTenantContext,
}))

describe('TenantDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dashboard with all sections', () => {
    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    expect(screen.getByText('Staffing CRM')).toBeInTheDocument()
    expect(screen.getByText('Welcome to Your Account')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Test Company')).toBeInTheDocument()
    expect(screen.getByText('Available Modules')).toBeInTheDocument()
  })

  it('should render CRM module button', () => {
    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    expect(screen.getByText('CRM')).toBeInTheDocument()
    expect(screen.getByText('Customer Relationship Management')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Access CRM/i })).toBeInTheDocument()
  })

  it('should navigate to CRM when Access CRM button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    const crmButton = screen.getByRole('button', { name: /Access CRM/i })
    await user.click(crmButton)

    expect(mockNavigate).toHaveBeenCalledWith('/crm')
  })

  it('should render HRMS button and link to external URL', async () => {
    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    const hrmsButton = screen.getByRole('button', { name: /Access HRMS/i })
    expect(hrmsButton).toBeInTheDocument()
    expect(screen.getByText('Human Resource Management System')).toBeInTheDocument()
  })

  it('should open HRMS URL in new tab when clicked', async () => {
    const user = userEvent.setup()
    // Mock window.open
    const mockOpen = vi.fn()
    global.window.open = mockOpen

    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    const hrmsButton = screen.getByRole('button', { name: /Access HRMS/i })
    await user.click(hrmsButton)

    expect(mockOpen).toHaveBeenCalledWith(
      'https://staffinghrms.vercel.app',
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('should render Accounting button and link to external URL', async () => {
    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    const accountingButton = screen.getByRole('button', { name: /Access Accounting/i })
    expect(accountingButton).toBeInTheDocument()
    expect(screen.getByText('Accounting & Financial Management')).toBeInTheDocument()
  })

  it('should open Accounting URL in new tab when clicked', async () => {
    const user = userEvent.setup()
    // Mock window.open
    const mockOpen = vi.fn()
    global.window.open = mockOpen

    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    const accountingButton = screen.getByRole('button', { name: /Access Accounting/i })
    await user.click(accountingButton)

    expect(mockOpen).toHaveBeenCalledWith(
      'https://staffingaccounts.vercel.app',
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('should call signOut when Sign Out button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    const signOutButton = screen.getByRole('button', { name: /Sign Out/i })
    await user.click(signOutButton)

    await waitFor(() => {
      expect(mockAuthContext.signOut).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('should show Tenant Admin button for ADMIN role', () => {
    mockAuthContext.profile.role = 'ADMIN'
    
    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    expect(screen.getByRole('button', { name: /Tenant Owner & Admin Tools/i })).toBeInTheDocument()
  })

  it('should not show Tenant Admin button for USER role', () => {
    mockAuthContext.profile.role = 'USER'
    
    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    expect(screen.queryByRole('button', { name: /Tenant Owner & Admin Tools/i })).not.toBeInTheDocument()
  })

  it('should display subscription information', () => {
    render(
      <BrowserRouter>
        <TenantDashboard />
      </BrowserRouter>
    )

    expect(screen.getByText('Subscription Details')).toBeInTheDocument()
    expect(screen.getAllByText('FREE').length).toBeGreaterThan(0)
    expect(screen.getByText('monthly')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })
})
