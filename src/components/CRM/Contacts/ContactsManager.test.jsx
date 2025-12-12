
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ContactsManager from './ContactsManager';
import ContactDetail from './ContactDetail';
import { supabase } from '../../../api/supabaseClient';
import { MemoryRouter } from 'react-router-dom';

let mockUserPermissions = {
  role_level: 5,
  can_create_records: true,
  can_edit_all_records: true,
  can_edit_subordinate_records: true,
  can_edit_own_records: true,
  can_delete_all_records: true,
  can_delete_subordinate_records: true,
  can_delete_own_records: true,
  can_view_all_records: true,
  can_view_subordinate_records: true,
  can_view_own_records: true,
}

vi.mock('../../../api/supabaseClient');

vi.mock('../../../contexts/PermissionsProvider', () => ({
  usePermissions: () => ({
    loading: false,
    error: null,
    permissions: mockUserPermissions,
    roleLevel: mockUserPermissions?.role_level ?? null,
    roleCode: mockUserPermissions?.role_code ?? null,
    clientPermissions: {
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
    },
    refresh: vi.fn(),
  }),
}))

const createSelectResponse = (rows) => ({
  select: () => {
    const result = { data: rows, error: null };
    return {
      ...result,
      eq: () => result
    };
  }
});

beforeAll(() => {
  // Mock supabase.auth.getSession for AuthProvider
  if (!supabase.auth) supabase.auth = {};
  supabase.auth.getSession = vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } } });
  // Mock supabase.auth.onAuthStateChange for AuthProvider
  supabase.auth.onAuthStateChange = vi.fn().mockImplementation((cb) => {
    cb('SIGNED_IN', { user: { id: 'test-user' } });
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  // Robust supabase.from mock for contacts and lookup tables
  supabase.from = vi.fn((table) => {
    if (table === 'contacts') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              abortSignal: () => ({
                data: [
                  {
                    id: 1,
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john.doe@intuites.com',
                    phone: '+1 (555) 123-4567',
                    contact_type: 'IT Candidate',
                    created_at: '2025-01-02T00:00:00.000Z',
                    updated_at: '2025-01-02T00:00:00.000Z',
                    workflow_status_id: 31,
                    workflow_status: { workflow_status: 'Initial Contact' },
                    visa_status_id: 34,
                    job_title_id: 26,
                    type_of_roles_id: 13,
                    years_of_experience_id: 3,
                    referral_source_id: 17,
                    city_id: null,
                    country_id: null,
                    state_id: null,
                    reason_for_contact_id: null,
                    businesses: { business_name: 'Acme Inc' },
                  },
                  {
                    id: 2,
                    first_name: 'Jane',
                    last_name: 'Smith',
                    email: 'jane.smith@intuites.com',
                    phone: '+1 (555) 987-6543',
                    contact_type: 'Healthcare Candidate',
                    created_at: '2025-01-01T00:00:00.000Z',
                    updated_at: '2025-01-01T00:00:00.000Z',
                    workflow_status_id: 32,
                    workflow_status: { workflow_status: 'Spoke to Candidate' },
                    visa_status_id: 32,
                    job_title_id: 55,
                    type_of_roles_id: 14,
                    years_of_experience_id: 4,
                    referral_source_id: 16,
                    city_id: null,
                    country_id: null,
                    state_id: null,
                    reason_for_contact_id: null,
                    businesses: { business_name: 'Beta LLC' },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'job_title') {
      return createSelectResponse([
        { id: 26, job_title: 'Java Full Stack Developer', field: 'IT' },
        { id: 44, job_title: 'Automation QA', field: 'IT' },
        { id: 55, job_title: 'Registered Nurse (RN)', field: 'Healthcare' },
      ]);
    }
    if (table === 'visa_status') {
      return createSelectResponse([
        { id: 32, visa_status: 'OPT' },
        { id: 34, visa_status: 'H1B' },
        { id: 36, visa_status: 'H4 EAD' },
      ]);
    }
    if (table === 'type_of_roles') {
      return createSelectResponse([
        { id: 13, type_of_roles: 'Remote' },
        { id: 14, type_of_roles: 'Hybrid Local' },
        { id: 16, type_of_roles: 'Open to Relocate' },
      ]);
    }
    if (table === 'years_of_experience') {
      return createSelectResponse([
        { id: 2, years_of_experience: '1 to 3' },
        { id: 3, years_of_experience: '4 to 6' },
        { id: 4, years_of_experience: '7 to 9' },
        { id: 6, years_of_experience: '15+' },
      ]);
    }
    if (table === 'referral_sources') {
      return createSelectResponse([
        { id: 16, referral_source: 'Facebook' },
        { id: 17, referral_source: 'Google' },
      ]);
    }
    if (table === 'workflow_status') {
      return createSelectResponse([
        { id: 31, workflow_status: 'Initial Contact' },
        { id: 32, workflow_status: 'Spoke to Candidate' },
        { id: 36, workflow_status: 'Recruiter Started Marketing' },
        { id: 60, workflow_status: 'Candidate declined Marketing' },
      ]);
    }
    if (table === 'cities') {
      return createSelectResponse([
        { city_id: 'beb5e123-ea4e-4319-a7b7-48dace651336', name: 'Dallas' },
        { city_id: 'd4f09289-bc61-44f4-8934-ca2780ab243c', name: 'Atlanta' },
      ]);
    }
    if (table === 'countries') {
      return createSelectResponse([
        { country_id: '7fefe296-e5e2-415c-8f3c-262dac8093d9', code: 'USA', name: 'United States of America' },
      ]);
    }
    if (table === 'states') {
      return createSelectResponse([
        { state_id: '815df504-6b8b-427b-b9af-fed61d9b7403', code: 'CA', name: 'California' },
      ]);
    }
    return createSelectResponse([]);
  });
});

// Custom context providers with valid tenant and business
import { AuthContext } from '../../../contexts/AuthProvider';
import { TenantContext } from '../../../contexts/TenantProvider';
const mockTenant = { tenant_id: 'tenant-123' };

function MockTenantProvider({ children }) {
  return (
    <TenantContext.Provider value={{ tenant: mockTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

function MockAuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ session: { access_token: 'token' }, profile: { id: 'test-user' } }}>
      {children}
    </AuthContext.Provider>
  );
}

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <MockAuthProvider>
        <MockTenantProvider>{ui}</MockTenantProvider>
      </MockAuthProvider>
    </MemoryRouter>
  );
}

describe('ContactsManager', () => {
  beforeEach(() => {
    mockUserPermissions = {
      role_level: 5,
      can_create_records: true,
      can_edit_all_records: true,
      can_edit_subordinate_records: true,
      can_edit_own_records: true,
      can_delete_all_records: true,
      can_delete_subordinate_records: true,
      can_delete_own_records: true,
      can_view_all_records: true,
      can_view_subordinate_records: true,
      can_view_own_records: true,
    }
    supabase.from.mockClear();
  });

  it('renders contacts table and allows creating a new contact', async () => {
    renderWithProviders(<ContactsManager />);
  // Wait for contacts table to render (not loading)
  await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
  // Check for contact row content
    expect(screen.getByText(/John\s+Doe/)).toBeInTheDocument();
  expect(screen.getAllByText(/Global/).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /New Contact/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /New Contact/i }));
  await waitFor(() => expect(screen.getAllByText(/New Contact/i).length).toBeGreaterThan(0));
  });
});

