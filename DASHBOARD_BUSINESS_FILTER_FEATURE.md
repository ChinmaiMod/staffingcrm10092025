# Dashboard Business Filter Feature

## Overview
The CRM Dashboard now includes a business filter dropdown that allows users to view statistics for a specific business or all businesses combined within their tenant.

## Feature Details

### UI Components
- **Business Dropdown**: Located in the dashboard header before the "This Week" and "This Month" buttons
- **Default Selection**: "All Businesses" - shows aggregated statistics across all businesses
- **Dynamic Options**: Populated from active businesses in the tenant

### Filtered Statistics
When a specific business is selected, all dashboard statistics are filtered:

1. **Total Contacts**: Shows only contacts assigned to the selected business
2. **This Week**: Shows contacts created in the last 7 days for the selected business
3. **This Month**: Shows contacts created in the last 30 days for the selected business
4. **Status Breakdown**: Shows workflow status distribution for the selected business

### Navigation Integration
- Clicking on stat cards navigates to the Contacts page with business filter preserved
- The business filter is passed as a URL parameter (`?business=<business_id>`)
- Combined with timeframe and status filters for comprehensive filtering

## Implementation

### Database Schema
Uses existing `businesses` table:
```sql
SELECT business_id, business_name 
FROM businesses 
WHERE tenant_id = ? AND is_active = true 
ORDER BY business_name
```

### Query Pattern
All stats queries follow this pattern:
```javascript
let query = supabase
  .from('contacts')
  .select('*')
  .eq('tenant_id', tenant.tenant_id)

// Add business filter when specific business selected
if (selectedBusiness !== 'all') {
  query = query.eq('business_id', selectedBusiness)
}
```

### State Management
```javascript
const [businesses, setBusinesses] = useState([])
const [selectedBusiness, setSelectedBusiness] = useState('all')
```

### Effects and Dependencies
```javascript
// Reload stats when business selection changes
useEffect(() => {
  loadStats()
}, [tenant?.tenant_id, selectedBusiness])
```

## User Flow

### Viewing All Businesses
1. Default state shows "All Businesses" selected
2. Dashboard displays aggregated statistics across all businesses
3. All stats cards are clickable to navigate to filtered contact lists

### Filtering by Business
1. User selects a specific business from the dropdown
2. Dashboard automatically reloads with business-filtered statistics
3. All stats reflect only the selected business:
   - Total contacts for that business
   - New contacts this week for that business
   - New contacts this month for that business
   - Status breakdown for that business's contacts

### Navigation Preservation
1. User clicks on a stat card (e.g., "This Week")
2. Navigates to `/crm/contacts?business=<id>&timeframe=week`
3. Contacts page receives business filter and applies it
4. User can return to dashboard and filter persists

## Use Cases

### Multi-Business Tenants
- **Scenario**: Tenant manages 5 different staffing businesses
- **Benefit**: Can view performance metrics per business
- **Example**: Compare "This Week" additions across businesses

### Business Performance Tracking
- **Scenario**: Monitor which businesses are generating most contacts
- **Benefit**: Identify high-performing vs low-performing businesses
- **Example**: Business A has 150 contacts while Business B has 25

### Targeted Contact Management
- **Scenario**: Need to review all active contacts for a specific business
- **Benefit**: Focus on one business at a time without noise from others
- **Example**: Filter dashboard to "Tech Staffing Inc" to review their pipeline

## Technical Details

### Component Structure
- **File**: `src/components/CRM/Dashboard/Dashboard.jsx`
- **Dependencies**: 
  - React hooks (useState, useEffect)
  - Supabase client
  - React Router (useNavigate)
  - TenantProvider context

### Data Flow
1. Component mounts → Load businesses list
2. User selects business → Update selectedBusiness state
3. selectedBusiness changes → Trigger loadStats useEffect
4. loadStats executes → Queries filtered by business_id
5. Stats state updates → UI re-renders with new data

### Error Handling
- Businesses load failure: Logged to console, defaults to empty array
- Stats load failure: Logged to console, shows 0 values
- No businesses available: Dropdown shows only "All Businesses" option

## Security & Multi-Tenancy

### Tenant Isolation
- All queries include `tenant_id` filter
- RLS policies ensure users only see their tenant's businesses
- Business dropdown only shows businesses user has access to

### Access Control
- Business filter respects existing RBAC rules
- Users can only filter by businesses they're assigned to
- Super admins see all businesses in their tenant

## Testing Checklist

- [ ] Businesses dropdown populates with active businesses
- [ ] "All Businesses" option appears first
- [ ] Selecting a business updates all stats
- [ ] Stats show correct filtered counts
- [ ] Status breakdown reflects selected business
- [ ] Clicking stat card navigates with business param
- [ ] Switching between businesses reloads stats
- [ ] Selecting "All Businesses" shows aggregated stats
- [ ] Works correctly with 0 businesses (shows only "All")
- [ ] Works correctly with 1 business
- [ ] Works correctly with multiple businesses
- [ ] Business filter persists in navigation

## Future Enhancements

### Potential Features
1. **Business Statistics in Dropdown**: Show contact count next to each business name
   - Example: "Tech Staffing Inc (150 contacts)"

2. **Persistent Selection**: Remember user's last selected business
   - Use localStorage to persist selection across sessions

3. **Business Comparison Mode**: Show side-by-side stats for multiple businesses
   - Allow selecting 2-3 businesses to compare

4. **Business Performance Trends**: Show growth/decline indicators
   - Add arrows showing week-over-week or month-over-month changes

5. **Export by Business**: Add export functionality for business-specific reports
   - Generate CSV/PDF reports filtered by selected business

## Troubleshooting

### Dropdown Not Showing Businesses
- **Check**: Verify `businesses` table has active records with `is_active = true`
- **Check**: Ensure tenant_id matches user's current tenant
- **Fix**: Run migration to seed businesses if needed

### Stats Not Updating on Business Selection
- **Check**: Verify `selectedBusiness` state is updating
- **Check**: Ensure `loadStats` useEffect includes `selectedBusiness` in dependencies
- **Fix**: Check browser console for query errors

### Navigation Not Preserving Business Filter
- **Check**: Verify `handleStatClick` and `handleStatusClick` include business param
- **Check**: Ensure Contacts page reads `business` URL parameter
- **Fix**: Update Contacts page to apply business filter from URL

## Related Files
- `src/components/CRM/Dashboard/Dashboard.jsx` - Main implementation
- `src/components/CRM/Contacts/ContactsManager.jsx` - Receives business filter from navigation
- Database table: `businesses` - Source of business options
- Database table: `contacts` - Filtered by business_id

## API Endpoints
None - Uses direct Supabase queries from frontend

## Dependencies
- Supabase client (for database queries)
- React Router (for navigation with URL parameters)
- TenantProvider context (for tenant_id)

---

**Status**: ✅ Implemented and Ready for Testing  
**Version**: 1.0  
**Last Updated**: 2025-01-14
