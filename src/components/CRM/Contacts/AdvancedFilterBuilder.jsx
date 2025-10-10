import { useState, useEffect } from 'react'

// Field definitions with operators
const FILTER_FIELDS = [
  // Basic Info
  { value: 'first_name', label: 'First Name', type: 'text' },
  { value: 'last_name', label: 'Last Name', type: 'text' },
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'phone', label: 'Phone', type: 'text' },
  
  // Contact Type & Status
  { value: 'contact_type', label: 'Contact Type', type: 'select', options: [
    { value: 'it_candidate', label: 'IT Candidate' },
    { value: 'healthcare_candidate', label: 'Healthcare Candidate' },
    { value: 'vendor_client', label: 'Vendor/Client' },
    { value: 'empanelment_contact', label: 'Empanelment Contact' },
    { value: 'internal_india', label: 'Internal India' },
    { value: 'internal_usa', label: 'Internal USA' },
  ]},
  { value: 'status', label: 'Status', type: 'select', options: [
    { value: 'Initial Contact', label: 'Initial Contact' },
    { value: 'Spoke to candidate', label: 'Spoke to candidate' },
    { value: 'Resume needs to be prepared', label: 'Resume needs to be prepared' },
    { value: 'Resume prepared and sent for review', label: 'Resume prepared' },
    { value: 'Assigned to Recruiter', label: 'Assigned to Recruiter' },
    { value: 'Recruiter started marketing', label: 'Recruiter started marketing' },
    { value: 'Placed into Job', label: 'Placed into Job' },
    { value: 'Candidate declined marketing', label: 'Candidate declined' },
    { value: 'Candidate on vacation', label: 'On vacation' },
    { value: 'Candidate not responding', label: 'Not responding' },
    { value: 'Exclusive roles only', label: 'Exclusive roles' },
  ]},
  
  // Professional Info
  { value: 'visa_status', label: 'Visa Status', type: 'select', options: [
    { value: 'F1', label: 'F1' },
    { value: 'OPT', label: 'OPT' },
    { value: 'STEM OPT', label: 'STEM OPT' },
    { value: 'H1B', label: 'H1B' },
    { value: 'H4', label: 'H4' },
    { value: 'H4 EAD', label: 'H4 EAD' },
    { value: 'GC EAD', label: 'GC EAD' },
    { value: 'GC', label: 'GC' },
    { value: 'USC', label: 'USC' },
  ]},
  { value: 'job_title', label: 'Job Title', type: 'text' },
  { value: 'years_experience', label: 'Years of Experience', type: 'select', options: [
    { value: '0', label: '0' },
    { value: '1 to 3', label: '1 to 3' },
    { value: '4 to 6', label: '4 to 6' },
    { value: '7 to 9', label: '7 to 9' },
    { value: '10 -15', label: '10 to 15' },
    { value: '15+', label: '15+' },
  ]},
  
  // Location
  { value: 'country', label: 'Country', type: 'select', options: [
    { value: 'USA', label: 'USA' },
    { value: 'India', label: 'India' },
  ]},
  { value: 'state', label: 'State', type: 'text' },
  { value: 'city', label: 'City', type: 'text' },
  
  // Other
  { value: 'referral_source', label: 'Referral Source', type: 'select', options: [
    { value: 'FB', label: 'Facebook' },
    { value: 'Google', label: 'Google' },
    { value: 'Friend', label: 'Friend' },
  ]},
  { value: 'remarks', label: 'Remarks', type: 'text' },
]

const TEXT_OPERATORS = [
  { value: 'equals', label: 'Equals', symbol: '=' },
  { value: 'not_equals', label: 'Not Equals', symbol: '≠' },
  { value: 'contains', label: 'Contains', symbol: '⊃' },
  { value: 'not_contains', label: 'Does Not Contain', symbol: '⊅' },
  { value: 'starts_with', label: 'Starts With', symbol: '⊲' },
  { value: 'ends_with', label: 'Ends With', symbol: '⊳' },
  { value: 'is_empty', label: 'Is Empty', symbol: '∅' },
  { value: 'is_not_empty', label: 'Is Not Empty', symbol: '≠∅' },
]

const SELECT_OPERATORS = [
  { value: 'equals', label: 'Is', symbol: '=' },
  { value: 'not_equals', label: 'Is Not', symbol: '≠' },
  { value: 'is_empty', label: 'Is Empty', symbol: '∅' },
  { value: 'is_not_empty', label: 'Is Not Empty', symbol: '≠∅' },
]