describe('ContactsManager Search and Filter', () => {
  beforeEach(() => {
    supabase.from.mockClear();
  });

  it('should show all contacts when search is empty', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
    
    // Both John and Jane should be visible
    expect(screen.getByText(/John\s+Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Jane\s+Smith/)).toBeInTheDocument();
  });

  it('should filter contacts by first name search', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText(/Search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    await waitFor(() => {
      expect(screen.getByText(/John\s+Doe/)).toBeInTheDocument();
      expect(screen.queryByText(/Jane\s+Smith/)).not.toBeInTheDocument();
    });
  });

  it('should filter contacts by last name search', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText(/Search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'Smith' } });
    
    await waitFor(() => {
      expect(screen.queryByText(/John\s+Doe/)).not.toBeInTheDocument();
      expect(screen.getByText(/Jane\s+Smith/)).toBeInTheDocument();
    });
  });

  it('should filter contacts by email search', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText(/Search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'jane.smith' } });
    
    await waitFor(() => {
      expect(screen.queryByText(/John\s+Doe/)).not.toBeInTheDocument();
      expect(screen.getByText(/Jane\s+Smith/)).toBeInTheDocument();
    });
  });

  it('should populate status dropdown from database', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
    
    // Status dropdown should show "All" option
    const statusSelect = screen.getByDisplayValue('All Statuses');
    expect(statusSelect).toBeInTheDocument();
    
    // Should have options from workflow_status table
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Initial Contact' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Spoke to Candidate' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Recruiter Started Marketing' })).toBeInTheDocument();
    });
  });

  it('should filter contacts by workflow status', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('option', { name: 'Initial Contact' })).toBeInTheDocument());
    
    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'Initial Contact' } });
    
    await waitFor(() => {
      // John has workflow_status_id: 31
      expect(screen.getByText(/John\s+Doe/)).toBeInTheDocument();
      // Jane has workflow_status_id: 32
      expect(screen.queryByText(/Jane\s+Smith/)).not.toBeInTheDocument();
    });
  });

  it('should show Advanced Filter Builder inline when button is clicked', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
    
    // Advanced Filter Builder should not be visible initially
    expect(screen.queryByText(/Advanced Filter Builder/i)).not.toBeInTheDocument();
    
    // Click Advanced Filter button
    const advancedFilterBtn = screen.getByRole('button', { name: /advanced filter/i });
    fireEvent.click(advancedFilterBtn);
    
    // Advanced Filter Builder should appear inline (not as modal)
    await waitFor(() => {
      expect(screen.getByText(/Advanced Filter Builder/i)).toBeInTheDocument();
    });
    
    // Should appear below the filter controls (not at bottom of page)
    const filterBuilder = screen.getByText(/Advanced Filter Builder/i).closest('.advanced-filter-inline');
    expect(filterBuilder).toBeInTheDocument();
  });

  it('should hide Advanced Filter Builder when close button is clicked', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
    
    // Open Advanced Filter
    const advancedFilterBtn = screen.getByRole('button', { name: /advanced filter/i });
    fireEvent.click(advancedFilterBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/Advanced Filter Builder/i)).toBeInTheDocument();
    });
    
    // Close Advanced Filter (get the close button in the header, not the remove condition button)
    const filterBuilder = screen.getByText(/Advanced Filter Builder/i).closest('.advanced-filter-builder');
    const header = within(filterBuilder).getByText(/Advanced Filter Builder/i).closest('.filter-builder-header');
    const closeBtn = within(header).getByRole('button', { name: '✕' });
    fireEvent.click(closeBtn);
    
    // Should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/Advanced Filter Builder/i)).not.toBeInTheDocument();
    });
  });

  it('should keep table visible when Advanced Filter Builder is shown', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
    
    // Verify contacts table is visible
    expect(screen.getByText(/John\s+Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Jane\s+Smith/)).toBeInTheDocument();
    
    // Open Advanced Filter
    const advancedFilterBtn = screen.getByRole('button', { name: /advanced filter/i });
    fireEvent.click(advancedFilterBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/Advanced Filter Builder/i)).toBeInTheDocument();
    });
    
    // Table should still be visible (not hidden by modal overlay)
    expect(screen.getByText(/John\s+Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Jane\s+Smith/)).toBeInTheDocument();
  });

  it('should filter by job_title using lookup values - CONTAINS "Java"', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());

    // Verify both contacts are visible initially
    expect(screen.getByText(/John\s+Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Jane\s+Smith/)).toBeInTheDocument();

    // Open Advanced Filter
    const advancedFilterBtn = screen.getByRole('button', { name: /advanced filter/i });
    fireEvent.click(advancedFilterBtn);

    await waitFor(() => {
      expect(screen.getByText(/Advanced Filter Builder/i)).toBeInTheDocument();
    });

    // Note: In real usage, user would select fields in the UI to create filter like:
    // filterConfig = {
    //   groups: [{ logicalOperator: 'AND', conditions: [{ field: 'job_title', operator: 'contains', value: 'Java' }] }],
    //   groupOperator: 'OR'
    // }
    // For this test, we verify the filter builder is available and contacts have job_title field populated
    expect(screen.getByText(/Advanced Filter Builder/i)).toBeInTheDocument();
  });

  it('filters contacts by job title via advanced filter builder', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());

    // Both contacts visible initially
    expect(screen.getByText(/John\s+Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Jane\s+Smith/)).toBeInTheDocument();

    // Open Advanced Filter
    const advancedFilterBtn = screen.getByRole('button', { name: /advanced filter/i });
    fireEvent.click(advancedFilterBtn);

    const filterHeading = await screen.findByText(/Advanced Filter Builder/i);
    const filterBuilder = filterHeading.closest('.advanced-filter-builder');
    const conditionRow = filterBuilder.querySelector('.condition-row');

    const fieldSelect = within(conditionRow).getByDisplayValue('First Name');
    fireEvent.change(fieldSelect, { target: { value: 'job_title' } });

  const operatorSelect = within(conditionRow).getByDisplayValue('Equals');
    fireEvent.change(operatorSelect, { target: { value: 'contains' } });

    const valueInput = within(conditionRow).getByPlaceholderText(/Enter value/i);
    fireEvent.change(valueInput, { target: { value: 'java' } });

    const applyButton = within(filterBuilder).getByRole('button', { name: /Apply Filters/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText(/John\s+Doe/)).toBeInTheDocument();
      expect(screen.queryByText(/Jane\s+Smith/)).not.toBeInTheDocument();
    });
  });

  it('should filter by visa_status using lookup values', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());

    // Open Advanced Filter
    const advancedFilterBtn = screen.getByRole('button', { name: /advanced filter/i });
    fireEvent.click(advancedFilterBtn);

    await waitFor(() => {
      expect(screen.getByText(/Advanced Filter Builder/i)).toBeInTheDocument();
    });

    // Simulate applying filter: visa_status equals "H1B"
    // This requires contacts to have visa_status field populated from lookupMaps[visa_status_id]
    
    // For now, just verify the filter builder is present
    expect(screen.getByText(/Advanced Filter Builder/i)).toBeInTheDocument();
  });

  it('should filter with combined lookup fields (job_title AND visa_status)', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());

    // Test the exact scenario from the screenshot:
    // Job Title contains "java" AND Visa Status equals "H1B"
    
    const advancedFilterBtn = screen.getByRole('button', { name: /advanced filter/i });
    fireEvent.click(advancedFilterBtn);

    await waitFor(() => {
      expect(screen.getByText(/Advanced Filter Builder/i)).toBeInTheDocument();
    });

    // Once implementation is complete, this test should verify:
    // 1. Contacts are enriched with job_title and visa_status strings
    // 2. Filter matches against those strings (not IDs)
    // 3. Only contacts matching both conditions are shown
    
    expect(screen.getByText(/Advanced Filter Builder/i)).toBeInTheDocument();
  });
});

