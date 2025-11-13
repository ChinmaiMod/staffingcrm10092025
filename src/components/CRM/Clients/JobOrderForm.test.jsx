import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JobOrderForm from './JobOrderForm'

const mockClients = [
  { client_id: 'client-1', client_name: 'Acme Corp' },
  { client_id: 'client-2', client_name: 'Tech Solutions Inc' },
]

const mockBusinesses = [
  { business_id: 'business-1', business_name: 'Business Unit A' },
  { business_id: 'business-2', business_name: 'Business Unit B' },
]

const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

describe('JobOrderForm', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear()
    mockOnCancel.mockClear()
  })

  it('renders the form with all required fields', () => {
    render(
      <JobOrderForm
        clients={mockClients}
        businesses={mockBusinesses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByRole('combobox', { name: /client/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /job title/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /priority/i })).toBeInTheDocument()
  })

  it('displays validation errors when submitting empty form', async () => {
    render(
      <JobOrderForm
        clients={mockClients}
        businesses={mockBusinesses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const submitButton = screen.getByRole('button', { name: /create job order/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/job title is required/i)).toBeInTheDocument()
      expect(screen.getByText(/client is required/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('populates form fields when editing existing job order', () => {
    const existingJobOrder = {
      job_order_id: 'job-1',
      client_id: 'client-1',
      business_id: 'business-1',
      job_title: 'Senior Developer',
      location: 'New York, NY',
      status: 'OPEN',
      priority: 'HIGH',
      employment_type: 'FULL_TIME',
      required_skills: ['React', 'Node.js'],
      openings_count: 2,
      filled_count: 0,
    }

    render(
      <JobOrderForm
        jobOrder={existingJobOrder}
        clients={mockClients}
        businesses={mockBusinesses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByDisplayValue('Senior Developer')).toBeInTheDocument()
    expect(screen.getByDisplayValue('New York, NY')).toBeInTheDocument()
    expect(screen.getByDisplayValue('React, Node.js')).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    render(
      <JobOrderForm
        clients={mockClients}
        businesses={mockBusinesses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.change(screen.getByRole('combobox', { name: /client/i }), {
      target: { value: 'client-1' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /job title/i }), {
      target: { value: 'Software Engineer' },
    })

    const submitButton = screen.getByRole('button', { name: /create job order/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })

    const submittedData = mockOnSubmit.mock.calls[0][0]
    expect(submittedData.job_title).toBe('Software Engineer')
    expect(submittedData.client_id).toBe('client-1')
  })

  it('validates salary range (min <= max)', async () => {
    render(
      <JobOrderForm
        clients={mockClients}
        businesses={mockBusinesses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.change(screen.getByRole('combobox', { name: /client/i }), {
      target: { value: 'client-1' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /job title/i }), {
      target: { value: 'Test Job' },
    })
    fireEvent.change(screen.getByLabelText(/min salary/i), {
      target: { value: '100000' },
    })
    fireEvent.change(screen.getByLabelText(/max salary/i), {
      target: { value: '50000' },
    })

    const submitButton = screen.getByRole('button', { name: /create job order/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/max salary must be greater than min salary/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates experience range (min <= max)', async () => {
    render(
      <JobOrderForm
        clients={mockClients}
        businesses={mockBusinesses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.change(screen.getByRole('combobox', { name: /client/i }), {
      target: { value: 'client-1' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /job title/i }), {
      target: { value: 'Test Job' },
    })
    fireEvent.change(screen.getByLabelText(/min experience/i), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByLabelText(/max experience/i), {
      target: { value: '5' },
    })

    const submitButton = screen.getByRole('button', { name: /create job order/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/max experience must be greater than min experience/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates filled count does not exceed openings count', async () => {
    render(
      <JobOrderForm
        clients={mockClients}
        businesses={mockBusinesses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.change(screen.getByRole('combobox', { name: /client/i }), {
      target: { value: 'client-1' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /job title/i }), {
      target: { value: 'Test Job' },
    })
    fireEvent.change(screen.getByLabelText(/openings count/i), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByLabelText(/filled count/i), {
      target: { value: '5' },
    })

    const submitButton = screen.getByRole('button', { name: /create job order/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/filled count cannot exceed openings count/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('converts comma-separated skills to arrays on submit', async () => {
    render(
      <JobOrderForm
        clients={mockClients}
        businesses={mockBusinesses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.change(screen.getByRole('combobox', { name: /client/i }), {
      target: { value: 'client-1' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /job title/i }), {
      target: { value: 'Developer' },
    })
    fireEvent.change(screen.getByLabelText(/required skills/i), {
      target: { value: 'JavaScript, React, Node.js' },
    })

    const submitButton = screen.getByRole('button', { name: /create job order/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })

    const submittedData = mockOnSubmit.mock.calls[0][0]
    expect(submittedData.required_skills).toEqual(['JavaScript', 'React', 'Node.js'])
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <JobOrderForm
        clients={mockClients}
        businesses={mockBusinesses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('disables submit button while submitting', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(
      <JobOrderForm
        clients={mockClients}
        businesses={mockBusinesses}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    fireEvent.change(screen.getByRole('combobox', { name: /client/i }), {
      target: { value: 'client-1' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /job title/i }), {
      target: { value: 'Test Job' },
    })

    const submitButton = screen.getByRole('button', { name: /create job order/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent(/saving/i)
    })
  })
})