export default function AdvancedFilterBuilder({ onApplyFilters, onClose, initialFilters }) {
  const [filterGroups, setFilterGroups] = useState([
    {
      id: 1,
      logicalOperator: 'AND', // AND/OR between conditions in this group
      conditions: [
        { id: 1, field: 'first_name', operator: 'starts_with', value: '' }
      ]
    }
  ])
  const [groupOperator, setGroupOperator] = useState('AND') // AND/OR between groups

  useEffect(() => {
    if (initialFilters && initialFilters.length > 0) {
      setFilterGroups(initialFilters)
    }
  }, [initialFilters])

  const addCondition = (groupId) => {
    setFilterGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [
            ...group.conditions,
            { 
              id: Date.now(), 
              field: 'first_name', 
              operator: 'starts_with', 
              value: '' 
            }
          ]
        }
      }
      return group
    }))
  }

  const removeCondition = (groupId, conditionId) => {
    setFilterGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const newConditions = group.conditions.filter(c => c.id !== conditionId)
        return {
          ...group,
          conditions: newConditions.length > 0 ? newConditions : [
            { id: Date.now(), field: 'first_name', operator: 'starts_with', value: '' }
          ]
        }
      }
      return group
    }))
  }

  const updateCondition = (groupId, conditionId, updates) => {
    setFilterGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.map(condition => {
            if (condition.id === conditionId) {
              return { ...condition, ...updates }
            }
            return condition
          })
        }
      }
      return group
    }))
  }

  const addGroup = () => {
    setFilterGroups(prev => [
      ...prev,
      {
        id: Date.now(),
        logicalOperator: 'AND',
        conditions: [
          { id: Date.now(), field: 'first_name', operator: 'starts_with', value: '' }
        ]
      }
    ])
  }

  const removeGroup = (groupId) => {
    setFilterGroups(prev => {
      const newGroups = prev.filter(g => g.id !== groupId)
      return newGroups.length > 0 ? newGroups : [
        {
          id: Date.now(),
          logicalOperator: 'AND',
          conditions: [
            { id: Date.now(), field: 'first_name', operator: 'starts_with', value: '' }
          ]
        }
      ]
    })
  }

  const updateGroupOperator = (groupId, operator) => {
    setFilterGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return { ...group, logicalOperator: operator }
      }
      return group
    }))
  }

  const handleApply = () => {
    onApplyFilters({ groups: filterGroups, groupOperator })
  }

  const handleClear = () => {
    setFilterGroups([
      {
        id: Date.now(),
        logicalOperator: 'AND',
        conditions: [
          { id: Date.now(), field: 'first_name', operator: 'starts_with', value: '' }
        ]
      }
    ])
    setGroupOperator('AND')
  }

  const getOperatorsForField = (fieldValue) => {
    const field = FILTER_FIELDS.find(f => f.value === fieldValue)
    if (!field) return TEXT_OPERATORS
    return field.type === 'select' ? SELECT_OPERATORS : TEXT_OPERATORS
  }

  const getFieldConfig = (fieldValue) => {
    return FILTER_FIELDS.find(f => f.value === fieldValue) || FILTER_FIELDS[0]
  }

  const needsValueInput = (operator) => {
    return !['is_empty', 'is_not_empty'].includes(operator)
  }

  return (
    <div className="advanced-filter-builder">
      <div className="filter-builder-header">
        <h3>🔍 Advanced Filter Builder</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="filter-builder-body">
        <div className="filter-help">
          <strong>💡 Tip:</strong> Build complex queries by combining multiple conditions. 
          Use AND to match all conditions, OR to match any condition.
        </div>

        {filterGroups.map((group, groupIndex) => (
          <div key={group.id} className="filter-group">
            <div className="filter-group-header">
              <div className="group-label">
                <span className="group-number">Group {groupIndex + 1}</span>
                {group.conditions.length > 1 && (
                  <select
                    value={group.logicalOperator}
                    onChange={(e) => updateGroupOperator(group.id, e.target.value)}
                    className="operator-select small"
                  >
                    <option value="AND">Match ALL conditions (AND)</option>
                    <option value="OR">Match ANY condition (OR)</option>
                  </select>
                )}
              </div>
              {filterGroups.length > 1 && (
                <button 
                  className="btn-icon btn-danger"
                  onClick={() => removeGroup(group.id)}
                  title="Remove group"
                >
                  🗑️ Remove Group
                </button>
              )}
            </div>

            <div className="conditions-list">
              {group.conditions.map((condition, conditionIndex) => {
                const fieldConfig = getFieldConfig(condition.field)
                const operators = getOperatorsForField(condition.field)
                
                return (
                  <div key={condition.id} className="condition-row">
                    {conditionIndex > 0 && (
                      <div className="condition-operator-badge">
                        {group.logicalOperator}
                      </div>
                    )}
                    
                    <div className="condition-inputs">
                      {/* Field Selection */}
                      <select
                        value={condition.field}
                        onChange={(e) => {
                          const newField = e.target.value
                          const newOperators = getOperatorsForField(newField)
                          updateCondition(group.id, condition.id, {
                            field: newField,
                            operator: newOperators[0].value,
                            value: ''
                          })
                        }}
                        className="field-select"
                      >
                        {FILTER_FIELDS.map(field => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>

                      {/* Operator Selection */}
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(group.id, condition.id, {
                          operator: e.target.value,
                          value: needsValueInput(e.target.value) ? condition.value : ''
                        })}
                        className="operator-select"
                      >
                        {operators.map(op => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>

                      {/* Value Input */}
                      {needsValueInput(condition.operator) && (
                        fieldConfig.type === 'select' ? (
                          <select
                            value={condition.value}
                            onChange={(e) => updateCondition(group.id, condition.id, {
                              value: e.target.value
                            })}
                            className="value-select"
                          >
                            <option value="">Select...</option>
                            {fieldConfig.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => updateCondition(group.id, condition.id, {
                              value: e.target.value
                            })}
                            placeholder="Enter value..."
                            className="value-input"
                          />
                        )
                      )}

                      {/* Remove Condition Button */}
                      <button
                        className="btn-icon btn-danger-outline"
                        onClick={() => removeCondition(group.id, condition.id)}
                        title="Remove condition"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => addCondition(group.id)}
            >
              ➕ Add Condition
            </button>
          </div>
        ))}

        {filterGroups.length > 1 && (
          <div className="group-operator-selector">
            <label>Between groups, match:</label>
            <select
              value={groupOperator}
              onChange={(e) => setGroupOperator(e.target.value)}
              className="operator-select"
            >
              <option value="AND">ALL groups (AND)</option>
              <option value="OR">ANY group (OR)</option>
            </select>
          </div>
        )}

        <button className="btn btn-secondary" onClick={addGroup}>
          ➕ Add Group
        </button>
      </div>

      <div className="filter-builder-footer">
        <button className="btn btn-secondary" onClick={handleClear}>
          Clear All
        </button>
        <div>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>

      <style jsx>{`
        .advanced-filter-builder {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
        }

        .filter-builder-header {
          padding: 20px;
          border-bottom: 2px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .filter-builder-header h3 {
          margin: 0;
          font-size: 20px;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 4px 12px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .filter-builder-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .filter-help {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .filter-group {
          background: #f8f9fa;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .filter-group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .group-label {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .group-number {
          font-weight: 600;
          color: #495057;
        }

        .operator-select.small {
          font-size: 13px;
          padding: 4px 8px;
        }

        .conditions-list {
          margin-bottom: 12px;
        }

        .condition-row {
          margin-bottom: 12px;
          position: relative;
        }

        .condition-operator-badge {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .condition-inputs {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .field-select,
        .operator-select,
        .value-select,
        .value-input {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          background: white;
        }

        .field-select {
          flex: 0 0 180px;
          font-weight: 500;
        }

        .operator-select {
          flex: 0 0 160px;
        }

        .value-select,
        .value-input {
          flex: 1;
          min-width: 200px;
        }

        .value-input:focus,
        .field-select:focus,
        .operator-select:focus,
        .value-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .btn-icon {
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        .btn-danger-outline {
          background: white;
          color: #dc3545;
          border: 1px solid #dc3545;
        }

        .btn-danger-outline:hover {
          background: #dc3545;
          color: white;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }

        .group-operator-selector {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 6px;
          padding: 12px;
          margin: 16px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .group-operator-selector label {
          font-weight: 500;
          margin: 0;
        }

        .filter-builder-footer {
          padding: 20px;
          border-top: 2px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8f9fa;
        }

        .filter-builder-footer > div {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background: #5568d3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #5a6268;
        }

        @media (max-width: 768px) {
          .condition-inputs {
            flex-direction: column;
            align-items: stretch;
          }

          .field-select,
          .operator-select,
          .value-select,
          .value-input {
            flex: 1;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
