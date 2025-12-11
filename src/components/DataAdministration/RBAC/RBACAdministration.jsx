import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../api/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import './RBACAdministration.css';

/**
 * RBAC Administration Component
 * Comprehensive interface for managing Role-Based Access Control
 * Only accessible by CEO/Super Admin (role_level = 5)
 */
function RBACAdministration() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('permissions-matrix');
  const [roles, setRoles] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Menu item form state
  const [showMenuItemModal, setShowMenuItemModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuItemForm, setMenuItemForm] = useState({
    item_code: '',
    item_name: '',
    item_path: '',
    icon: '',
    display_order: 1,
    is_active: true
  });

  const loadRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('is_active', true)
      .order('role_level', { ascending: false });

    if (error) throw error;
    return data || [];
  }, []);

  const loadMenuItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('display_order');

    if (error) throw error;
    return data || [];
  }, []);

  const loadRolePermissions = useCallback(async () => {
    const { data, error } = await supabase
      .from('role_menu_permissions')
      .select('*');

    if (error) throw error;
    
    // Transform into a map: { roleId: { menuItemId: canAccess } }
    const permissionsMap = {};
    (data || []).forEach(p => {
      if (!permissionsMap[p.role_id]) {
        permissionsMap[p.role_id] = {};
      }
      permissionsMap[p.role_id][p.menu_item_id] = p.can_access;
    });
    return permissionsMap;
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [rolesData, menuItemsData, permissionsData] = await Promise.all([
        loadRoles(),
        loadMenuItems(),
        loadRolePermissions()
      ]);

      setRoles(rolesData);
      setMenuItems(menuItemsData);
      setRolePermissions(permissionsData);
    } catch (err) {
      console.error('Error loading RBAC data:', err);
      setError('Failed to load RBAC data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [loadRoles, loadMenuItems, loadRolePermissions]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const getRoleLevelName = (level) => {
    const names = {
      1: 'Level 1 - Read Only',
      2: 'Level 2 - Recruiter',
      3: 'Level 3 - Lead',
      4: 'Level 4 - Manager',
      5: 'Level 5 - CEO/Admin'
    };
    return names[level] || `Level ${level}`;
  };

  const getRoleLevelColor = (level) => {
    const colors = {
      1: '#94a3b8',
      2: '#60a5fa',
      3: '#34d399',
      4: '#fbbf24',
      5: '#f472b6'
    };
    return colors[level] || '#94a3b8';
  };

  const handlePermissionToggle = async (roleId, menuItemId) => {
    try {
      setSaving(true);
      setError(null);

      const currentValue = rolePermissions[roleId]?.[menuItemId] || false;
      const newValue = !currentValue;

      // Check if permission record exists
      const { data: existing } = await supabase
        .from('role_menu_permissions')
        .select('permission_id')
        .eq('role_id', roleId)
        .eq('menu_item_id', menuItemId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('role_menu_permissions')
          .update({ can_access: newValue })
          .eq('permission_id', existing.permission_id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('role_menu_permissions')
          .insert({
            role_id: roleId,
            menu_item_id: menuItemId,
            can_access: newValue
          });

        if (error) throw error;
      }

      // Update local state
      setRolePermissions(prev => ({
        ...prev,
        [roleId]: {
          ...prev[roleId],
          [menuItemId]: newValue
        }
      }));

      setSuccess('Permission updated successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error updating permission:', err);
      setError('Failed to update permission: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGrantAllForRole = async (roleId) => {
    try {
      setSaving(true);
      setError(null);

      for (const menuItem of menuItems) {
        if (!rolePermissions[roleId]?.[menuItem.menu_item_id]) {
          const { data: existing } = await supabase
            .from('role_menu_permissions')
            .select('permission_id')
            .eq('role_id', roleId)
            .eq('menu_item_id', menuItem.menu_item_id)
            .single();

          if (existing) {
            await supabase
              .from('role_menu_permissions')
              .update({ can_access: true })
              .eq('permission_id', existing.permission_id);
          } else {
            await supabase
              .from('role_menu_permissions')
              .insert({
                role_id: roleId,
                menu_item_id: menuItem.menu_item_id,
                can_access: true
              });
          }
        }
      }

      // Reload permissions
      const newPermissions = await loadRolePermissions();
      setRolePermissions(newPermissions);

      setSuccess('All permissions granted for this role');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error granting all permissions:', err);
      setError('Failed to grant permissions: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeAllForRole = async (roleId) => {
    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('role_menu_permissions')
        .update({ can_access: false })
        .eq('role_id', roleId);

      if (error) throw error;

      // Reload permissions
      const newPermissions = await loadRolePermissions();
      setRolePermissions(newPermissions);

      setSuccess('All permissions revoked for this role');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error revoking permissions:', err);
      setError('Failed to revoke permissions: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Menu Items Management
  const openCreateMenuItemModal = () => {
    setEditingMenuItem(null);
    setMenuItemForm({
      item_code: '',
      item_name: '',
      item_path: '',
      icon: '',
      display_order: menuItems.length + 1,
      is_active: true
    });
    setShowMenuItemModal(true);
  };

  const openEditMenuItemModal = (item) => {
    setEditingMenuItem(item);
    setMenuItemForm({
      item_code: item.item_code,
      item_name: item.item_name,
      item_path: item.item_path || '',
      icon: item.icon || '',
      display_order: item.display_order || 1,
      is_active: item.is_active
    });
    setShowMenuItemModal(true);
  };

  const handleMenuItemFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMenuItemForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmitMenuItem = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const menuItemData = {
        item_code: menuItemForm.item_code.toUpperCase().replace(/\s+/g, '_'),
        item_name: menuItemForm.item_name,
        item_path: menuItemForm.item_path || null,
        icon: menuItemForm.icon || null,
        display_order: parseInt(menuItemForm.display_order, 10),
        is_active: menuItemForm.is_active
      };

      if (editingMenuItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(menuItemData)
          .eq('menu_item_id', editingMenuItem.menu_item_id);

        if (error) throw error;
        setSuccess('Menu item updated successfully');
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(menuItemData);

        if (error) throw error;
        setSuccess('Menu item created successfully');
      }

      setShowMenuItemModal(false);
      loadAllData();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error saving menu item:', err);
      setError('Failed to save menu item: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenuItem = async (item) => {
    if (item.is_system_item) {
      setError('Cannot delete system menu items');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the menu item "${item.item_name}"?`)) {
      return;
    }

    try {
      setSaving(true);

      // First delete all permissions for this menu item
      await supabase
        .from('role_menu_permissions')
        .delete()
        .eq('menu_item_id', item.menu_item_id);

      // Then delete the menu item
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('menu_item_id', item.menu_item_id);

      if (error) throw error;

      setSuccess('Menu item deleted successfully');
      loadAllData();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error deleting menu item:', err);
      setError('Failed to delete menu item: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleMenuItemActive = async (item) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('menu_items')
        .update({ is_active: !item.is_active })
        .eq('menu_item_id', item.menu_item_id);

      if (error) throw error;

      loadAllData();
      setSuccess(`Menu item ${!item.is_active ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error toggling menu item:', err);
      setError('Failed to update menu item: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading RBAC configuration...</div>;
  }

  return (
    <div className="rbac-administration">
      <div style={{ marginBottom: '16px' }}>
        <button 
          className="btn-secondary"
          onClick={() => navigate('/crm/data-admin')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '14px',
            padding: '8px 16px'
          }}
        >
          ← Back to All Tables
        </button>
      </div>

      <div className="page-header">
        <div>
          <h1>🛡️ Access Control</h1>
          <p className="page-description">
            Manage Role-Based Access Control - Configure which menu items and features each role can access
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>✅ {success}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="rbac-tabs">
        <button
          className={`rbac-tab ${activeTab === 'permissions-matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions-matrix')}
        >
          📊 Permissions Matrix
        </button>
        <button
          className={`rbac-tab ${activeTab === 'menu-items' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu-items')}
        >
          📋 Menu Items
        </button>
        <button
          className={`rbac-tab ${activeTab === 'role-summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('role-summary')}
        >
          📈 Role Summary
        </button>
      </div>

      {/* Permissions Matrix Tab */}
      {activeTab === 'permissions-matrix' && (
        <div className="permissions-matrix-section">
          <div className="section-header">
            <h2>Role Permissions Matrix</h2>
            <p>Click on cells to toggle access permissions for each role</p>
          </div>

          <div className="matrix-container">
            <table className="permissions-matrix">
              <thead>
                <tr>
                  <th className="menu-item-header">Menu Item</th>
                  {roles.map(role => (
                    <th key={role.role_id} className="role-header">
                      <div className="role-header-content">
                        <span 
                          className="role-level-badge"
                          style={{ backgroundColor: getRoleLevelColor(role.role_level) }}
                        >
                          L{role.role_level}
                        </span>
                        <span className="role-name">{role.role_name}</span>
                        <div className="role-actions-mini">
                          <button 
                            className="btn-mini btn-grant"
                            onClick={() => handleGrantAllForRole(role.role_id)}
                            title="Grant all permissions"
                            disabled={saving}
                          >
                            ✓ All
                          </button>
                          <button 
                            className="btn-mini btn-revoke"
                            onClick={() => handleRevokeAllForRole(role.role_id)}
                            title="Revoke all permissions"
                            disabled={saving}
                          >
                            ✗ None
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menuItems.filter(m => m.is_active).map(menuItem => (
                  <tr key={menuItem.menu_item_id}>
                    <td className="menu-item-cell">
                      <div className="menu-item-info">
                        <span className="menu-icon">{menuItem.icon || '📄'}</span>
                        <div>
                          <div className="menu-name">{menuItem.item_name}</div>
                          <div className="menu-path">{menuItem.item_path || 'No path'}</div>
                        </div>
                      </div>
                    </td>
                    {roles.map(role => {
                      const hasAccess = rolePermissions[role.role_id]?.[menuItem.menu_item_id] || false;
                      return (
                        <td 
                          key={role.role_id} 
                          className={`permission-cell ${hasAccess ? 'granted' : 'denied'}`}
                          onClick={() => !saving && handlePermissionToggle(role.role_id, menuItem.menu_item_id)}
                          title={`Click to ${hasAccess ? 'revoke' : 'grant'} access`}
                        >
                          <span className="permission-indicator">
                            {hasAccess ? '✅' : '❌'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="matrix-legend">
            <h4>Legend:</h4>
            <div className="legend-items">
              <div className="legend-item">
                <span className="permission-indicator">✅</span>
                <span>Access Granted</span>
              </div>
              <div className="legend-item">
                <span className="permission-indicator">❌</span>
                <span>Access Denied</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items Tab */}
      {activeTab === 'menu-items' && (
        <div className="menu-items-section">
          <div className="section-header">
            <h2>Menu Items Management</h2>
            <button className="btn-primary" onClick={openCreateMenuItemModal}>
              ➕ Add Menu Item
            </button>
          </div>

          <div className="menu-items-grid">
            {menuItems.map(item => (
              <div key={item.menu_item_id} className={`menu-item-card ${!item.is_active ? 'inactive' : ''}`}>
                <div className="menu-item-card-header">
                  <div className="menu-item-icon-large">{item.icon || '📄'}</div>
                  <div className="menu-item-details">
                    <h3>{item.item_name}</h3>
                    <span className="menu-item-code">{item.item_code}</span>
                  </div>
                  <div className="menu-item-badges">
                    {item.is_system_item && <span className="badge badge-system">System</span>}
                    <span className={`badge ${item.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="menu-item-info-row">
                  <span className="label">Path:</span>
                  <span className="value">{item.item_path || 'N/A'}</span>
                </div>
                
                <div className="menu-item-info-row">
                  <span className="label">Order:</span>
                  <span className="value">{item.display_order}</span>
                </div>

                <div className="menu-item-info-row">
                  <span className="label">Roles with Access:</span>
                  <span className="value">
                    {roles.filter(r => rolePermissions[r.role_id]?.[item.menu_item_id]).length} / {roles.length}
                  </span>
                </div>

                <div className="menu-item-actions">
                  <button 
                    className="btn-icon"
                    onClick={() => openEditMenuItemModal(item)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button 
                    className={`btn-icon ${item.is_active ? 'btn-warning' : 'btn-success'}`}
                    onClick={() => toggleMenuItemActive(item)}
                    title={item.is_active ? 'Deactivate' : 'Activate'}
                    disabled={saving}
                  >
                    {item.is_active ? '🚫' : '✅'}
                  </button>
                  {!item.is_system_item && (
                    <button 
                      className="btn-icon btn-danger"
                      onClick={() => handleDeleteMenuItem(item)}
                      title="Delete"
                      disabled={saving}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Summary Tab */}
      {activeTab === 'role-summary' && (
        <div className="role-summary-section">
          <div className="section-header">
            <h2>Role Summary & Statistics</h2>
            <p>Overview of all roles and their permission levels</p>
          </div>

          <div className="role-summary-grid">
            {roles.map(role => {
              const accessibleMenus = menuItems.filter(m => 
                m.is_active && rolePermissions[role.role_id]?.[m.menu_item_id]
              );
              const totalActiveMenus = menuItems.filter(m => m.is_active).length;
              const accessPercentage = totalActiveMenus > 0 
                ? Math.round((accessibleMenus.length / totalActiveMenus) * 100) 
                : 0;

              return (
                <div key={role.role_id} className="role-summary-card">
                  <div className="role-summary-header">
                    <div 
                      className="role-level-indicator"
                      style={{ backgroundColor: getRoleLevelColor(role.role_level) }}
                    >
                      {role.role_level}
                    </div>
                    <div className="role-summary-title">
                      <h3>{role.role_name}</h3>
                      <span className="role-code">{role.role_code}</span>
                    </div>
                  </div>

                  <p className="role-description">{role.description}</p>

                  <div className="access-progress">
                    <div className="access-label">
                      <span>Menu Access</span>
                      <span>{accessibleMenus.length}/{totalActiveMenus} ({accessPercentage}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${accessPercentage}%`,
                          backgroundColor: getRoleLevelColor(role.role_level)
                        }}
                      />
                    </div>
                  </div>

                  <div className="role-capabilities">
                    <h4>Capabilities:</h4>
                    <div className="capability-tags">
                      {role.can_create_records && <span className="cap-tag create">Create</span>}
                      {role.can_edit_own_records && <span className="cap-tag edit">Edit Own</span>}
                      {role.can_edit_subordinate_records && <span className="cap-tag edit">Edit Team</span>}
                      {role.can_edit_all_records && <span className="cap-tag edit-all">Edit All</span>}
                      {role.can_delete_own_records && <span className="cap-tag delete">Delete Own</span>}
                      {role.can_delete_all_records && <span className="cap-tag delete-all">Delete All</span>}
                      {role.can_view_all_records && <span className="cap-tag view">View All</span>}
                      {role.can_assign_roles && <span className="cap-tag admin">Assign Roles</span>}
                      {role.can_manage_users && <span className="cap-tag admin">Manage Users</span>}
                      {role.can_manage_businesses && <span className="cap-tag admin">Manage Businesses</span>}
                      {role.can_manage_roles && <span className="cap-tag admin">Manage Roles</span>}
                    </div>
                  </div>

                  <div className="accessible-menus">
                    <h4>Accessible Menus:</h4>
                    <div className="menu-tags">
                      {accessibleMenus.length > 0 ? (
                        accessibleMenus.map(menu => (
                          <span key={menu.menu_item_id} className="menu-tag">
                            {menu.icon} {menu.item_name}
                          </span>
                        ))
                      ) : (
                        <span className="no-access">No menu access configured</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Menu Item Modal */}
      {showMenuItemModal && (
        <div className="modal-overlay" onClick={() => setShowMenuItemModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMenuItem ? '✏️ Edit Menu Item' : '➕ Add Menu Item'}</h2>
              <button className="btn-close" onClick={() => setShowMenuItemModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmitMenuItem}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="item_name">Item Name *</label>
                  <input
                    type="text"
                    id="item_name"
                    name="item_name"
                    value={menuItemForm.item_name}
                    onChange={handleMenuItemFormChange}
                    required
                    placeholder="e.g., Dashboard"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="item_code">Item Code *</label>
                  <input
                    type="text"
                    id="item_code"
                    name="item_code"
                    value={menuItemForm.item_code}
                    onChange={handleMenuItemFormChange}
                    required
                    placeholder="e.g., DASHBOARD"
                    disabled={editingMenuItem?.is_system_item}
                  />
                  <small>Uppercase letters and underscores only</small>
                </div>

                <div className="form-group">
                  <label htmlFor="item_path">Path</label>
                  <input
                    type="text"
                    id="item_path"
                    name="item_path"
                    value={menuItemForm.item_path}
                    onChange={handleMenuItemFormChange}
                    placeholder="e.g., /dashboard"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="icon">Icon</label>
                  <input
                    type="text"
                    id="icon"
                    name="icon"
                    value={menuItemForm.icon}
                    onChange={handleMenuItemFormChange}
                    placeholder="e.g., dashboard or 📊"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="display_order">Display Order</label>
                  <input
                    type="number"
                    id="display_order"
                    name="display_order"
                    value={menuItemForm.display_order}
                    onChange={handleMenuItemFormChange}
                    min="1"
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={menuItemForm.is_active}
                      onChange={handleMenuItemFormChange}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowMenuItemModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingMenuItem ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RBACAdministration;
