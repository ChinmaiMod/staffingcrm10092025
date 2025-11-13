import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmailTemplates from './EmailTemplates'

// Mock modules
vi.mock('../../../api/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        data: [{ template_id: 1, name: 'Test Template' }],
        error: null,
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [{ template_id: 1, name: 'Updated Template' }],
            error: null,
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}))

vi.mock('../../../contexts/TenantProvider', () => ({
  useTenant: () => ({
    tenant: {
      tenant_id: 'test-tenant-123',
    },
  }),
}))

vi.mock('../../../contexts/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
    },
  }),
}))

describe('EmailTemplates - Modal Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal Opening and Rendering', () => {
    it('should render modal when "New Template" button is clicked', async () => {
      render(<EmailTemplates />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument()
      })
      
      const newTemplateBtn = screen.getByText('+ New Template')
      fireEvent.click(newTemplateBtn)
      
      expect(screen.getByText('New Email Template')).toBeInTheDocument()
      expect(screen.getByLabelText('Template Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email Subject')).toBeInTheDocument()
      expect(screen.getByLabelText('Email Body')).toBeInTheDocument()
    })

    it('should render all form fields in modal', async () => {
      render(<EmailTemplates />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument()
      })
      
      const newTemplateBtn = screen.getByText('+ New Template')
      fireEvent.click(newTemplateBtn)
      
      expect(screen.getByPlaceholderText('e.g., Welcome Email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('e.g., Welcome {first_name}')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Dear \{first_name\}/)).toBeInTheDocument()
      expect(screen.getByText('Active (available for notifications)')).toBeInTheDocument()
    })
  })

  describe('Modal Persistence - Critical Tests', () => {
    it('should NOT close modal when clicking on modal overlay background', async () => {
      render(<EmailTemplates />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument()
      })
      
      // Open modal
      const newTemplateBtn = screen.getByText('+ New Template')
      fireEvent.click(newTemplateBtn)
      
      // Verify modal is open
      expect(screen.getByText('New Email Template')).toBeInTheDocument()
      
      // Click on modal overlay (the background)
      const modalOverlay = screen.getByText('New Email Template').closest('.modal').parentElement
      fireEvent.click(modalOverlay)
      
      // Modal should STILL be visible after clicking overlay
      expect(screen.getByText('New Email Template')).toBeInTheDocument()
      expect(screen.getByLabelText('Template Name')).toBeInTheDocument()
    })

    it('should NOT close modal when clicking inside the modal content area', async () => {
      render(<EmailTemplates />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument()
      })
      
      // Open modal
      fireEvent.click(screen.getByText('+ New Template'))
      
      // Click inside modal content
      const modalContent = screen.getByText('New Email Template').closest('.modal')
      fireEvent.click(modalContent)
      
      // Modal should still be visible
      expect(screen.getByText('New Email Template')).toBeInTheDocument()
      expect(screen.getByLabelText('Template Name')).toBeInTheDocument()
    })

    it('should persist form data when user interacts with fields', async () => {
      render(<EmailTemplates />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument()
      })
      
      // Open modal
      fireEvent.click(screen.getByText('+ New Template'))
      
      // Fill out form
  const nameInput = screen.getByLabelText('Template Name')
  const subjectInput = screen.getByLabelText('Email Subject')
  const bodyInput = screen.getByLabelText('Email Body')
      
  fireEvent.change(nameInput, { target: { value: 'Welcome Email' } })
  fireEvent.change(subjectInput, { target: { value: 'Welcome {first_name}' } })
  fireEvent.change(bodyInput, { target: { value: 'Dear {first_name}, Welcome to our platform!' } })
      
      // Verify data persists
      expect(nameInput).toHaveValue('Welcome Email')
  expect(subjectInput).toHaveValue('Welcome {first_name}')
  expect(bodyInput).toHaveValue('Dear {first_name}, Welcome to our platform!')
      
      // Click somewhere in the modal (not on overlay)
      const modalContent = screen.getByText('New Email Template').closest('.modal')
      fireEvent.click(modalContent)
      
      // Data should still be there
      expect(nameInput).toHaveValue('Welcome Email')
  expect(subjectInput).toHaveValue('Welcome {first_name}')
  expect(bodyInput).toHaveValue('Dear {first_name}, Welcome to our platform!')
    })
  })

  describe('Modal Closing - Expected Behavior', () => {
    it('should close modal when clicking Cancel button', async () => {
      render(<EmailTemplates />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument()
      })
      
      // Open modal
      fireEvent.click(screen.getByText('+ New Template'))
      expect(screen.getByText('New Email Template')).toBeInTheDocument()
      
      // Click Cancel
      const cancelBtn = screen.getByText('Cancel')
      fireEvent.click(cancelBtn)
      
      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByText('New Email Template')).not.toBeInTheDocument()
      })
    })

    it('should close modal when clicking X button', async () => {
      render(<EmailTemplates />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument()
      })
      
      // Open modal
      fireEvent.click(screen.getByText('+ New Template'))
      expect(screen.getByText('New Email Template')).toBeInTheDocument()
      
      // Click X button
      const closeBtn = screen.getByText('✕')
      fireEvent.click(closeBtn)
      
      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByText('New Email Template')).not.toBeInTheDocument()
      })
    })

    it('should close modal after successful form submission', async () => {
      render(<EmailTemplates />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument()
      })
      
      // Open modal
      fireEvent.click(screen.getByText('+ New Template'))
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText('Template Name'), {
        target: { value: 'Test Template' },
      })
      fireEvent.change(screen.getByLabelText('Email Subject'), {
        target: { value: 'Test Subject' },
      })
      fireEvent.change(screen.getByLabelText('Email Body'), {
        target: { value: 'Test Body' },
      })
      
      const submitBtn = screen.getByText('Create Template')
      fireEvent.click(submitBtn)
      
      // Modal should close after submission
      await waitFor(() => {
        expect(screen.queryByText('New Email Template')).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Data Integrity', () => {
    it('should maintain form state during user typing without modal closing', async () => {
      const user = userEvent.setup()
      render(<EmailTemplates />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading templates...')).not.toBeInTheDocument()
      })
      
      // Open modal
      fireEvent.click(screen.getByText('+ New Template'))
      
      const nameInput = screen.getByLabelText('Template Name')
      
      // Type slowly (simulating real user behavior)
      await user.type(nameInput, 'My New Template Name')
      
      // Wait a bit (simulating the "few minutes" the user mentioned)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Modal should STILL be open
      expect(screen.getByText('New Email Template')).toBeInTheDocument()
      expect(nameInput).toHaveValue('My New Template Name')
    })
  })
})