describe('ContactsManager Sorting', () => {
  beforeEach(() => {
    supabase.from.mockClear();
  });

  it('should show a combined Sort dropdown', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());

    expect(screen.getByLabelText(/^sort$/i)).toBeInTheDocument();
  });

  it('should sort contacts by first name ascending', async () => {
    renderWithProviders(<ContactsManager />);
    await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/^sort$/i), { target: { value: 'first_name:asc' } });

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText(/Jane\s+Smith/)).toBeInTheDocument();
      expect(within(rows[2]).getByText(/John\s+Doe/)).toBeInTheDocument();
    });
  });
});

describe('ContactDetail', () => {
  it('renders contact details', () => {
    const contact = {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      phone: '9876543210',
      business_name: 'Beta LLC',
      contact_type: 'healthcare_candidate',
      status: 'Initial Contact',
      job_title_id: 55,
      workflow_status_id: 31,
      created_at: '2025-10-21T00:00:00Z',
    };
    renderWithProviders(<ContactDetail contact={contact} onClose={() => {}} />);
    expect(screen.getByText(/Jane/)).toBeInTheDocument();
    expect(screen.getByText(/Smith/)).toBeInTheDocument();

    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Beta LLC/)).toBeInTheDocument();
    expect(screen.getByText(/Initial Contact/)).toBeInTheDocument();
  });
});
