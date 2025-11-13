import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientForm from './ClientForm';
import { AuthProvider } from '../../../contexts/AuthProvider';
import { TenantProvider } from '../../../contexts/TenantProvider';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../api/supabaseClient');

vi.mock('../../../contexts/TenantProvider', () => ({
  useTenant: () => ({
    tenant: {
      tenant_id: 'test-tenant-123',
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

const mockOnSubmit = vi.fn();
const mockOnCancel = vi.fn();

describe('ClientForm', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  test('renders form with all required fields', () => {
    renderWithProviders(
      <ClientForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByLabelText(/Client Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Revenue/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Client Source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Primary Contact Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Primary Contact Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Industry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
  });

  test('shows validation error when client name is empty', async () => {
    renderWithProviders(
      <ClientForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    const submitButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Client name is required/i)).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('submits form with valid data', async () => {
    renderWithProviders(
      <ClientForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    fireEvent.change(screen.getByLabelText(/Client Name/i), {
      target: { value: 'New Client Corp' }
    });
    fireEvent.change(screen.getByLabelText(/Website/i), {
      target: { value: 'https://newclient.com' }
    });
    fireEvent.change(screen.getByLabelText(/Revenue/i), {
      target: { value: '1000000' }
    });
    fireEvent.change(screen.getByLabelText(/Client Source/i), {
      target: { value: 'Referral' }
    });
    fireEvent.change(screen.getByLabelText(/Primary Contact Email/i), {
      target: { value: 'contact@newclient.com' }
    });
    fireEvent.change(screen.getByLabelText(/Industry/i), {
      target: { value: 'Technology' }
    });
    
    const submitButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          client_name: 'New Client Corp',
          website: 'https://newclient.com',
          revenue: 1000000,
          client_source: 'Referral',
          primary_contact_email: 'contact@newclient.com',
          industry: 'Technology',
        })
      );
    });
  });

  test('displays Cancel button', () => {
    renderWithProviders(
      <ClientForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('calls onCancel when Cancel button is clicked', () => {
    renderWithProviders(
      <ClientForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('populates form fields in edit mode', () => {
    const existingClient = {
      client_id: 'client-1',
      client_name: 'Existing Corp',
      website: 'https://existing.com',
      revenue: 5000000,
      client_source: 'Cold Call',
      primary_contact_email: 'info@existing.com',
      primary_contact_phone: '+1-555-1234',
      industry: 'Finance',
      status: 'ACTIVE',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postal_code: '10001',
      notes: 'Important client',
    };
    
    renderWithProviders(
      <ClientForm 
        client={existingClient}
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByDisplayValue('Existing Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://existing.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5000000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cold Call')).toBeInTheDocument();
    expect(screen.getByDisplayValue('info@existing.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Finance')).toBeInTheDocument();
  });

  test('shows address fields', () => {
    renderWithProviders(
      <ClientForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByLabelText(/Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/State/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Postal Code/i)).toBeInTheDocument();
  });

  test('shows notes field', () => {
    renderWithProviders(
      <ClientForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
  });

  test('status dropdown has correct options', () => {
    renderWithProviders(
      <ClientForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    const statusSelect = screen.getByLabelText(/Status/i);
    expect(statusSelect).toBeInTheDocument();
    
    // Check if options exist using getAllByRole
    const options = screen.getAllByRole('option');
    const optionTexts = options.map(opt => opt.textContent);
    
    expect(optionTexts).toContain('ACTIVE');
    expect(optionTexts).toContain('PROSPECT');
    expect(optionTexts).toContain('INACTIVE');
  });

  test('validates email format', async () => {
    renderWithProviders(
      <ClientForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    // Fill in required client name
    const clientNameInput = screen.getByLabelText(/Client Name/i);
    fireEvent.change(clientNameInput, {
      target: { value: 'Test Client' }
    });
    
    // Enter invalid email
    const emailInput = screen.getByLabelText(/Primary Contact Email/i);
    fireEvent.change(emailInput, {
      target: { value: 'invalid-email' }
    });
    
    // Try to submit
    const submitButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(submitButton);
    
    // Verify form was not submitted due to email validation
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
    
    // Now fix the email and verify it submits
    fireEvent.change(emailInput, {
      target: { value: 'valid@email.com' }
    });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});
