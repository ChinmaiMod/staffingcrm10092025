import React, { useState, useEffect, useContext } from 'react';
import { TenantContext } from '../../../../contexts/TenantProvider';
import { AuthContext } from '../../../../contexts/AuthProvider';
import { supabase } from '../../../../api/supabaseClient';
import TeamMembersModal from './TeamMembersModal';

const TeamsPage = () => {
  const { currentBusiness } = useContext(TenantContext);
  const { user } = useContext(AuthContext);
  const [teams, setTeams] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [formData, setFormData] = useState({
    team_name: '',
    description: '',
    business_id: '',
    is_active: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBusinesses();
    loadTeams();
  }, [currentBusiness]);

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('business_id, business_name')
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
    try {
      setLoading(true);
      let query = supabase
        .from('teams')
        .select(`
          *,
          business:businesses(business_name),
          member_count:team_members(count)
        `)
        .order('team_name');

      if (currentBusiness?.business_id) {
        query = query.eq('business_id', currentBusiness.business_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const teamData = {
        ...formData,
        business_id: formData.business_id || null,
        created_by: editingTeam ? undefined : user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('team_id', editingTeam.team_id);

        if (error) throw error;
        setSuccess('Team updated successfully');
      } else {
        const { error } = await supabase
          .from('teams')
          .insert([teamData]);

        if (error) throw error;
        setSuccess('Team created successfully');
      }

      setFormData({
        team_name: '',
        description: '',
        business_id: '',
        is_active: true
      });
      setShowForm(false);
      setEditingTeam(null);
      loadTeams();
    } catch (err) {
      console.error('Error saving team:', err);
      setError(err.message || 'Failed to save team');
    }
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setFormData({
      team_name: team.team_name,
      description: team.description || '',
      business_id: team.business_id || '',
      is_active: team.is_active
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team? All team member assignments will also be deleted.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('team_id', teamId);

      if (error) throw error;
      setSuccess('Team deleted successfully');
      loadTeams();
    } catch (err) {
      console.error('Error deleting team:', err);
      setError('Failed to delete team');
    }
  };

  const handleManageMembers = (team) => {
    setSelectedTeam(team);
    setShowMembersModal(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTeam(null);
    setFormData({
      team_name: '',
      description: '',
      business_id: '',
      is_active: true
    });
    setError('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Teams Management</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Team
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {showForm && (
          <div className="mb-6 p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">
              {editingTeam ? 'Edit Team' : 'Create New Team'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.team_name}
                    onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter team name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business (Optional)
                  </label>
                  <select
                    value={formData.business_id}
                    onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Businesses</option>
                    {businesses.map((business) => (
                      <option key={business.business_id} value={business.business_id}>
                        {business.business_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter team description"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Business
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Members
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teams.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No teams found. Click "Add Team" to create one.
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr key={team.team_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {team.team_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {team.business?.business_name || 'All Businesses'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {team.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleManageMembers(team)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {team.member_count?.[0]?.count || 0} members
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      team.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {team.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(team)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(team.team_id)}
                      className="text-red-600 hover:text-red-900"
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

      {showMembersModal && selectedTeam && (
        <TeamMembersModal
          team={selectedTeam}
          onClose={() => {
            setShowMembersModal(false);
            setSelectedTeam(null);
            loadTeams(); // Reload to update member counts
          }}
        />
      )}
    </div>
  );
};

export default TeamsPage;
