import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientsManager from './ClientsManager';
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

const baseClientPermissions = {
  canViewSection: true,
  canAccessDashboard: true,
  canAccessInfo: true,
  canAccessJobOrders: true,
  canViewLinkedContacts: true,
  canCreateClients: true,
  canEditClients: true,
  canDeleteClients: true,
  canCreateJobOrders: true,
  canEditJobOrders: true,
  canDeleteJobOrders: true,
};

const mockUsePermissions = vi.fn(() => ({
  loading: false,
  clientPermissions: { ...baseClientPermissions },
}));

vi.mock('../../../contexts/PermissionsProvider', () => ({
  usePermissions: () => mockUsePermissions(),
  PermissionsProvider: ({ children }) => children,
}));

const createSelectResponse = (rows) => ({
  select: () => {
    const result = { data: rows, error: null };
    return {
      ...result,
      eq: () => result,
      order: () => result,
      abortSignal: () => result,
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

  // Mock supabase.from for clients and businesses
  supabase.from = vi.fn((table) => {
    if (table === 'clients') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              abortSignal: () => ({
                data: [
                  {
                    client_id: 'client-1',
                    client_name: 'Acme Corporation',
                    website: 'https://acme.com',
                    revenue: 5000000,
                    client_source: 'Referral',
                    primary_contact_email: 'contact@acme.com',
                    primary_contact_phone: '+1-555-0100',
                    industry: 'Technology',
                    status: 'ACTIVE',
                    created_at: '2025-01-15T10:00:00Z',
                    business_id: 'biz-1',
                  },
                  {
                    client_id: 'client-2',
                    client_name: 'Beta Solutions',
                    website: 'https://beta.com',
                    revenue: 2000000,
                    client_source: 'Cold Call',
                    primary_contact_email: 'info@beta.com',
                    primary_contact_phone: '+1-555-0200',
                    industry: 'Healthcare',
                    status: 'PROSPECT',
                    created_at: '2025-01-16T11:00:00Z',
                    business_id: 'biz-1',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: { client_id: 'new-client' }, error: null }),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      };
    }
    
    if (table === 'businesses') {
      return createSelectResponse([
        { business_id: 'biz-1', business_name: 'Tech Corp', tenant_id: 'tenant-1' },
        { business_id: 'biz-2', business_name: 'Health Systems', tenant_id: 'tenant-1' },
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

describe('ClientsManager', () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue({
      loading: false,
      clientPermissions: { ...baseClientPermissions },
    });
  });

  test('renders clients list with title', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/Clients/i)).toBeInTheDocument();
    });
  });

  test('displays list of clients', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/Acme Corporation/i)).toBeInTheDocument();
      expect(screen.getByText(/Beta Solutions/i)).toBeInTheDocument();
    });
  });

  test('shows Add Client button', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Client/i })).toBeInTheDocument();
    });
  });

  test('opens modal when Add Client is clicked', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /Add Client/i });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/New Client/i)).toBeInTheDocument();
    });
  });

  test('displays search box for filtering clients', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search clients/i)).toBeInTheDocument();
    });
  });

  test('filters clients by name when searching', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/Search clients/i);
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Acme Corporation/i)).toBeInTheDocument();
      expect(screen.queryByText(/Beta Solutions/i)).not.toBeInTheDocument();
    });
  });

  test('shows business filter dropdown', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Business/i)).toBeInTheDocument();
    });
  });

  test('shows status filter dropdown', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    });
  });

  test('filters clients by status', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      const statusSelect = screen.getByLabelText(/Status/i);
      fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Acme Corporation/i)).toBeInTheDocument();
      expect(screen.queryByText(/Beta Solutions/i)).not.toBeInTheDocument();
    });
  });

  test('displays client details in table columns', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/Acme Corporation/i)).toBeInTheDocument();
      expect(screen.getByText(/Technology/i)).toBeInTheDocument();
      // Check for ACTIVE status using getAllByText since it appears in dropdown too
      const activeElements = screen.getAllByText(/ACTIVE/i);
      expect(activeElements.length).toBeGreaterThan(0);
    });
  });

  test('shows Edit button for each client', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });

  test('shows Delete button for each client', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  test('opens edit modal when Edit button is clicked', async () => {
    renderWithProviders(<ClientsManager />);
    
    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Edit Client/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Acme Corporation/i)).toBeInTheDocument();
    });
  });

  test('hides client actions when user lacks permissions', async () => {
    mockUsePermissions.mockReturnValue({
      loading: false,
      clientPermissions: {
        ...baseClientPermissions,
        canCreateClients: false,
        canEditClients: false,
        canDeleteClients: false,
      },
    });

    renderWithProviders(<ClientsManager />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Add Client/i })).not.toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
  });

  test('shows access denied when client info permission missing', async () => {
    mockUsePermissions.mockReturnValue({
      loading: false,
      clientPermissions: {
        ...baseClientPermissions,
        canAccessInfo: false,
        canViewSection: false,
      },
    });

    renderWithProviders(<ClientsManager />);

    await waitFor(() => {
      expect(screen.getByText(/You do not have permission to view client information/i)).toBeInTheDocument();
    });
  });
});
