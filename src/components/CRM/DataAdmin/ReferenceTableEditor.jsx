import React, { useState, useEffect } from 'react'

export default function ReferenceTableEditor({ table, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [newItemValue, setNewItemValue] = useState('')

  useEffect(() => {
    loadItems()
  }, [table.id])

  const loadItems = async () => {
    try {
      setLoading(true)
      // TODO: Load from API
      // For now, mock data
      const mockData = {
        visa_status: ['F1', 'OPT', 'STEM OPT', 'H1B', 'H4', 'H4 EAD', 'GC EAD', 'L1B', 'L2S', 'B1/B2', 'J1', 'TN', 'E3', 'GC', 'USC'],
        statuses: ['Initial Contact', 'Spoke to candidate', 'Resume needs to be prepared', 'Resume prepared and sent for review', 'Assigned to Recruiter', 'Recruiter started marketing', 'Placed into Job'],
        role_types: ['Remote', 'Hybrid Local', 'Onsite Local', 'Open to Relocate'],
        countries: ['USA', 'India'],
        years_experience: ['0', '1 to 3', '4 to 6', '7 to 9', '10 -15', '15+'],
        referral_sources: ['FB', 'Google', 'Friend'],
      }
      
      const data = mockData[table.id] || []
      setItems(data.map((value, index) => ({ id: index + 1, value, is_active: true })))
      setLoading(false)
    } catch (err) {
      alert('Error loading data: ' + err.message)
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newItemValue.trim()) return

    try {
      // TODO: API call to create
      const newItem = {
        id: Date.now(),
        value: newItemValue,
        is_active: true,
      }
      setItems(prev => [...prev, newItem])
      setNewItemValue('')
    } catch (err) {
      alert('Error adding item: ' + err.message)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setEditValue(item.value)
  }

  const handleSaveEdit = async (id) => {
    if (!editValue.trim()) return

    try {
      // TODO: API call to update
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, value: editValue } : item
      ))
      setEditingId(null)
      setEditValue('')
    } catch (err) {
      alert('Error updating item: ' + err.message)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleToggleActive = async (id) => {
    try {
      // TODO: API call to toggle
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, is_active: !item.is_active } : item
      ))
    } catch (err) {
      alert('Error toggling status: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      // TODO: API call to delete
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      alert('Error deleting item: ' + err.message)
    }
  }

  if (loading) {
    return <div className="loading">Loading {table.label}...</div>
  }

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h2>{table.icon} {table.label}</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            placeholder="New item value..."
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '250px' }}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn btn-primary" onClick={handleAdd}>
            + Add New
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No Items</h3>
          <p>Add your first {table.label.toLowerCase()} item</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>Value</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '200px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(item.id)}
                      autoFocus
                    />
                  ) : (
                    <span style={{ opacity: item.is_active ? 1 : 0.5 }}>
                      {item.value}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${item.is_active ? 'initial-contact' : ''}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {editingId === item.id ? (
                      <>
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleSaveEdit(item.id)}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleToggleActive(item.id)}
                        >
                          {item.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
