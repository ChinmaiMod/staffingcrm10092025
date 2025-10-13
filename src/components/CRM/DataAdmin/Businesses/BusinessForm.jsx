import { useEffect, useMemo, useState } from 'react'

const BUSINESS_TYPES = [
  { value: 'IT_STAFFING', label: 'IT Staffing' },
  { value: 'HEALTHCARE_STAFFING', label: 'Healthcare Staffing' },
  { value: 'GENERAL', label: 'General' },
  { value: 'OTHER', label: 'Other' }
]

const CONTACT_TYPES = [
  { value: 'IT_CANDIDATE', label: 'IT Candidate' },
  { value: 'HEALTHCARE_CANDIDATE', label: 'Healthcare Candidate' },
  { value: 'VENDOR_CLIENT', label: 'Vendor Client' },
  { value: 'VENDOR_EMPANELMENT', label: 'Vendor Empanelment' },
  { value: 'EMPLOYEE_INDIA', label: 'Employee - India' },
  { value: 'EMPLOYEE_USA', label: 'Employee - USA' }
]

const DEFAULT_CONTACT_TYPES = CONTACT_TYPES.map((type) => type.value)

const defaultFormState = {
  business_name: '',
  business_type: 'GENERAL',
  description: '',
  industry: '',
  enabled_contact_types: DEFAULT_CONTACT_TYPES,
  is_active: true,
  is_default: false
}

export default function BusinessForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting
}) {
  const [formState, setFormState] = useState(defaultFormState)
  const [errors, setErrors] = useState({})

  const title = useMemo(() => (initialValues ? 'Edit Business' : 'Add Business'), [initialValues])

  useEffect(() => {
    if (initialValues) {
      setFormState({
        business_name: initialValues.business_name || '',
        business_type: initialValues.business_type || 'GENERAL',
        description: initialValues.description || '',
        industry: initialValues.industry || '',
        enabled_contact_types:
          Array.isArray(initialValues.enabled_contact_types) && initialValues.enabled_contact_types.length
            ? initialValues.enabled_contact_types
            : DEFAULT_CONTACT_TYPES,
        is_active: initialValues.is_active ?? true,
        is_default: initialValues.is_default ?? false
      })
    } else {
      setFormState(defaultFormState)
    }
    setErrors({})
  }, [initialValues])

  const handleChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleCheckboxToggle = (field) => (event) => {
    handleChange(field, event.target.checked)
  }

  const handleContactTypeToggle = (value) => {
    setFormState((prev) => {
      const next = prev.enabled_contact_types.includes(value)
        ? prev.enabled_contact_types.filter((item) => item !== value)
        : [...prev.enabled_contact_types, value]
      return { ...prev, enabled_contact_types: next }
    })
  }

  const validate = () => {
    const nextErrors = {}
    if (!formState.business_name.trim()) {
      nextErrors.business_name = 'Business name is required'
    }
    if (!formState.business_type) {
      nextErrors.business_type = 'Business type is required'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) return
    onSubmit(formState)
  }

  return (
    <div
      style={{
        marginBottom: '24px',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px 24px',
        background: '#ffffff',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Complete the fields below to save your business settings.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Business'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: '8px' }}>
        <div className="form-field">
          <label>Business Name *</label>
          <input
            type="text"
            value={formState.business_name}
            onChange={(event) => handleChange('business_name', event.target.value)}
            placeholder="e.g., Intuites IT Staffing"
          />
          {errors.business_name && <p className="form-error">{errors.business_name}</p>}
        </div>

        <div className="form-field">
          <label>Business Type *</label>
          <select
            value={formState.business_type}
            onChange={(event) => handleChange('business_type', event.target.value)}
          >
            {BUSINESS_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.business_type && <p className="form-error">{errors.business_type}</p>}
        </div>

        <div className="form-field">
          <label>Industry</label>
          <input
            type="text"
            value={formState.industry}
            onChange={(event) => handleChange('industry', event.target.value)}
            placeholder="e.g., Technology, Healthcare"
          />
        </div>

        <div className="form-field" style={{ gridColumn: 'span 2' }}>
          <label>Description</label>
          <textarea
            rows={3}
            value={formState.description}
            onChange={(event) => handleChange('description', event.target.value)}
            placeholder="Short description of this business context"
          />
        </div>

        <div className="form-field" style={{ gridColumn: 'span 2' }}>
          <label>Enabled Contact Types</label>
          <div className="checkbox-group">
            {CONTACT_TYPES.map((type) => (
              <label key={type.value} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formState.enabled_contact_types.includes(type.value)}
                  onChange={() => handleContactTypeToggle(type.value)}
                />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={formState.is_active}
              onChange={handleCheckboxToggle('is_active')}
            />
            <span>Active</span>
          </label>
        </div>

        <div className="form-field">
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={formState.is_default}
              onChange={handleCheckboxToggle('is_default')}
            />
            <span>Set as default business</span>
          </label>
        </div>
      </form>
    </div>
  )
}
