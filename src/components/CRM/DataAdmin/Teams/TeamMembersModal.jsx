import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthProvider';
import { useTenant } from '../../../../contexts/TenantProvider';
import { supabase } from '../../../../api/supabaseClient';

const TeamMembersModal = ({ team, onClose }) => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [members, setMembers] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedRole, setSelectedRole] = useState('RECRUITER');
  const [error, setError] = useState('');

  useEffect(() => {
    if (team?.team_id && tenant?.tenant_id) {
      loadMembers();
      loadAvailableStaff();
    }
  }, [team?.team_id, tenant?.tenant_id]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          staff:internal_staff(
            staff_id,
            first_name,
            last_name,
            email,
            position
          )
        `)
        .eq('team_id', team.team_id)
        .eq('is_active', true)
        .order('role', { ascending: false }) // LEAD first, then RECRUITER
        .order('assigned_at');

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error loading team members:', err);
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStaff = async () => {
    if (!tenant?.tenant_id) return;
    
    try {
      const { data, error } = await supabase
        .from('internal_staff')
        .select('staff_id, first_name, last_name, email, position')
        .eq('tenant_id', tenant.tenant_id)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setAvailableStaff(data || []);
    } catch (err) {
      console.error('Error loading staff:', err);
      setError('Failed to load available staff');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedStaff) {
      setError('Please select a staff member');
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .insert([{
          team_id: team.team_id,
          staff_id: selectedStaff,
          role: selectedRole,
          assigned_by: user?.id,
          is_active: true
        }]);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('This staff member is already assigned to this team');
        }
        throw error;
      }

      setSelectedStaff('');
      setSelectedRole('RECRUITER');
      setShowAddForm(false);
      await loadMembers();
      await loadAvailableStaff();
    } catch (err) {
      console.error('Error adding team member:', err);
      setError(err.message || 'Failed to add team member');
    }
  };

  const handleRemoveMember = async (memberId, staffName) => {
    if (!window.confirm(`Are you sure you want to remove ${staffName} from this team?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('member_id', memberId);

      if (error) throw error;
      await loadMembers();
      await loadAvailableStaff();
    } catch (err) {
      console.error('Error removing team member:', err);
      setError('Failed to remove team member');
    }
  };

  const handleUpdateRole = async (memberId, newRole, staffName) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('member_id', memberId);

      if (error) throw error;
      await loadMembers();
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update role');
    }
  };

  // Filter out staff already in the team
  const assignedStaffIds = members.map(m => m.staff_id);
  const filteredAvailableStaff = availableStaff.filter(
    staff => !assignedStaffIds.includes(staff.staff_id)
  );

  // Group members by role for better display
  const leads = members.filter(m => m.role === 'LEAD');
  const recruiters = members.filter(m => m.role === 'RECRUITER');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-800">
              Team Members - {team.team_name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Add Member Button */}
          {!showAddForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Team Member
              </button>
            </div>
          )}

          {/* Add Member Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-lg font-semibold mb-4">Add Team Member</h4>
              <form onSubmit={handleAddMember}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Staff Member *
                    </label>
                    <select
                      required
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Staff Member</option>
                      {filteredAvailableStaff.map((staff) => (
                        <option key={staff.staff_id} value={staff.staff_id}>
                          {staff.first_name} {staff.last_name} - {staff.position || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      required
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="RECRUITER">Recruiter</option>
                      <option value="LEAD">Lead</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Member
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedStaff('');
                      setSelectedRole('RECRUITER');
                      setError('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Members List */}
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No team members yet. Click "Add Team Member" to get started.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Team Leads */}
              {leads.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    Team Leads ({leads.length})
                  </h4>
                  <div className="space-y-2">
                    {leads.map((member) => (
                      <div
                        key={member.member_id}
                        className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {member.staff?.first_name} {member.staff?.last_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {member.staff?.position || 'N/A'} • {member.staff?.email}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Added: {new Date(member.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                            LEAD
                          </span>
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(
                              member.member_id, 
                              e.target.value,
                              `${member.staff?.first_name} ${member.staff?.last_name}`
                            )}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="LEAD">Lead</option>
                            <option value="RECRUITER">Recruiter</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(
                              member.member_id,
                              `${member.staff?.first_name} ${member.staff?.last_name}`
                            )}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recruiters */}
              {recruiters.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    Recruiters ({recruiters.length})
                  </h4>
                  <div className="space-y-2">
                    {recruiters.map((member) => (
                      <div
                        key={member.member_id}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {member.staff?.first_name} {member.staff?.last_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {member.staff?.position || 'N/A'} • {member.staff?.email}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Added: {new Date(member.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                            RECRUITER
                          </span>
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(
                              member.member_id, 
                              e.target.value,
                              `${member.staff?.first_name} ${member.staff?.last_name}`
                            )}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="RECRUITER">Recruiter</option>
                            <option value="LEAD">Lead</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(
                              member.member_id,
                              `${member.staff?.first_name} ${member.staff?.last_name}`
                            )}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total Members: {members.length} ({leads.length} Lead{leads.length !== 1 ? 's' : ''}, {recruiters.length} Recruiter{recruiters.length !== 1 ? 's' : ''})
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamMembersModal;
