import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PipelineAdmin from './PipelineAdmin'
import { supabase } from '../../../api/supabaseClient'

vi.mock('../../../api/supabaseClient')

vi.mock('../../../contexts/TenantProvider', () => ({
  useTenant: () => ({
    tenant: {
      tenant_id: 'tenant-1',
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

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const basePermissions = {
  can_view_all_records: true,
  can_view_subordinate_records: false,
  can_view_own_records: false,
  can_create_records: true,
  can_edit_all_records: true,
  can_edit_subordinate_records: false,
  can_edit_own_records: false,
  can_delete_all_records: true,
  can_delete_subordinate_records: false,
  can_delete_own_records: false,
}

const mockUsePermissions = vi.fn(() => ({
  loading: false,
  permissions: { ...basePermissions },
}))

vi.mock('../../../contexts/PermissionsProvider', () => ({
  usePermissions: () => mockUsePermissions(),
}))

const resolveSelectChain = ({ data }) => {
  const resolved = { data, error: null }
  return {
    select: () => ({
      eq: () => ({
        order: () => resolved,
      }),
    }),
  }
}

const resolveBusinessesChain = ({ data }) => {
  const resolved = { data, error: null }
  return {
    select: () => ({
      eq: () => ({
        order: () => ({
          order: () => ({
            abortSignal: () => resolved,
          }),
        }),
      }),
    }),
  }
}

describe('PipelineAdmin RBAC gating', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUsePermissions.mockReturnValue({
      loading: false,
      permissions: { ...basePermissions },
    })

    supabase.from = vi.fn((table) => {
      if (table === 'pipelines') {
        return resolveSelectChain({
          data: [
            {
              pipeline_id: 'pipe-1',
              tenant_id: 'tenant-1',
              name: 'Sales',
              icon: '📊',
              is_default: true,
              description: 'Sales pipeline',
              display_order: 0,
              business_id: 'biz-1',
            },
          ],
        })
      }

      if (table === 'pipeline_stages') {
        return resolveSelectChain({
          data: [
            {
              stage_id: 'stage-1',
              pipeline_id: 'pipe-1',
              name: 'New',
              description: '',
              color: '#6366F1',
              display_order: 0,
              is_final: false,
            },
          ],
        })
      }

      if (table === 'businesses') {
        return resolveBusinessesChain({
          data: [
            { business_id: 'biz-1', business_name: 'Default Biz', is_default: true, is_active: true },
          ],
        })
      }

      return resolveSelectChain({ data: [] })
    })
  })

  test('shows Create/Edit/Delete controls when permitted', async () => {
    render(
      <MemoryRouter>
        <PipelineAdmin />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ Create Pipeline/i })).toBeInTheDocument()
    })

    expect(screen.getByTitle('Edit pipeline')).toBeInTheDocument()
    expect(screen.getByTitle('Delete pipeline')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ Add Stage/i })).toBeInTheDocument()
  })

  test('hides Create/Edit/Delete controls when not permitted', async () => {
    mockUsePermissions.mockReturnValue({
      loading: false,
      permissions: {
        ...basePermissions,
        can_create_records: false,
        can_edit_all_records: false,
        can_delete_all_records: false,
      },
    })

    render(
      <MemoryRouter>
        <PipelineAdmin />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Pipeline Administration/i)).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /\+ Create Pipeline/i })).not.toBeInTheDocument()
    expect(screen.queryByTitle('Edit pipeline')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Delete pipeline')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ Add Stage/i })).not.toBeInTheDocument()
  })
})
