import { vi, beforeEach, describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JobOrdersManager from './JobOrdersManager'
import { AuthProvider } from '../../../contexts/AuthProvider'
import { TenantProvider } from '../../../contexts/TenantProvider'
import { MemoryRouter } from 'react-router-dom'

const mockJobOrders = [
  {
    job_order_id: 'job-1',
    client_id: 'client-1',
    business_id: 'business-1',
    job_title: 'Senior Software Engineer',
    location: 'New York, NY',
    industry: 'Technology',
    status: 'OPEN',
    priority: 'HIGH',
    openings_count: 3,
    filled_count: 1,
    created_at: '2025-01-01T00:00:00Z',
    clients: { client_id: 'client-1', client_name: 'Acme Corp' },
    businesses: { business_id: 'business-1', business_name: 'Tech Division' },
  },
  {
    job_order_id: 'job-2',
    client_id: 'client-2',
    business_id: 'business-2',
    job_title: 'Product Manager',
    location: 'San Francisco, CA',
    industry: 'Software',
    status: 'FILLED',
    priority: 'MEDIUM',
    openings_count: 1,
    filled_count: 1,
    created_at: '2025-01-05T00:00:00Z',
    clients: { client_id: 'client-2', client_name: 'Tech Solutions' },
    businesses: { business_id: 'business-2', business_name: 'Product Team' },
  },
]

const mockClients = [
  { client_id: 'client-1', client_name: 'Acme Corp' },
  { client_id: 'client-2', client_name: 'Tech Solutions' },
]

const mockBusinesses = [
  { business_id: 'business-1', business_name: 'Tech Division' },
  { business_id: 'business-2', business_name: 'Product Team' },
]

vi.mock('../../../api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('../../../contexts/TenantProvider', () => ({
  useTenant: () => ({
    tenant: {
      tenant_id: 'test-tenant-123',
    },
  }),
  TenantProvider: ({ children }) => children,
}))

vi.mock('../../../contexts/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
    },
  }),
  AuthProvider: ({ children }) => children,
}))

const renderWithProviders = (component) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <TenantProvider>{component}</TenantProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('JobOrdersManager', () => {
  let mockSupabase

  beforeEach(async () => {
    vi.clearAllMocks()

    const { supabase } = await import('../../../api/supabaseClient')
    mockSupabase = supabase

    // Setup default mock responses
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'job_orders') {
        return {
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            eq: vi.fn(() => ({
              ...mockSupabase,
              order: vi.fn(() =>
                Promise.resolve({ data: mockJobOrders, error: null })
              ),
            })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            eq: vi.fn(() => ({
              ...mockSupabase,
              order: vi.fn(() =>
                Promise.resolve({ data: mockClients, error: null })
              ),
            })),
          })),
        }
      }
      if (table === 'businesses') {
        return {
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            eq: vi.fn(() => ({
              ...mockSupabase,
              order: vi.fn(() =>
                Promise.resolve({ data: mockBusinesses, error: null })
              ),
            })),
          })),
        }
      }
      return mockSupabase
    })
  })

  it('renders the job orders manager with header', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('Job Orders Management')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /new job order/i })).toBeInTheDocument()
  })

  it('loads and displays job orders on mount', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
    })

    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tech Solutions').length).toBeGreaterThan(0)
  })

  it('displays all filter controls', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/filter by client/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by business/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by priority/i)).toBeInTheDocument()
  })

  it('filters job orders by search term', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    })

    const searchInput = screen.getByLabelText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'product' } })

    await waitFor(() => {
      expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
    })
  })

  it('filters job orders by client', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    })

    const clientFilter = screen.getByLabelText(/filter by client/i)
    fireEvent.change(clientFilter, { target: { value: 'client-1' } })

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
      expect(screen.queryByText('Product Manager')).not.toBeInTheDocument()
    })
  })

  it('filters job orders by status', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    })

    const statusFilter = screen.getByLabelText(/filter by status/i)
    fireEvent.change(statusFilter, { target: { value: 'FILLED' } })

    await waitFor(() => {
      expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
    })
  })

  it('filters job orders by priority', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    })

    const priorityFilter = screen.getByLabelText(/filter by priority/i)
    fireEvent.change(priorityFilter, { target: { value: 'HIGH' } })

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
      expect(screen.queryByText('Product Manager')).not.toBeInTheDocument()
    })
  })

  it('combines multiple filters correctly', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    })

    const searchInput = screen.getByLabelText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'software' } })

    const statusFilter = screen.getByLabelText(/filter by status/i)
    fireEvent.change(statusFilter, { target: { value: 'OPEN' } })

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
      expect(screen.queryByText('Product Manager')).not.toBeInTheDocument()
    })
  })

  it('opens modal when clicking new job order button', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new job order/i })).toBeInTheDocument()
    })

    const newButton = screen.getByRole('button', { name: /new job order/i })
    fireEvent.click(newButton)

    await waitFor(() => {
      expect(screen.getByText('Add New Job Order')).toBeInTheDocument()
    })
  })

  it('opens modal in edit mode when clicking edit button', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Job Order')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Senior Software Engineer')).toBeInTheDocument()
    })
  })

  it('closes modal when clicking cancel', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new job order/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /new job order/i }))

    await waitFor(() => {
      expect(screen.getByText('Add New Job Order')).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText('Add New Job Order')).not.toBeInTheDocument()
    })
  })

  it('displays no data message when no job orders exist', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'job_orders') {
        return {
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            eq: vi.fn(() => ({
              ...mockSupabase,
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        }
      }
      return mockSupabase
    })

    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(
        screen.getByText(/no job orders found/i)
      ).toBeInTheDocument()
    })
  })

  it('displays filtered message when filters return no results', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    })

    const searchInput = screen.getByLabelText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    await waitFor(() => {
      expect(screen.getByText(/no job orders match your filters/i)).toBeInTheDocument()
    })
  })

  it('displays openings count correctly', async () => {
    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('1 / 3')).toBeInTheDocument() // 1 filled out of 3 openings
      expect(screen.getByText('1 / 1')).toBeInTheDocument() // 1 filled out of 1 opening
    })
  })

  it('handles delete with confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'job_orders') {
        return {
          ...mockSupabase,
          select: vi.fn(() => ({
            ...mockSupabase,
            eq: vi.fn(() => ({
              ...mockSupabase,
              order: vi.fn(() =>
                Promise.resolve({ data: mockJobOrders, error: null })
              ),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        }
      }
      return mockSupabase
    })

    renderWithProviders(<JobOrdersManager />)

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to delete this job order?'
    )

    confirmSpy.mockRestore()
  })
})
