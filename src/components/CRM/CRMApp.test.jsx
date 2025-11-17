import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import CRMApp from './CRMApp'

vi.mock('../../contexts/AuthProvider', () => ({
  useAuth: () => ({
    signOut: vi.fn().mockResolvedValue({}),
    profile: {
      email: 'test@example.com',
    },
  }),
}))

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
}

const mockUsePermissions = vi.fn(() => ({
  loading: false,
  clientPermissions: { ...baseClientPermissions },
}))

vi.mock('../../contexts/PermissionsProvider', () => ({
  usePermissions: () => mockUsePermissions(),
}))

vi.mock('./Dashboard/Dashboard', () => ({
  default: () => <div>Dashboard</div>,
}))
vi.mock('./Contacts/ContactsManager', () => ({
  default: () => <div>Contacts</div>,
}))
vi.mock('./Clients/ClientDashboard', () => ({
  default: () => <div>Client Dashboard</div>,
}))
vi.mock('./Clients/ClientsManager', () => ({
  default: () => <div>Clients Manager</div>,
}))
vi.mock('./Clients/JobOrdersManager', () => ({
  default: () => <div>Job Orders</div>,
}))
vi.mock('./Pipelines/PipelineView', () => ({
  default: () => <div>Pipelines</div>,
}))
vi.mock('./DataAdmin/DataAdministration', () => ({
  default: () => <div>Data Admin</div>,
}))
vi.mock('./Notifications/NotificationsManager', () => ({
  default: () => <div>Notifications</div>,
}))
vi.mock('./EmailTemplates/EmailTemplates', () => ({
  default: () => <div>Email Templates</div>,
}))
vi.mock('./Newsletter/Newsletter', () => ({
  default: () => <div>Newsletter</div>,
}))
vi.mock('../Feedback/Feedback', () => ({
  default: () => <div>Feedback</div>,
}))
vi.mock('../IssueReport/IssueReport', () => ({
  default: () => <div>Issue Report</div>,
}))

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/crm']}>
      <CRMApp />
    </MemoryRouter>
  )

describe('CRMApp RBAC navigation', () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue({
      loading: false,
      clientPermissions: { ...baseClientPermissions },
    })
  })

  test('shows Clients navigation when user has permission', () => {
    renderApp()
    expect(screen.getByText('Clients')).toBeInTheDocument()
  })

  test('hides Clients navigation when user lacks permission', () => {
    mockUsePermissions.mockReturnValue({
      loading: false,
      clientPermissions: {
        ...baseClientPermissions,
        canViewSection: false,
      },
    })

    renderApp()
    expect(screen.queryByText('Clients')).not.toBeInTheDocument()
  })

  test('hides restricted client submenu options', () => {
    mockUsePermissions.mockReturnValue({
      loading: false,
      clientPermissions: {
        ...baseClientPermissions,
        canAccessJobOrders: false,
      },
    })

    renderApp()
    const clientsMenu = screen.getByText('Clients')
    fireEvent.click(clientsMenu)

    expect(screen.queryByText('Job Orders')).not.toBeInTheDocument()
    expect(screen.getByText('Client Dashboard')).toBeInTheDocument()
  })
})
