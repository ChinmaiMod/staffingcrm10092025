import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientDashboard from './ClientDashboard';
import { AuthProvider } from '../../../contexts/AuthProvider';
import { TenantProvider } from '../../../contexts/TenantProvider';
import { supabase } from '../../../api/supabaseClient';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../api/supabaseClient');

vi.mock('../../../contexts/TenantProvider', () => ({
  useTenant: () => ({
    tenant: {
      tenant_id: 'tenant-1',
    },
  }),
  TenantProvider: ({ children }) => children,
}));

vi.mock('../../../contexts/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
    },
    profile: {
      id: 'test-user-123',
    },
  }),
  AuthProvider: ({ children }) => children,
}));

const createSelectResponse = (rows) => ({
  select: () => {
    const result = { data: rows, error: null };
    return {
      ...result,
      eq: () => result,
      gte: () => result,
      lte: () => result,
    };
  }
});

beforeAll(() => {
  // Mock supabase.auth.getSession for AuthProvider
  if (!supabase.auth) supabase.auth = {};
  supabase.auth.getSession = vi.fn().mockResolvedValue({ 
    data: { session: { user: { id: 'test-user' } } } 
  });
  
  // Mock supabase.auth.onAuthStateChange for AuthProvider
  supabase.auth.onAuthStateChange = vi.fn().mockImplementation((cb) => {
    cb('SIGNED_IN', { user: { id: 'test-user' } });
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });

  // Mock supabase.from for businesses, clients, job_orders, and contacts
  supabase.from = vi.fn((table) => {
    if (table === 'businesses') {
      return createSelectResponse([
        { business_id: 'biz-1', business_name: 'Tech Corp', tenant_id: 'tenant-1' },
        { business_id: 'biz-2', business_name: 'Health Systems', tenant_id: 'tenant-1' },
      ]);
    }
    
    if (table === 'clients') {
      return {
        select: () => ({
          eq: () => ({
            gte: () => ({
              lte: () => ({
                data: [
                  { 
                    client_id: 'client-1', 
                    client_name: 'Acme Corp',
                    business_id: 'biz-1',
                    created_at: '2025-01-15T10:00:00Z',
                    status: 'ACTIVE'
                  },
                  { 
                    client_id: 'client-2', 
                    client_name: 'Beta Inc',
                    business_id: 'biz-1',
                    created_at: '2025-01-16T11:00:00Z',
                    status: 'ACTIVE'
                  },
                  { 
                    client_id: 'client-3', 
                    client_name: 'Gamma LLC',
                    business_id: 'biz-2',
                    created_at: '2025-01-10T09:00:00Z',
                    status: 'PROSPECT'
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    
    if (table === 'job_orders') {
      return {
        select: () => ({
          eq: () => ({
            gte: () => ({
              lte: () => ({
                data: [
                  { 
                    job_order_id: 'job-1',
                    job_title: 'Senior Developer',
                    client_id: 'client-1',
                    business_id: 'biz-1',
                    status: 'OPEN',
                    created_at: '2025-01-15T12:00:00Z',
                    openings_count: 3,
                    filled_count: 1,
                    actual_revenue: 30000
                  },
                  { 
                    job_order_id: 'job-2',
                    job_title: 'QA Engineer',
                    client_id: 'client-2',
                    business_id: 'biz-1',
                    status: 'OPEN',
                    created_at: '2025-01-16T14:00:00Z',
                    openings_count: 2,
                    filled_count: 0,
                    actual_revenue: 20000
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    
    if (table === 'contacts') {
      return {
        select: () => ({
          eq: () => ({
            not: () => ({
              is: () => ({
                gte: () => ({
                  lte: () => ({
                    data: [
                      { 
                        id: 1,
                        first_name: 'John',
                        last_name: 'Candidate',
                        contact_type: 'job_order_applicant',
                        job_order_id: 'job-1',
                        recruiter_id: 'recruiter-1',
                        created_at: '2025-01-15T15:00:00Z'
                      },
                      { 
                        id: 2,
                        first_name: 'Jane',
                        last_name: 'Applicant',
                        contact_type: 'job_order_applicant',
                        job_order_id: 'job-1',
                        recruiter_id: 'recruiter-1',
                        created_at: '2025-01-16T16:00:00Z'
                      },
                      { 
                        id: 3,
                        first_name: 'Bob',
                        last_name: 'Smith',
                        contact_type: 'job_order_applicant',
                        job_order_id: 'job-2',
                        recruiter_id: 'recruiter-2',
                        created_at: '2025-01-17T10:00:00Z'
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    
    if (table === 'internal_staff') {
      return createSelectResponse([
        { 
          staff_id: 'recruiter-1',
          first_name: 'Alice',
          last_name: 'Recruiter',
          email: 'alice@company.com',
          job_title: 'Senior Recruiter',
          team_members: [
            {
              team_id: 'team-1',
              role: 'LEAD',
              teams: {
                team_name: 'IT Recruiting Team',
                business_id: 'biz-1'
              }
            }
          ]
        },
        { 
          staff_id: 'recruiter-2',
          first_name: 'Bob',
          last_name: 'Smith',
          email: 'bob@company.com',
          job_title: 'Recruiter',
          team_members: [
            {
              team_id: 'team-1',
              role: 'RECRUITER',
              teams: {
                team_name: 'IT Recruiting Team',
                business_id: 'biz-1'
              }
            }
          ]
        },
      ]);
    }
    
    if (table === 'teams') {
      return createSelectResponse([
        { 
          team_id: 'team-1',
          team_name: 'IT Recruiting Team',
          business_id: 'biz-1',
          tenant_id: 'tenant-1',
          is_active: true
        },
        { 
          team_id: 'team-2',
          team_name: 'Healthcare Recruiting Team',
          business_id: 'biz-2',
          tenant_id: 'tenant-1',
          is_active: true
        },
      ]);
    }
    
    if (table === 'team_members') {
      return createSelectResponse([
        {
          member_id: 'member-1',
          team_id: 'team-1',
          staff_id: 'recruiter-1',
          role: 'LEAD',
          is_active: true
        },
        {
          member_id: 'member-2',
          team_id: 'team-1',
          staff_id: 'recruiter-2',
          role: 'RECRUITER',
          is_active: true
        },
      ]);
    }
    
    return createSelectResponse([]);
  });
});

const renderWithProviders = (component) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <TenantProvider>
          {component}
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('ClientDashboard', () => {
  test('renders dashboard with title', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Client Dashboard/i)).toBeInTheDocument();
    });
  });

  test('displays stats cards for clients this week', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/New Clients This Week/i)).toBeInTheDocument();
      expect(screen.getByText(/2/)).toBeInTheDocument(); // 2 clients this week
    });
  });

  test('displays stats cards for clients this month', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/New Clients This Month/i)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument(); // 3 clients this month
    });
  });

  test('displays stats cards for job orders', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/New Job Orders/i)).toBeInTheDocument();
      expect(screen.getByText(/2/)).toBeInTheDocument(); // 2 job orders
    });
  });

  test('displays stats for candidates applied', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Candidates Applied/i)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument(); // 3 applicants
    });
  });

  test('shows business filter dropdown', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Business/i)).toBeInTheDocument();
    });
  });

  test('filters data by selected business', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      const businessSelect = screen.getByLabelText(/Business/i);
      fireEvent.change(businessSelect, { target: { value: 'biz-1' } });
    });

    await waitFor(() => {
      // After filtering by biz-1, should show 2 clients (not 3)
      expect(screen.getByText(/New Clients This Week/i)).toBeInTheDocument();
    });
  });

  test('shows date range picker for custom dates', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    });
  });

  test('filters data by custom date range', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      const startDate = screen.getByLabelText(/Start Date/i);
      const endDate = screen.getByLabelText(/End Date/i);
      
      fireEvent.change(startDate, { target: { value: '2025-01-15' } });
      fireEvent.change(endDate, { target: { value: '2025-01-16' } });
    });

    await waitFor(() => {
      // Should update stats based on date range
      expect(screen.getByText(/New Clients This Week/i)).toBeInTheDocument();
    });
  });

  test('displays job order status breakdown', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Open Positions/i)).toBeInTheDocument();
      expect(screen.getByText(/5/)).toBeInTheDocument(); // 3 + 2 openings
    });
  });

  test('displays filled positions count', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Filled Positions/i)).toBeInTheDocument();
      expect(screen.getByText(/1/)).toBeInTheDocument(); // 1 filled
    });
  });

  test('displays revenue generated this month', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Revenue This Month/i)).toBeInTheDocument();
      expect(screen.getByText(/\$50,000/i)).toBeInTheDocument(); // Total revenue this month
    });
  });

  test('displays revenue for custom date range', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      const startDate = screen.getByLabelText(/Start Date/i);
      const endDate = screen.getByLabelText(/End Date/i);
      
      fireEvent.change(startDate, { target: { value: '2025-01-01' } });
      fireEvent.change(endDate, { target: { value: '2025-01-31' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Revenue This Month/i)).toBeInTheDocument();
    });
  });

  test('displays recruiter performance section', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Top Recruiters/i)).toBeInTheDocument();
    });
  });

  test('shows candidates submitted by recruiter', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Top Recruiters/i)).toBeInTheDocument();
      // Should show recruiter names and their submission counts
      expect(screen.getByText(/Submissions/i)).toBeInTheDocument();
    });
  });

  test('displays team performance section', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Team Performance/i)).toBeInTheDocument();
    });
  });

  test('shows team names in performance metrics', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/IT Recruiting Team/i)).toBeInTheDocument();
    });
  });

  test('displays team-based submissions count', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Team Performance/i)).toBeInTheDocument();
      // Should show team submissions
      expect(screen.getByText(/2/)).toBeInTheDocument(); // 2 submissions from IT team
    });
  });

  test('allows filtering by team', async () => {
    renderWithProviders(<ClientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Team/i)).toBeInTheDocument();
    });

    const teamFilter = screen.getByLabelText(/Team/i);
    fireEvent.change(teamFilter, { target: { value: 'team-1' } });

    await waitFor(() => {
      expect(teamFilter.value).toBe('team-1');
    });
  });
});
