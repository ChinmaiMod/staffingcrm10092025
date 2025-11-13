import { useState, useEffect, useId } from 'react';
import { useTenant } from '../../../contexts/TenantProvider';
import { supabase } from '../../../api/supabaseClient';

const ClientDashboard = () => {
  const { tenant } = useTenant();
  
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({
    clientsThisWeek: 0,
    clientsThisMonth: 0,
    clientsCustom: 0,
    jobOrders: 0,
    candidatesApplied: 0,
    openPositions: 0,
    filledPositions: 0,
    revenueThisMonth: 0,
    revenueCustom: 0,
    topRecruiters: [],
    teamPerformance: [],
  });
  
  const [businessFilter, setBusinessFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const businessFilterId = useId();
  const teamFilterId = useId();
  const startDateId = useId();
  const endDateId = useId();

  // Load businesses and teams
  useEffect(() => {
    if (!tenant?.tenant_id) return;
    
    const loadOptions = async () => {
      try {
        const [businessesResult, teamsResult] = await Promise.all([
          supabase.from('businesses').select('*').eq('tenant_id', tenant.tenant_id),
          supabase.from('teams').select('*').eq('tenant_id', tenant.tenant_id),
        ]);

        setBusinesses(businessesResult.data || []);
        setTeams(teamsResult.data || []);
      } catch (err) {
        console.error('Error loading options:', err);
      }
    };

    loadOptions();
  }, [tenant?.tenant_id]);

  // Load dashboard statistics
  useEffect(() => {
    if (!tenant?.tenant_id) return;
    
    const loadStats = async () => {
      try {
        setLoading(true);
        
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Fetch all clients first
        const allClientsResult = await supabase
          .from('clients')
          .select('*')
          .eq('tenant_id', tenant.tenant_id);
        
        const allClients = allClientsResult.data || [];
        
        // Filter clients by business if needed
        const filteredClients = businessFilter && businessFilter !== 'all'
          ? allClients.filter(c => c.business_id === businessFilter)
          : allClients;
        
        // Clients this week (filter in JS)
        const clientsThisWeek = filteredClients.filter(c => 
          new Date(c.created_at) >= startOfWeek
        );
        
        // Clients this month (filter in JS)
        const clientsThisMonth = allClients.filter(c => 
          new Date(c.created_at) >= startOfMonth
        );
        
        // Clients custom date range (filter in JS)
        let clientsCustom = [];
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          clientsCustom = allClients.filter(c => {
            const createdDate = new Date(c.created_at);
            return createdDate >= start && createdDate <= end;
          });
        }

        // Fetch all job orders
        const allJobOrdersResult = await supabase
          .from('job_orders')
          .select('*')
          .eq('tenant_id', tenant.tenant_id);
        
        const allJobOrders = allJobOrdersResult.data || [];
        
        // Filter by business if needed
        const filteredJobOrders = businessFilter && businessFilter !== 'all'
          ? allJobOrders.filter(j => j.business_id === businessFilter)
          : allJobOrders;

        // Count open and filled positions
        const openPositions = filteredJobOrders
          .reduce((sum, job) => sum + (job.openings_count || 0), 0);
        
        const filledPositions = filteredJobOrders
          .reduce((sum, job) => sum + (job.filled_count || 0), 0);

        // Candidates applied (contacts with job_order_applicant type)
        const candidatesResult = await supabase
          .from('contacts')
          .select('*')
          .eq('tenant_id', tenant.tenant_id)
          .eq('contact_type', 'job_order_applicant');

        // Revenue this month (filter in JS)
        const revenueThisMonth = allJobOrders
          .filter(j => new Date(j.created_at) >= startOfMonth)
          .reduce((sum, job) => sum + (job.actual_revenue || 0), 0);

        // Revenue custom date range (filter in JS)
        let revenueCustom = 0;
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          revenueCustom = allJobOrders
            .filter(j => {
              const createdDate = new Date(j.created_at);
              return createdDate >= start && createdDate <= end;
            })
            .reduce((sum, job) => sum + (job.actual_revenue || 0), 0);
        }

        // Top recruiters (contacts grouped by recruiter)
        const contactsWithRecruitersResult = await supabase
          .from('contacts')
          .select(`
            contact_id,
            recruiter_id,
            internal_staff!recruiter_id (
              staff_id,
              first_name,
              last_name,
              team_members (
                team_id,
                teams (
                  team_id,
                  team_name
                )
              )
            )
          `)
          .eq('tenant_id', tenant.tenant_id)
          .not('recruiter_id', 'is', null);

        // Group by recruiter
        const recruiterMap = new Map();
        (contactsWithRecruitersResult.data || []).forEach(contact => {
          const recruiter = contact.internal_staff;
          if (!recruiter) return;
          
          const recruiterId = recruiter.staff_id;
          if (!recruiterMap.has(recruiterId)) {
            recruiterMap.set(recruiterId, {
              recruiter_id: recruiterId,
              recruiter_name: `${recruiter.first_name} ${recruiter.last_name}`,
              submissions: 0,
              team_name: recruiter.team_members?.[0]?.teams?.team_name || 'No Team',
            });
          }
          recruiterMap.get(recruiterId).submissions += 1;
        });

        const topRecruiters = Array.from(recruiterMap.values())
          .sort((a, b) => b.submissions - a.submissions)
          .slice(0, 10);

        // Team performance
        const teamMap = new Map();
        (contactsWithRecruitersResult.data || []).forEach(contact => {
          const teamMembers = contact.internal_staff?.team_members || [];
          teamMembers.forEach(tm => {
            const team = tm.teams;
            if (!team) return;
            
            const teamId = team.team_id;
            if (!teamMap.has(teamId)) {
              teamMap.set(teamId, {
                team_id: teamId,
                team_name: team.team_name,
                submissions: 0,
              });
            }
            teamMap.get(teamId).submissions += 1;
          });
        });

        const teamPerformance = Array.from(teamMap.values())
          .sort((a, b) => b.submissions - a.submissions);

        setStats({
          clientsThisWeek: clientsThisWeek.length,
          clientsThisMonth: clientsThisMonth.length,
          clientsCustom: clientsCustom.length,
          jobOrders: filteredJobOrders.length,
          candidatesApplied: candidatesResult.data?.length || 0,
          openPositions,
          filledPositions,
          revenueThisMonth,
          revenueCustom,
          topRecruiters,
          teamPerformance,
        });
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [tenant?.tenant_id, businessFilter, teamFilter, startDate, endDate]);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="client-dashboard">
      <h1>Client Dashboard</h1>

      <div className="filters-row">
        <div className="filter-group">
          <label htmlFor={businessFilterId}>Filter by Business</label>
          <select
            id={businessFilterId}
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
          >
            <option value="all">All Businesses</option>
            {businesses.map(biz => (
              <option key={biz.business_id} value={biz.business_id}>
                {biz.business_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor={teamFilterId}>Filter by Team</label>
          <select
            id={teamFilterId}
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="all">All Teams</option>
            {teams.map(team => (
              <option key={team.team_id} value={team.team_id}>
                {team.team_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor={startDateId}>Start Date</label>
          <input
            id={startDateId}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor={endDateId}>End Date</label>
          <input
            id={endDateId}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>New Clients This Week</h3>
          <div className="stat-value">{stats.clientsThisWeek}</div>
        </div>

        <div className="stat-card">
          <h3>New Clients This Month</h3>
          <div className="stat-value">{stats.clientsThisMonth}</div>
        </div>

        <div className="stat-card">
          <h3>New Clients (Custom Range)</h3>
          <div className="stat-value">{stats.clientsCustom}</div>
        </div>

        <div className="stat-card">
          <h3>Job Orders</h3>
          <div className="stat-value">{stats.jobOrders}</div>
        </div>

        <div className="stat-card">
          <h3>Candidates Applied</h3>
          <div className="stat-value">{stats.candidatesApplied}</div>
        </div>

        <div className="stat-card">
          <h3>Open Positions</h3>
          <div className="stat-value">{stats.openPositions}</div>
        </div>

        <div className="stat-card">
          <h3>Filled Positions</h3>
          <div className="stat-value">{stats.filledPositions}</div>
        </div>

        <div className="stat-card">
          <h3>Revenue This Month</h3>
          <div className="stat-value">${stats.revenueThisMonth.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <h3>Revenue (Custom Range)</h3>
          <div className="stat-value">${stats.revenueCustom.toLocaleString()}</div>
        </div>
      </div>

      <div className="tables-row">
        <div className="table-section">
          <h2>Top Recruiters</h2>
          {stats.topRecruiters.length === 0 ? (
            <p>No recruiter data available</p>
          ) : (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Recruiter</th>
                  <th>Submissions</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                {stats.topRecruiters.map(recruiter => (
                  <tr key={recruiter.recruiter_id}>
                    <td>{recruiter.recruiter_name}</td>
                    <td>{recruiter.submissions}</td>
                    <td>{recruiter.team_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-section">
          <h2>Team Performance</h2>
          {stats.teamPerformance.length === 0 ? (
            <p>No team data available</p>
          ) : (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Submissions</th>
                </tr>
              </thead>
              <tbody>
                {stats.teamPerformance.map(team => (
                  <tr key={team.team_id}>
                    <td>{team.team_name}</td>
                    <td>{team.submissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style jsx>{`
        .client-dashboard {
          padding: 24px;
        }

        .client-dashboard h1 {
          margin-bottom: 24px;
          font-size: 28px;
          font-weight: 600;
        }

        .filters-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
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

        .filter-group select,
        .filter-group input {
          padding: 8px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .stat-card h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
        }

        .tables-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }

        .table-section {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .table-section h2 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .dashboard-table {
          width: 100%;
          border-collapse: collapse;
        }

        .dashboard-table th {
          background: #f9fafb;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .dashboard-table td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }

        .dashboard-table tbody tr:hover {
          background: #f9fafb;
        }

        .loading {
          padding: 40px;
          text-align: center;
          font-size: 16px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default ClientDashboard;
