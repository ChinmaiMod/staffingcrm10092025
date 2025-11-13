import { useState, useEffect } from 'react'
import { useTenant } from '../../../contexts/TenantProvider'
import { supabase } from '../../../supabaseClient'
import logger from '../../../logger'

export default function JobOrdersManager() {
  const { tenant } = useTenant()
  const [jobOrders, setJobOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!tenant?.tenant_id) {
      setJobOrders([])
      setLoading(false)
      return
    }

    loadJobOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.tenant_id])

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

  if (loading) {
    return (
      <div className="crm-content">
        <div className="page-header">
          <h1>Job Orders</h1>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Loading job orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="crm-content">
        <div className="page-header">
          <h1>Job Orders</h1>
        </div>
        <div style={{ padding: '20px' }}>
          <div className="error-message">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="crm-content">
      <div className="page-header">
        <h1>Job Orders</h1>
        <button className="btn btn-primary">+ New Job Order</button>
      </div>

      {jobOrders.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>No job orders found. Click &quot;+ New Job Order&quot; to create one.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job Order ID</th>
                <th>Client</th>
                <th>Job Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobOrders.map((jobOrder) => (
                <tr key={jobOrder.job_order_id}>
                  <td>{jobOrder.job_order_id}</td>
                  <td>{jobOrder.clients?.client_name || 'N/A'}</td>
                  <td>{jobOrder.job_title || 'N/A'}</td>
                  <td>{jobOrder.status || 'N/A'}</td>
                  <td>{jobOrder.priority || 'N/A'}</td>
                  <td>{new Date(jobOrder.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
