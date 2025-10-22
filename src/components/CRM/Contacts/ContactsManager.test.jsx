
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactsManager from './ContactsManager';
import ContactForm from './ContactForm';
import ContactDetail from './ContactDetail';
import { AuthProvider } from '../../../contexts/AuthProvider';
import { TenantProvider } from '../../../contexts/TenantProvider';
import { supabase } from '../../../api/supabaseClient';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../api/supabaseClient');

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
                    workflow_status_id: 31,
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
                    workflow_status_id: 32,
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
      return { select: () => ({ data: [
        { id: 26, job_title: 'Java Full Stack Developer', field: 'IT' },
        { id: 44, job_title: 'Automation QA', field: 'IT' },
        { id: 55, job_title: 'Registered Nurse (RN)', field: 'Healthcare' },
      ], error: null }) };
    }
    if (table === 'visa_status') {
      return { select: () => ({ data: [
        { id: 32, visa_status: 'OPT' },
        { id: 34, visa_status: 'H1B' },
        { id: 36, visa_status: 'H4 EAD' },
      ], error: null }) };
    }
    if (table === 'type_of_roles') {
      return { select: () => ({ data: [
        { id: 13, type_of_roles: 'Remote' },
        { id: 14, type_of_roles: 'Hybrid Local' },
        { id: 16, type_of_roles: 'Open to Relocate' },
      ], error: null }) };
    }
    if (table === 'years_of_experience') {
      return { select: () => ({ data: [
        { id: 2, years_of_experience: '1 to 3' },
        { id: 3, years_of_experience: '4 to 6' },
        { id: 4, years_of_experience: '7 to 9' },
        { id: 6, years_of_experience: '15+' },
      ], error: null }) };
    }
    if (table === 'referral_sources') {
      return { select: () => ({ data: [
        { id: 16, referral_source: 'Facebook' },
        { id: 17, referral_source: 'Google' },
      ], error: null }) };
    }
    if (table === 'workflow_status') {
      return { select: () => ({ data: [
        { id: 31, workflow_status: 'Initial Contact' },
        { id: 32, workflow_status: 'Spoke to Candidate' },
        { id: 36, workflow_status: 'Recruiter Started Marketing' },
        { id: 60, workflow_status: 'Candidate declined Marketing' },
      ], error: null }) };
    }
    if (table === 'cities') {
      return { select: () => ({ data: [
        { city_id: 'beb5e123-ea4e-4319-a7b7-48dace651336', name: 'Dallas' },
        { city_id: 'd4f09289-bc61-44f4-8934-ca2780ab243c', name: 'Atlanta' },
      ], error: null }) };
    }
    if (table === 'countries') {
      return { select: () => ({ data: [
        { country_id: '7fefe296-e5e2-415c-8f3c-262dac8093d9', code: 'USA', name: 'United States of America' },
      ], error: null }) };
    }
    if (table === 'states') {
      return { select: () => ({ data: [
        { state_id: '815df504-6b8b-427b-b9af-fed61d9b7403', code: 'CA', name: 'California' },
      ], error: null }) };
    }
    return { select: () => ({ data: [], error: null }) };
  });
});

// Custom context providers with valid tenant and business
import { AuthContext } from '../../../contexts/AuthProvider';
import { TenantContext } from '../../../contexts/TenantProvider';
const mockTenant = { tenant_id: 'tenant-123' };
const mockBusinesses = [{ business_id: 'biz-1', business_name: 'Acme Inc', is_default: true }];

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
    supabase.from.mockClear();
  });

  it('renders contacts table and allows creating a new contact', async () => {
    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            abortSignal: () => ({
              data: [
                {
                  id: 1,
                  first_name: 'John',
                  last_name: 'Doe',
                  email: 'john@example.com',
                  phone: '1234567890',
                  contact_type: 'it_candidate',
                  workflow_status_id: 1,
                  job_title_id: 1,
                  reason_for_contact_id: 2,
                  businesses: { business_name: 'Acme Inc' },
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

  renderWithProviders(<ContactsManager />);
  // Wait for contacts table to render (not loading)
  await waitFor(() => expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument());
  // Check for contact row content
  expect(screen.getByText((content) => content.includes('John') && content.includes('Doe'))).toBeInTheDocument();
  expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
  expect(screen.getAllByText(/Global/).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /New Contact/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /New Contact/i }));
  await waitFor(() => expect(screen.getAllByText(/New Contact/i).length).toBeGreaterThan(0));
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
