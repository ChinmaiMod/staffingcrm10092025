import { useState, useEffect, useMemo, useId } from 'react'
import { useTenant } from '../../../contexts/TenantProvider'
import { useAuth } from '../../../contexts/AuthProvider'
import { usePermissions } from '../../../contexts/PermissionsProvider'
import { supabase } from '../../../api/supabaseClient'
import { logger } from '../../../utils/logger'
import JobOrderForm from './JobOrderForm'

export default function JobOrdersManager() {
  const { tenant } = useTenant()
  useAuth()
  const { clientPermissions, loading: permissionsLoading } = usePermissions()
  const [jobOrders, setJobOrders] = useState([])
  const [clients, setClients] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingJobOrder, setEditingJobOrder] = useState(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [businessFilter, setBusinessFilter] = useState('all')
  
  const searchId = useId()
  const statusFilterId = useId()
  const priorityFilterId = useId()
  const clientFilterId = useId()
  const businessFilterId = useId()

  const canViewJobOrders = clientPermissions.canAccessJobOrders
  const canCreateJobOrders = clientPermissions.canCreateJobOrders
  const canEditJobOrders = clientPermissions.canEditJobOrders
  const canDeleteJobOrders = clientPermissions.canDeleteJobOrders

  useEffect(() => {
    if (!tenant?.tenant_id || !canViewJobOrders) {
      setJobOrders([])
      setLoading(false)
      return
    }

    loadJobOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.tenant_id, canViewJobOrders])

  useEffect(() => {
    if (!tenant?.tenant_id || !canViewJobOrders) return
    loadClients()
    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.tenant_id, canViewJobOrders])

  const loadJobOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: jobOrdersError } = await supabase
        .from('job_orders')
        .select(`
          *,
          clients:client_id (
            client_id,
            client_name
          ),
          businesses:business_id (
            business_id,
            business_name
          )
        `)
        .eq('tenant_id', tenant.tenant_id)
        .order('created_at', { ascending: false })

      if (jobOrdersError) {
        throw jobOrdersError
      }

      setJobOrders(data || [])
    } catch (err) {
      logger.error('Error loading job orders:', err)
      setError(err.message || 'Failed to load job orders')
    } finally {
      setLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const { data, error: clientsError } = await supabase
        .from('clients')
        .select('client_id, client_name')
        .eq('tenant_id', tenant.tenant_id)
        .order('client_name')

      if (clientsError) throw clientsError
      setClients(data || [])
    } catch (err) {
      logger.error('Error loading clients:', err)
    }
  }

  const loadBusinesses = async () => {
    try {
      const { data, error: businessesError } = await supabase
        .from('businesses')
        .select('business_id, business_name')
        .eq('tenant_id', tenant.tenant_id)
        .order('business_name')

      if (businessesError) throw businessesError
      setBusinesses(data || [])
    } catch (err) {
      logger.error('Error loading businesses:', err)
    }
  }

  const filteredJobOrders = useMemo(() => {
    let result = [...jobOrders]

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      result = result.filter(jo =>
        jo.job_title?.toLowerCase().includes(term) ||
        jo.clients?.client_name?.toLowerCase().includes(term) ||
        jo.location?.toLowerCase().includes(term) ||
        jo.industry?.toLowerCase().includes(term)
      )
    }

    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(jo => jo.status === statusFilter)
    }

    if (priorityFilter && priorityFilter !== 'all') {
      result = result.filter(jo => jo.priority === priorityFilter)
    }

    if (clientFilter && clientFilter !== 'all') {
      result = result.filter(jo => jo.client_id === clientFilter)
    }

    if (businessFilter && businessFilter !== 'all') {
      result = result.filter(jo => jo.business_id === businessFilter)
    }

    return result
  }, [jobOrders, searchTerm, statusFilter, priorityFilter, clientFilter, businessFilter])

  const handleAddJobOrder = () => {
    if (!canCreateJobOrders) {
      setError('You do not have permission to create job orders.')
      return
    }
    setEditingJobOrder(null)
    setShowModal(true)
  }

  const handleEditJobOrder = (jobOrder) => {
    if (!canEditJobOrders) {
      setError('You do not have permission to edit job orders.')
      return
    }
    setEditingJobOrder(jobOrder)
    setShowModal(true)
  }

  const handleDeleteJobOrder = async (jobOrderId) => {
    if (!canDeleteJobOrders) {
      setError('You do not have permission to delete job orders.')
      return
    }
    if (!confirm('Are you sure you want to delete this job order?')) return

    try {
      const { error } = await supabase
        .from('job_orders')
        .delete()
        .eq('job_order_id', jobOrderId)

      if (error) throw error

      setJobOrders(jobOrders.filter(jo => jo.job_order_id !== jobOrderId))
    } catch (err) {
      logger.error('Error deleting job order:', err)
      alert('Failed to delete job order: ' + err.message)
    }
  }

  const handleSubmitJobOrder = async (jobOrderData) => {
    try {
      if (editingJobOrder) {
        if (!canEditJobOrders) {
          setError('You do not have permission to edit job orders.')
          return
        }
        const { error } = await supabase
          .from('job_orders')
          .update({
            ...jobOrderData,
            updated_at: new Date().toISOString(),
          })
          .eq('job_order_id', editingJobOrder.job_order_id)

        if (error) throw error

        setJobOrders(jobOrders.map(jo =>
          jo.job_order_id === editingJobOrder.job_order_id
            ? { ...jo, ...jobOrderData, updated_at: new Date().toISOString() }
            : jo
        ))
      } else {
        if (!canCreateJobOrders) {
          setError('You do not have permission to create job orders.')
          return
        }
        const { data, error } = await supabase
          .from('job_orders')
          .insert({
            ...jobOrderData,
            tenant_id: tenant.tenant_id,
            created_at: new Date().toISOString(),
          })
          .select(`
            *,
            clients:client_id (client_id, client_name),
            businesses:business_id (business_id, business_name)
          `)
          .single()

        if (error) throw error

        setJobOrders([data, ...jobOrders])
      }

      setShowModal(false)
      setEditingJobOrder(null)
    } catch (err) {
      logger.error('Error saving job order:', err)
      alert('Failed to save job order: ' + err.message)
      throw err
    }
  }

  const handleCancelModal = () => {
    setShowModal(false)
    setEditingJobOrder(null)
  }

  if (permissionsLoading) {
    return <div className="loading">Loading permissions...</div>
  }

  if (!canViewJobOrders) {
    return (
      <div className="job-orders-manager">
        <div className="error">
          <h2>Access Restricted</h2>
          <p>You do not have permission to view job orders.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading">Loading job orders...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  return (
    <div className="job-orders-manager">
      <div className="header">
        <h1>Job Orders Management</h1>
        {canCreateJobOrders && (
          <button onClick={handleAddJobOrder} className="btn btn-primary">
            + New Job Order
          </button>
        )}
      </div>

      <div className="filters">
        <div className="filter-group">
          <label htmlFor={searchId}>Search</label>
          <input
            id={searchId}
            type="text"
            placeholder="Search by job title, client, location, industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor={clientFilterId}>Filter by Client</label>
          <select
            id={clientFilterId}
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="all">All Clients</option>
            {clients.map(client => (
              <option key={client.client_id} value={client.client_id}>
                {client.client_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor={businessFilterId}>Filter by Business</label>
          <select
            id={businessFilterId}
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
          >
            <option value="all">All Businesses</option>
            {businesses.map(business => (
              <option key={business.business_id} value={business.business_id}>
                {business.business_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor={statusFilterId}>Filter by Status</label>
          <select
            id={statusFilterId}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="OPEN">OPEN</option>
            <option value="FILLED">FILLED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="ON_HOLD">ON_HOLD</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor={priorityFilterId}>Filter by Priority</label>
          <select
            id={priorityFilterId}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
      </div>

      <div className="job-orders-table-container">
        <table className="job-orders-table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Client</th>
              <th>Business</th>
              <th>Location</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Openings</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobOrders.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || clientFilter !== 'all' || businessFilter !== 'all'
                    ? 'No job orders match your filters'
                    : 'No job orders found. Click &quot;+ New Job Order&quot; to create one.'}
                </td>
              </tr>
            ) : (
              filteredJobOrders.map(jobOrder => (
                <tr key={jobOrder.job_order_id}>
                  <td><strong>{jobOrder.job_title}</strong></td>
                  <td>{jobOrder.clients?.client_name || '-'}</td>
                  <td>{jobOrder.businesses?.business_name || '-'}</td>
                  <td>{jobOrder.location || '-'}</td>
                  <td>
                    <span className={`status-badge status-${jobOrder.status?.toLowerCase()}`}>
                      {jobOrder.status}
                    </span>
                  </td>
                  <td>
                    <span className={`priority-badge priority-${jobOrder.priority?.toLowerCase()}`}>
                      {jobOrder.priority || '-'}
                    </span>
                  </td>
                  <td>{jobOrder.filled_count || 0} / {jobOrder.openings_count || 1}</td>
                  <td>{new Date(jobOrder.created_at).toLocaleDateString()}</td>
                  <td className="actions">
                    {canEditJobOrders && (
                      <button
                        onClick={() => handleEditJobOrder(jobOrder)}
                        className="btn btn-sm btn-edit"
                      >
                        Edit
                      </button>
                    )}
                    {canDeleteJobOrders && (
                      <button
                        onClick={() => handleDeleteJobOrder(jobOrder.job_order_id)}
                        className="btn btn-sm btn-delete"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCancelModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingJobOrder ? 'Edit Job Order' : 'Add New Job Order'}</h2>
              <button onClick={handleCancelModal} className="close-button">
                ×
              </button>
            </div>
            <JobOrderForm
              jobOrder={editingJobOrder}
              clients={clients}
              businesses={businesses}
              onSubmit={handleSubmitJobOrder}
              onCancel={handleCancelModal}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .job-orders-manager {
          padding: 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .filter-group input,
        .filter-group select {
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .job-orders-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow-x: auto;
        }

        .job-orders-table {
          width: 100%;
          border-collapse: collapse;
        }

        .job-orders-table th {
          background: #f9fafb;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          font-size: 13px;
        }

        .job-orders-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }

        .job-orders-table tbody tr:hover {
          background: #f9fafb;
        }

        .no-data {
          text-align: center;
          padding: 40px !important;
          color: #6b7280;
        }

        .status-badge,
        .priority-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-draft {
          background: #f3f4f6;
          color: #374151;
        }

        .status-open {
          background: #d1fae5;
          color: #065f46;
        }

        .status-filled {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-closed {
          background: #e5e7eb;
          color: #4b5563;
        }

        .status-on_hold {
          background: #fef3c7;
          color: #92400e;
        }

        .status-cancelled {
          background: #fee2e2;
          color: #991b1b;
        }

        .priority-low {
          background: #dbeafe;
          color: #1e40af;
        }

        .priority-medium {
          background: #fef3c7;
          color: #92400e;
        }

        .priority-high {
          background: #fed7aa;
          color: #9a3412;
        }

        .priority-urgent {
          background: #fee2e2;
          color: #991b1b;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }

        .btn-edit {
          background: #3b82f6;
          color: white;
        }

        .btn-edit:hover {
          background: #2563eb;
        }

        .btn-delete {
          background: #ef4444;
          color: white;
        }

        .btn-delete:hover {
          background: #dc2626;
        }

        .loading,
        .error {
          padding: 40px;
          text-align: center;
          font-size: 16px;
          color: #6b7280;
        }

        .error {
          color: #ef4444;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 28px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #f3f4f6;
          color: #374151;
        }
      `}</style>
    </div>
  )
}
