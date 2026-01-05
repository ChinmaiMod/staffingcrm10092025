import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, screen } from '@testing-library/react'
import { render } from '../../../test/utils.jsx'
import ContactForm from './ContactForm.jsx'

const TABLES = [
  'visa_status',
  'job_title',
  'workflow_status',
  'reason_for_contact',
  'years_of_experience',
  'type_of_roles',
  'referral_sources',
  'countries',
  'states',
  'cities',
  'team_members'
]

const mockSupabaseQueries = TABLES.reduce((acc, table) => {
  acc[table] = []
  return acc
}, {})

const supabaseCallHistory = []

const getNestedValue = (obj, path) => {
  if (!obj || !path) return undefined
  return path.split('.').reduce((value, key) => (
    value == null ? undefined : value[key]
  ), obj)
}

vi.mock('../../../api/supabaseClient', () => {
  const createQueryBuilder = (tableName) => {
    const filters = []

    const execute = () => {
      let data = [...(mockSupabaseQueries[tableName] || [])]

      filters.forEach((filter) => {
        if (filter.type === 'eq') {
          data = data.filter(row => getNestedValue(row, filter.column) === filter.value)
        } else if (filter.type === 'in') {
          const values = Array.isArray(filter.value) ? filter.value : []
          data = data.filter(row => values.includes(getNestedValue(row, filter.column)))
        }
      })

      supabaseCallHistory.push({
        table: tableName,
        filters: filters.map(({ column, value, type }) => ({ column, value, type }))
      })

      return Promise.resolve({ data, error: null })
    }

    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((column, value) => {
        filters.push({ type: 'eq', column, value })
        return builder
      }),
      in: vi.fn((column, values) => {
        filters.push({ type: 'in', column, value: values })
        return builder
      }),
      order: vi.fn(() => builder),
      abortSignal: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn(() => execute().then((result) => ({
        data: result.data[0] || null,
        error: result.error
      }))),
      single: vi.fn(() => execute().then((result) => ({
        data: result.data[0] || null,
        error: result.error
      }))),
      then: (resolve, reject) => execute().then(resolve, reject),
      catch: (reject) => execute().catch(reject),
      finally: (callback) => execute().finally(callback)
    }

    return builder
  }

  return {
    supabase: {
      from: vi.fn((tableName) => createQueryBuilder(tableName)),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          getPublicUrl: vi.fn(),
          remove: vi.fn()
        }))
      }
    }
  }
})

describe('ContactForm - Business scoped behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    TABLES.forEach((table) => {
      mockSupabaseQueries[table] = []
    })
    supabaseCallHistory.length = 0
  })

  it('filters business-scoped lookups when creating a contact for a business', async () => {
    const businessId = 'business-456'

    render(
      <ContactForm
        contact={{ business_id: businessId }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await waitFor(() => {
      const jobTitleQuery = supabaseCallHistory.find(entry => entry.table === 'job_title')
      const statusQuery = supabaseCallHistory.find(entry => entry.table === 'workflow_status')
      const reasonQuery = supabaseCallHistory.find(entry => entry.table === 'reason_for_contact')

      expect(jobTitleQuery?.filters.some(filter => filter.column === 'business_id' && filter.value === businessId)).toBe(true)
      expect(statusQuery?.filters.some(filter => filter.column === 'business_id' && filter.value === businessId)).toBe(true)
      expect(reasonQuery?.filters.some(filter => filter.column === 'business_id' && filter.value === businessId)).toBe(true)
    })
  })

  it('updates internal business tracking when contact prop changes businesses', async () => {
    const { rerender } = render(
      <ContactForm
        contact={{ business_id: 'business-1' }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('contact-business-id').value).toBe('business-1')
    })

    rerender(
      <ContactForm
        contact={{ business_id: 'business-2' }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('contact-business-id').value).toBe('business-2')
    })
  })

  it('shows job title field while editing regardless of contact type', () => {
    const contact = {
      contact_id: 'contact-123',
      contact_type: 'vendor_client',
      job_title_id: 101,
      business_id: 'business-789'
    }

    render(<ContactForm contact={contact} onSave={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Job Title')).toBeTruthy()
  })

  it('falls back to tenant workflow statuses when business has none', async () => {
    const businessId = 'business-empty-statuses'

    // Seed only tenant/global statuses (no business_id match).
    mockSupabaseQueries.workflow_status = [
      { id: 1, workflow_status: 'Initial Contact', tenant_id: undefined, business_id: null }
    ]

    render(
      <ContactForm
        contact={{ business_id: businessId }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await waitFor(() => {
      const workflowQueries = supabaseCallHistory.filter(entry => entry.table === 'workflow_status')
      expect(workflowQueries.length).toBeGreaterThanOrEqual(2)

      // First try includes business_id filter
      expect(workflowQueries[0].filters.some(filter => filter.column === 'business_id' && filter.value === businessId)).toBe(true)

      // Second try omits business_id filter (tenant/global fallback)
      expect(workflowQueries[1].filters.some(filter => filter.column === 'business_id')).toBe(false)
    })
  })
})
