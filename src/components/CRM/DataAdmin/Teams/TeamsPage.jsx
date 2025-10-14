import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../../api/supabaseClient';
import { useTenant } from '../../../../contexts/TenantProvider';
import { useAuth } from '../../../../contexts/AuthProvider';
import TeamMembersModal from './TeamMembersModal';

export default function TeamsPage() {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { user } = useAuth();
  
  const [teams, setTeams] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  const [formData, setFormData] = useState({
    team_name: '',
    business_id: '',
    description: '',
    is_active: true
  });
  
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [businessFilter, setBusinessFilter] = useState('ALL');

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadBusinesses();
      loadTeams();
    }
  }, [tenant?.tenant_id]);

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('business_id, business_name')
        .eq('tenant_id', tenant.tenant_id)
        .eq('is_active', true)
        .order('business_name');

      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      console.error('Error loading businesses:', err);
      setError('Failed to load businesses');
    }
  };

  const loadTeams = async () => {
    if (!tenant?.tenant_id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          business:businesses(business_name),
          member_count:team_members(count)
        `)
        .eq('tenant_id', tenant.tenant_id)
        .order('team_name');

      if (error) throw error;
      
      const teamsWithCount = (data || []).map(team => ({
        ...team,
        member_count: team.member_count?.[0]?.count || 0,
        business_name: team.business?.business_name || 'All Businesses'
      }));
      
      setTeams(teamsWithCount);
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormVisible(false);
    setEditingTeam(null);
    setFormSubmitting(false);
    setFormData({
      team_name: '',
      business_id: '',
      description: '',
      is_active: true
    });
    setError('');
  };

  const handleCreateClick = () => {
    setEditingTeam(null);
    setFormData({
      team_name: '',
      business_id: '',
      description: '',
      is_active: true
    });
    setFormVisible(true);
  };

  const handleEditClick = (team) => {
    setEditingTeam(team);
    setFormData({
      team_name: team.team_name || '',
      business_id: team.business_id || '',
      description: team.description || '',
      is_active: team.is_active ?? true
    });
    setFormVisible(true);
  };

  const handleDeleteClick = async (team) => {
    const confirmMessage = `Delete team "${team.team_name}"? This will remove all team members. This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('team_id', team.team_id);

      if (error) throw error;
      await loadTeams();
    } catch (deleteError) {
      console.error('Failed to delete team:', deleteError);
      setError(deleteError.message || 'Unable to delete team');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!tenant?.tenant_id) return;

    setFormSubmitting(true);
    setError('');

    const payload = {
      team_name: formData.team_name.trim(),
      business_id: formData.business_id || null,
      description: formData.description.trim() || null,
      is_active: formData.is_active,
      tenant_id: tenant.tenant_id,
      updated_at: new Date().toISOString(),
      updated_by: user?.id
    };

    if (!editingTeam) {
      payload.created_at = new Date().toISOString();
      payload.created_by = user?.id;
    }

    try {
      if (editingTeam) {
        const { error: updateError } = await supabase
          .from('teams')
          .update(payload)
          .eq('team_id', editingTeam.team_id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('teams')
          .insert([payload]);

        if (insertError) throw insertError;
      }

      await loadTeams();
      resetForm();
    } catch (submitError) {
      console.error('Failed to save team:', submitError);
      setError(submitError.message || 'Unable to save team');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleManageMembers = (team) => {
    setSelectedTeam(team);
    setShowMembersModal(true);
  };

  const filteredTeams = useMemo(() => {
    let results = teams;

    if (statusFilter !== 'ALL') {
      const activeStatus = statusFilter === 'ACTIVE';
      results = results.filter((team) => team.is_active === activeStatus);
    }

    if (businessFilter !== 'ALL') {
      results = results.filter((team) => team.business_id === businessFilter);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      results = results.filter(
        (team) =>
          team.team_name?.toLowerCase().includes(search) ||
          team.description?.toLowerCase().includes(search) ||
          team.business_name?.toLowerCase().includes(search)
      );
    }

    return results;
  }, [teams, statusFilter, businessFilter, searchTerm]);

  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">🤝</div>
      <h3>No Teams</h3>
      <p>Create your first team to organize staff into leads and recruiters.</p>
      <button className="btn btn-primary" onClick={handleCreateClick}>
        + Add Team
      </button>
    </div>
  );

  return (
    <div className="data-table-container">
      <div style={{ marginBottom: '16px' }}>
        <button 
          className="btn btn-secondary"
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
      
      <div className="table-header">
        <h2>🤝 Teams</h2>
        <button className="btn btn-primary" onClick={handleCreateClick}>
          + Add Team
        </button>
      </div>

      {!formVisible && (
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center', 
          marginBottom: '16px',
          padding: '0 4px',
          flexWrap: 'wrap'
        }}>
          <div className="search-box" style={{ flex: '1 1 300px' }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '180px' }}
          >
            <option value="ALL">All Businesses</option>
            {businesses.map((biz) => (
              <option key={biz.business_id} value={biz.business_id}>
                {biz.business_name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '150px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {formVisible && (
        <div className="form-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
            {editingTeam ? 'Edit Team' : 'Create New Team'}
          </h3>
          <form onSubmit={handleFormSubmit}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label className="form-label">
                  Team Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter team name"
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                  required
                  disabled={formSubmitting}
                />
              </div>

              <div>
                <label className="form-label">Business (Optional)</label>
                <select
                  className="form-input"
                  value={formData.business_id}
                  onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                  disabled={formSubmitting}
                >
                  <option value="">All Businesses</option>
                  {businesses.map((biz) => (
                    <option key={biz.business_id} value={biz.business_id}>
                      {biz.business_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  placeholder="Enter team description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  disabled={formSubmitting}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    disabled={formSubmitting}
                  />
                  <span className="form-label" style={{ marginBottom: 0 }}>Active</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={formSubmitting}
              >
                {formSubmitting ? 'Saving...' : editingTeam ? 'Update Team' : 'Create Team'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={resetForm}
                disabled={formSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <div className="loading">Loading teams...</div>
        </div>
      ) : teams.length === 0 ? (
        renderEmptyState()
      ) : filteredTeams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No Matching Teams</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Team Name</th>
              <th style={{ width: '180px' }}>Business</th>
              <th style={{ width: '100px' }}>Members</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '130px' }}>Last Updated</th>
              <th style={{ width: '240px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((team) => (
              <tr key={team.team_id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{team.team_name}</div>
                  {team.description && (
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', lineHeight: '1.3' }}>
                      {team.description}
                    </div>
                  )}
                </td>
                <td>
                  <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                    {team.business_name}
                  </span>
                </td>
                <td>
                  <span className="status-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                    {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                  </span>
                </td>
                <td>
                  <span
                    className={`status-badge ${team.is_active ? 'initial-contact' : ''}`}
                    style={team.is_active ? { background: '#d1fae5', color: '#065f46' } : { background: '#fee2e2', color: '#991b1b' }}
                  >
                    {team.is_active ? '● Active' : '● Inactive'}
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: '#64748b' }}>
                  {team.updated_at ? new Date(team.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-sm btn-primary" 
                      onClick={() => handleManageMembers(team)}
                      style={{ minWidth: '80px' }}
                    >
                      👥 Members
                    </button>
                    <button 
                      className="btn btn-sm btn-secondary" 
                      onClick={() => handleEditClick(team)}
                      style={{ minWidth: '60px' }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteClick(team)}
                      style={{ minWidth: '70px' }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showMembersModal && selectedTeam && (
        <TeamMembersModal
          team={selectedTeam}
          onClose={() => {
            setShowMembersModal(false);
            setSelectedTeam(null);
            loadTeams(); // Refresh to update member counts
          }}
        />
      )}
    </div>
  );
}
