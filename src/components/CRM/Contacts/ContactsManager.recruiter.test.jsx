import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactsManager from './ContactsManager';
import { AuthProvider } from '../../../contexts/AuthProvider';
import { TenantProvider } from '../../../contexts/TenantProvider';
import { supabase } from '../../../api/supabaseClient';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../api/supabaseClient');

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
  supabase.auth.getSession = vi.fn().mockResolvedValue({ 
    data: { session: { user: { id: 'test-user' } } } 
  });
  
  // Mock supabase.auth.onAuthStateChange for AuthProvider
  supabase.auth.onAuthStateChange = vi.fn().mockImplementation((cb) => {
    cb('SIGNED_IN', { user: { id: 'test-user' } });
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });

  // Mock supabase.from for internal_staff, teams, and team_members
  const originalFrom = supabase.from;
  supabase.from = vi.fn((table) => {
    if (table === 'internal_staff') {
      return createSelectResponse([
        { 
          staff_id: 'staff-1',
          first_name: 'Alice',
          last_name: 'Recruiter',
          email: 'alice@company.com',
          job_title: 'Senior Recruiter',
          status: 'ACTIVE',
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
          staff_id: 'staff-2',
          first_name: 'Bob',
          last_name: 'Manager',
          email: 'bob@company.com',
          job_title: 'Recruiting Manager',
          status: 'ACTIVE',
          team_members: [
            {
              team_id: 'team-2',
              role: 'MANAGER',
              teams: {
                team_name: 'Healthcare Recruiting Team',
                business_id: 'biz-2'
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
          staff_id: 'staff-1',
          role: 'LEAD',
          is_active: true
        },
        {
          member_id: 'member-2',
          team_id: 'team-2',
          staff_id: 'staff-2',
          role: 'MANAGER',
          is_active: true
        },
      ]);
    }
    
    // Call original mock for other tables
    return originalFrom(table);
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

describe('ContactsManager - Recruiter Assignment', () => {
  test('shows recruiter dropdown in contact form', async () => {
    renderWithProviders(<ContactsManager />);
    
    // Open new contact form
    await waitFor(() => {
      const newButton = screen.getByRole('button', { name: /New Contact/i });
      fireEvent.click(newButton);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Recruiter/i)).toBeInTheDocument();
    });
  });

  test('populates recruiter dropdown with internal staff', async () => {
    renderWithProviders(<ContactsManager />);
    
    // Open new contact form
    await waitFor(() => {
      const newButton = screen.getByRole('button', { name: /New Contact/i });
      fireEvent.click(newButton);
    });

    await waitFor(() => {
      const recruiterSelect = screen.getByLabelText(/Recruiter/i);
      expect(recruiterSelect).toBeInTheDocument();
      
      // Should have options for both recruiters
      expect(screen.getByRole('option', { name: /Alice Recruiter/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Bob Manager/i })).toBeInTheDocument();
    });
  });

  test('allows selecting a recruiter when creating contact', async () => {
    renderWithProviders(<ContactsManager />);
    
    // Open new contact form
    await waitFor(() => {
      const newButton = screen.getByRole('button', { name: /New Contact/i });
      fireEvent.click(newButton);
    });

    await waitFor(() => {
      const recruiterSelect = screen.getByLabelText(/Recruiter/i);
      fireEvent.change(recruiterSelect, { target: { value: 'staff-1' } });
    });

    await waitFor(() => {
      const recruiterSelect = screen.getByLabelText(/Recruiter/i);
      expect(recruiterSelect.value).toBe('staff-1');
    });
  });

  test('saves recruiter_id when creating contact', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
    supabase.from = vi.fn((table) => {
      if (table === 'contacts') {
        return {
          insert: mockInsert,
          select: () => ({
            eq: () => ({
              order: () => ({
                abortSignal: () => ({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'internal_staff') {
        return createSelectResponse([
          { staff_id: 'staff-1', first_name: 'Alice', last_name: 'Recruiter' },
        ]);
      }
      return createSelectResponse([]);
    });

    renderWithProviders(<ContactsManager />);
    
    // Open new contact form
    await waitFor(() => {
      const newButton = screen.getByRole('button', { name: /New Contact/i });
      fireEvent.click(newButton);
    });

    // Fill in required fields
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@test.com' } });
      fireEvent.change(screen.getByLabelText(/Recruiter/i), { target: { value: 'staff-1' } });
    });

    // Submit form
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /Save/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          recruiter_id: 'staff-1',
        })
      );
    });
  });

  test('displays recruiter name in contacts list', async () => {
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
                      email: 'john@test.com',
                      recruiter_id: 'staff-1',
                      internal_staff: {
                        first_name: 'Alice',
                        last_name: 'Recruiter'
                      }
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return createSelectResponse([]);
    });

    renderWithProviders(<ContactsManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/Alice Recruiter/i)).toBeInTheDocument();
    });
  });

  test('allows filtering contacts by recruiter', async () => {
    renderWithProviders(<ContactsManager />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Filter by Recruiter/i)).toBeInTheDocument();
    });

    const recruiterFilter = screen.getByLabelText(/Filter by Recruiter/i);
    fireEvent.change(recruiterFilter, { target: { value: 'staff-1' } });

    await waitFor(() => {
      expect(recruiterFilter.value).toBe('staff-1');
    });
  });

  test('displays team information with recruiter', async () => {
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
                      email: 'john@test.com',
                      recruiter_id: 'staff-1',
                      internal_staff: {
                        first_name: 'Alice',
                        last_name: 'Recruiter',
                        team_members: [
                          {
                            teams: {
                              team_name: 'IT Recruiting Team'
                            }
                          }
                        ]
                      }
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return createSelectResponse([]);
    });

    renderWithProviders(<ContactsManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/IT Recruiting Team/i)).toBeInTheDocument();
    });
  });

  test('shows team filter dropdown', async () => {
    renderWithProviders(<ContactsManager />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Filter by Team/i)).toBeInTheDocument();
    });
  });

  test('filters contacts by team', async () => {
    renderWithProviders(<ContactsManager />);
    
    await waitFor(() => {
      const teamFilter = screen.getByLabelText(/Filter by Team/i);
      fireEvent.change(teamFilter, { target: { value: 'team-1' } });
    });

    await waitFor(() => {
      const teamFilter = screen.getByLabelText(/Filter by Team/i);
      expect(teamFilter.value).toBe('team-1');
    });
  });
});
