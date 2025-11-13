import { useState, useEffect, useMemo, useId } from 'react';
import { useTenant } from '../../../contexts/TenantProvider';
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../api/supabaseClient';
import ClientForm from './ClientForm';

const ClientsManager = () => {
  const { tenant } = useTenant();
  useAuth(); // Keep the hook call for authentication state
  
  const [clients, setClients] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [businessFilter, setBusinessFilter] = useState('all');
  
  const searchId = useId();
  const statusFilterId = useId();
  const businessFilterId = useId();

  // Load clients
  useEffect(() => {
    if (!tenant?.tenant_id) return;
    
    const loadClients = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('tenant_id', tenant.tenant_id)
          .order('created_at', { ascending: false })
          .abortSignal(AbortSignal.timeout(10000));

        if (error) throw error;
        
        setClients(data || []);
        setError(null);
      } catch (err) {
        console.error('Error loading clients:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [tenant?.tenant_id]);

  // Load businesses
  useEffect(() => {
    if (!tenant?.tenant_id) return;
    
    const loadBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('tenant_id', tenant.tenant_id);

        if (error) throw error;
        
        setBusinesses(data || []);
      } catch (err) {
        console.error('Error loading businesses:', err);
      }
    };

    loadBusinesses();
  }, [tenant?.tenant_id]);

  // Filter clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Filter by search term (client name)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(client =>
        client.client_name.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(client => client.status === statusFilter);
    }

    // Filter by business
    if (businessFilter && businessFilter !== 'all') {
      result = result.filter(client => client.business_id === businessFilter);
    }

    return result;
  }, [clients, searchTerm, statusFilter, businessFilter]);

  const handleAddClient = () => {
    setEditingClient(null);
    setShowModal(true);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  const handleDeleteClient = async (clientId) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('client_id', clientId);

      if (error) throw error;

      // Remove from local state
      setClients(clients.filter(c => c.client_id !== clientId));
    } catch (err) {
      console.error('Error deleting client:', err);
      alert('Failed to delete client: ' + err.message);
    }
  };

  const handleSubmitClient = async (clientData) => {
    try {
      if (editingClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            ...clientData,
            updated_at: new Date().toISOString(),
          })
          .eq('client_id', editingClient.client_id);

        if (error) throw error;

        // Update local state
        setClients(clients.map(c =>
          c.client_id === editingClient.client_id
            ? { ...c, ...clientData, updated_at: new Date().toISOString() }
            : c
        ));
      } else {
        // Insert new client
        const { data, error } = await supabase
          .from('clients')
          .insert({
            ...clientData,
            tenant_id: tenant.tenant_id,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // Add to local state
        setClients([data, ...clients]);
      }

      setShowModal(false);
      setEditingClient(null);
    } catch (err) {
      console.error('Error saving client:', err);
      alert('Failed to save client: ' + err.message);
      throw err;
    }
  };

  const handleCancelModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  if (loading) {
    return <div className="loading">Loading clients...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="clients-manager">
      <div className="header">
        <h1>Client Management</h1>
        <button onClick={handleAddClient} className="btn btn-primary">
          Add Client
        </button>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label htmlFor={searchId}>Search</label>
          <input
            id={searchId}
            type="text"
            placeholder="Search clients"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
            <option value="ACTIVE">ACTIVE</option>
            <option value="PROSPECT">PROSPECT</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
      </div>

      <div className="clients-table-container">
        <table className="clients-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Website</th>
              <th>Industry</th>
              <th>Revenue</th>
              <th>Status</th>
              <th>Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  No clients found
                </td>
              </tr>
            ) : (
              filteredClients.map(client => (
                <tr key={client.client_id}>
                  <td>{client.client_name}</td>
                  <td>
                    {client.website ? (
                      <a href={client.website} target="_blank" rel="noopener noreferrer">
                        {client.website}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{client.industry || '-'}</td>
                  <td>
                    {client.revenue
                      ? `$${client.revenue.toLocaleString()}`
                      : '-'}
                  </td>
                  <td>
                    <span className={`status-badge status-${client.status?.toLowerCase()}`}>
                      {client.status}
                    </span>
                  </td>
                  <td>
                    {client.primary_contact_email && (
                      <div>
                        <div>{client.primary_contact_email}</div>
                        {client.primary_contact_phone && (
                          <div className="phone">{client.primary_contact_phone}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="actions">
                    <button
                      onClick={() => handleEditClient(client)}
                      className="btn btn-sm btn-edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.client_id)}
                      className="btn btn-sm btn-delete"
                    >
                      Delete
                    </button>
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
              <h2>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button onClick={handleCancelModal} className="close-button">
                ×
              </button>
            </div>
            <ClientForm
              client={editingClient}
              onSubmit={handleSubmitClient}
              onCancel={handleCancelModal}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .clients-manager {
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
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
        }

        .filter-group input,
        .filter-group select {
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .clients-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow-x: auto;
        }

        .clients-table {
          width: 100%;
          border-collapse: collapse;
        }

        .clients-table th {
          background: #f9fafb;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .clients-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .clients-table tbody tr:hover {
          background: #f9fafb;
        }

        .no-data {
          text-align: center;
          padding: 40px !important;
          color: #6b7280;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-prospect {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-inactive {
          background: #f3f4f6;
          color: #374151;
        }

        .status-lost {
          background: #fee2e2;
          color: #991b1b;
        }

        .phone {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
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
          max-width: 800px;
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
  );
};

export default ClientsManager;
