import { useEffect, useMemo, useState } from 'react'
import { validateEmail, validateName, validatePhone, validateTextField } from '../../../../utils/validators'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const normalizeInitialValues = (values) => {
  if (!values) {
    return {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      job_title: '',
      department: '',
      status: 'ACTIVE',
      business_id: '',
      is_billable: false,
      start_date: '',
      end_date: '',
      notes: '',
    }
  }

  return {
    first_name: values.first_name || '',
    last_name: values.last_name || '',
    email: values.email || '',
    phone: values.phone || '',
    job_title: values.job_title || '',
    department: values.department || '',
    status: values.status || 'ACTIVE',
    business_id: values.business_id || '',
    is_billable: Boolean(values.is_billable),
    start_date: values.start_date ? values.start_date.substring(0, 10) : '',
    end_date: values.end_date ? values.end_date.substring(0, 10) : '',
    notes: values.notes || '',
  }
}

export default function InternalStaffForm({ initialValues, onSubmit, onCancel, submitting, businesses }) {
  const [formValues, setFormValues] = useState(() => normalizeInitialValues(initialValues))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  const disabled = useMemo(() => submitting, [submitting])

  useEffect(() => {
    setFormValues(normalizeInitialValues(initialValues))
    setErrors({})
    setFormError('')
  }, [initialValues])

  const validate = () => {
    const nextErrors = {}

    const firstNameValidation = validateName(formValues.first_name, 'First name', true)
    if (!firstNameValidation.valid) {
      nextErrors.first_name = firstNameValidation.error
    }

    const lastNameValidation = validateName(formValues.last_name, 'Last name', true)
    if (!lastNameValidation.valid) {
      nextErrors.last_name = lastNameValidation.error
    }

    const emailValidation = validateEmail(formValues.email)
    if (!emailValidation.valid) {
      nextErrors.email = emailValidation.error
    }

    const phoneValidation = validatePhone(formValues.phone, false)
    if (!phoneValidation.valid) {
      nextErrors.phone = phoneValidation.error
    }

    if (formValues.job_title) {
      const jobValidation = validateTextField(formValues.job_title, 'Job title', {
        required: false,
        minLength: 2,
        maxLength: 100,
      })
      if (!jobValidation.valid) {
        nextErrors.job_title = jobValidation.error
      }
    }

    if (formValues.department) {
      const departmentValidation = validateTextField(formValues.department, 'Department', {
        required: false,
        minLength: 2,
        maxLength: 100,
      })
      if (!departmentValidation.valid) {
        nextErrors.department = departmentValidation.error
      }
    }

    if (formValues.notes) {
      const notesValidation = validateTextField(formValues.notes, 'Notes', {
        required: false,
        minLength: 2,
        maxLength: 1000,
      })
      if (!notesValidation.valid) {
        nextErrors.notes = notesValidation.error
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
    setFormError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) {
      setFormError('Please fix the highlighted fields before continuing.')
      return
    }

    const payload = {
      ...formValues,
      business_id: formValues.business_id || null,
      phone: formValues.phone || null,
      job_title: formValues.job_title || null,
      department: formValues.department || null,
      start_date: formValues.start_date || null,
      end_date: formValues.end_date || null,
      notes: formValues.notes || null,
    }

    onSubmit(payload)
  }

  return (
    <div className="crm-card" style={{ marginBottom: '24px' }}>
      <div className="crm-card-header">
        <h2 style={{ margin: 0 }}>{initialValues ? 'Edit Team Member' : 'Add Team Member'}</h2>
        <p style={{ margin: 0, color: '#64748b' }}>
          Manage internal staff associated with your businesses
        </p>
      </div>

      {formError && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid" style={{ gap: '16px' }}>
        <div className="form-group">
          <label>First Name *</label>
          <input
            type="text"
            name="first_name"
            value={formValues.first_name}
            onChange={handleChange}
            className={errors.first_name ? 'error' : ''}
            placeholder="e.g., Priya"
            disabled={disabled}
          />
          {errors.first_name && <small className="error-text">{errors.first_name}</small>}
        </div>

        <div className="form-group">
          <label>Last Name *</label>
          <input
            type="text"
            name="last_name"
            value={formValues.last_name}
            onChange={handleChange}
            className={errors.last_name ? 'error' : ''}
            placeholder="e.g., Desai"
            disabled={disabled}
          />
          {errors.last_name && <small className="error-text">{errors.last_name}</small>}
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={formValues.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            placeholder="person@company.com"
            disabled={disabled}
          />
          {errors.email && <small className="error-text">{errors.email}</small>}
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            value={formValues.phone}
            onChange={handleChange}
            className={errors.phone ? 'error' : ''}
            placeholder="+1 555 123 4567"
            disabled={disabled}
          />
          {errors.phone && <small className="error-text">{errors.phone}</small>}
        </div>

        <div className="form-group">
          <label>Business</label>
          <select
            name="business_id"
            value={formValues.business_id}
            onChange={handleChange}
            disabled={disabled || businesses.length === 0}
          >
            <option value="">Global / Not Assigned</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Status *</label>
          <select
            name="status"
            value={formValues.status}
            onChange={handleChange}
            disabled={disabled}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Job Title</label>
          <input
            type="text"
            name="job_title"
            value={formValues.job_title}
            onChange={handleChange}
            className={errors.job_title ? 'error' : ''}
            placeholder="e.g., Senior Recruiter"
            disabled={disabled}
          />
          {errors.job_title && <small className="error-text">{errors.job_title}</small>}
        </div>

        <div className="form-group">
          <label>Department</label>
          <input
            type="text"
            name="department"
            value={formValues.department}
            onChange={handleChange}
            className={errors.department ? 'error' : ''}
            placeholder="e.g., Healthcare Staffing"
            disabled={disabled}
          />
          {errors.department && <small className="error-text">{errors.department}</small>}
        </div>

        <div className="form-group">
          <label>Start Date</label>
          <input
            type="date"
            name="start_date"
            value={formValues.start_date}
            onChange={handleChange}
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label>End Date</label>
          <input
            type="date"
            name="end_date"
            value={formValues.end_date}
            onChange={handleChange}
            disabled={disabled}
          />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
          <label>Notes</label>
          <textarea
            name="notes"
            value={formValues.notes}
            onChange={handleChange}
            className={errors.notes ? 'error' : ''}
            placeholder="Add internal notes, certifications, or other context"
            rows={3}
            disabled={disabled}
          />
          {errors.notes && <small className="error-text">{errors.notes}</small>}
        </div>

        <div className="form-group" style={{ alignSelf: 'center' }}>
          <label className="checkbox">
            <input
              type="checkbox"
              name="is_billable"
              checked={formValues.is_billable}
              onChange={handleChange}
              disabled={disabled}
            />
            <span>Billable resource</span>
          </label>
        </div>

        <div className="form-actions" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={disabled}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={disabled}>
            {submitting ? 'Saving...' : initialValues ? 'Save Changes' : 'Create Member'}
          </button>
        </div>
      </form>
    </div>
  )
}
