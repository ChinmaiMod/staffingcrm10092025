import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

const JobOrderForm = ({ jobOrder, clients, businesses, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    client_id: '',
    business_id: '',
    job_title: '',
    job_description: '',
    location: '',
    industry: '',
    employment_type: 'FULL_TIME',
    salary_min: '',
    salary_max: '',
    salary_currency: 'USD',
    gross_margin: '',
    payment_terms: '',
    billing_type: 'HOURLY',
    required_skills: '',
    preferred_skills: '',
    experience_years_min: '',
    experience_years_max: '',
    education_level: '',
    certifications_required: '',
    status: 'OPEN',
    priority: 'MEDIUM',
    openings_count: 1,
    filled_count: 0,
    start_date: '',
    end_date: '',
    deadline: '',
    notes: '',
    internal_notes: '',
  })

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (jobOrder) {
      setFormData({
        client_id: jobOrder.client_id || '',
        business_id: jobOrder.business_id || '',
        job_title: jobOrder.job_title || '',
        job_description: jobOrder.job_description || '',
        location: jobOrder.location || '',
        industry: jobOrder.industry || '',
        employment_type: jobOrder.employment_type || 'FULL_TIME',
        salary_min: jobOrder.salary_min || '',
        salary_max: jobOrder.salary_max || '',
        salary_currency: jobOrder.salary_currency || 'USD',
        gross_margin: jobOrder.gross_margin || '',
        payment_terms: jobOrder.payment_terms || '',
        billing_type: jobOrder.billing_type || 'HOURLY',
        required_skills: Array.isArray(jobOrder.required_skills) ? jobOrder.required_skills.join(', ') : '',
        preferred_skills: Array.isArray(jobOrder.preferred_skills) ? jobOrder.preferred_skills.join(', ') : '',
        experience_years_min: jobOrder.experience_years_min || '',
        experience_years_max: jobOrder.experience_years_max || '',
        education_level: jobOrder.education_level || '',
        certifications_required: Array.isArray(jobOrder.certifications_required) ? jobOrder.certifications_required.join(', ') : '',
        status: jobOrder.status || 'OPEN',
        priority: jobOrder.priority || 'MEDIUM',
        openings_count: jobOrder.openings_count || 1,
        filled_count: jobOrder.filled_count || 0,
        start_date: jobOrder.start_date || '',
        end_date: jobOrder.end_date || '',
        deadline: jobOrder.deadline || '',
        notes: jobOrder.notes || '',
        internal_notes: jobOrder.internal_notes || '',
      })
    }
  }, [jobOrder])

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }))
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.job_title?.trim()) {
      newErrors.job_title = 'Job title is required'
    }

    if (!formData.client_id) {
      newErrors.client_id = 'Client is required'
    }

    if (formData.salary_min && formData.salary_max && Number(formData.salary_min) > Number(formData.salary_max)) {
      newErrors.salary_max = 'Max salary must be greater than min salary'
    }

    if (formData.experience_years_min && formData.experience_years_max && Number(formData.experience_years_min) > Number(formData.experience_years_max)) {
      newErrors.experience_years_max = 'Max experience must be greater than min experience'
    }

    if (formData.openings_count < 1) {
      newErrors.openings_count = 'Openings count must be at least 1'
    }

    if (formData.filled_count < 0) {
      newErrors.filled_count = 'Filled count cannot be negative'
    }

    if (formData.filled_count > formData.openings_count) {
      newErrors.filled_count = 'Filled count cannot exceed openings count'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setSubmitting(true)

    try {
      // Convert comma-separated strings to arrays
      const submitData = {
        ...formData,
        required_skills: formData.required_skills
          ? formData.required_skills.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        preferred_skills: formData.preferred_skills
          ? formData.preferred_skills.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        certifications_required: formData.certifications_required
          ? formData.certifications_required.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        // Convert empty strings to null for numeric/date fields
        salary_min: formData.salary_min === '' ? null : Number(formData.salary_min),
        salary_max: formData.salary_max === '' ? null : Number(formData.salary_max),
        gross_margin: formData.gross_margin === '' ? null : Number(formData.gross_margin),
        experience_years_min: formData.experience_years_min === '' ? null : Number(formData.experience_years_min),
        experience_years_max: formData.experience_years_max === '' ? null : Number(formData.experience_years_max),
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        deadline: formData.deadline || null,
        business_id: formData.business_id || null,
      }

      await onSubmit(submitData)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="job-order-form">
      <div className="form-sections">
        {/* Basic Information */}
        <section className="form-section">
          <h3>Basic Information</h3>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="client_id">
                Client <span className="required">*</span>
              </label>
              <select
                id="client_id"
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                className={errors.client_id ? 'error' : ''}
              >
                <option value="">Select Client</option>
                {clients.map(client => (
                  <option key={client.client_id} value={client.client_id}>
                    {client.client_name}
                  </option>
                ))}
              </select>
              {errors.client_id && <span className="error-message">{errors.client_id}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="business_id">Business</label>
              <select
                id="business_id"
                name="business_id"
                value={formData.business_id}
                onChange={handleChange}
              >
                <option value="">Select Business</option>
                {businesses.map(business => (
                  <option key={business.business_id} value={business.business_id}>
                    {business.business_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field full-width">
              <label htmlFor="job_title">
                Job Title <span className="required">*</span>
              </label>
              <input
                type="text"
                id="job_title"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                placeholder="e.g., Senior Software Engineer"
                className={errors.job_title ? 'error' : ''}
              />
              {errors.job_title && <span className="error-message">{errors.job_title}</span>}
            </div>

            <div className="form-field full-width">
              <label htmlFor="job_description">Job Description</label>
              <textarea
                id="job_description"
                name="job_description"
                value={formData.job_description}
                onChange={handleChange}
                rows="4"
                placeholder="Detailed job description..."
              />
            </div>

            <div className="form-field">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., New York, NY"
              />
            </div>

            <div className="form-field">
              <label htmlFor="industry">Industry</label>
              <input
                type="text"
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="e.g., Technology, Finance"
              />
            </div>

            <div className="form-field">
              <label htmlFor="employment_type">Employment Type</label>
              <select
                id="employment_type"
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="CONTRACT_TO_HIRE">Contract to Hire</option>
                <option value="TEMPORARY">Temporary</option>
              </select>
            </div>
          </div>
        </section>

        {/* Compensation & Billing */}
        <section className="form-section">
          <h3>Compensation & Billing</h3>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="salary_min">Min Salary</label>
              <input
                type="number"
                id="salary_min"
                name="salary_min"
                value={formData.salary_min}
                onChange={handleChange}
                placeholder="50000"
              />
            </div>

            <div className="form-field">
              <label htmlFor="salary_max">Max Salary</label>
              <input
                type="number"
                id="salary_max"
                name="salary_max"
                value={formData.salary_max}
                onChange={handleChange}
                placeholder="80000"
                className={errors.salary_max ? 'error' : ''}
              />
              {errors.salary_max && <span className="error-message">{errors.salary_max}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="salary_currency">Currency</label>
              <select
                id="salary_currency"
                name="salary_currency"
                value={formData.salary_currency}
                onChange={handleChange}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="gross_margin">Gross Margin (%)</label>
              <input
                type="number"
                id="gross_margin"
                name="gross_margin"
                value={formData.gross_margin}
                onChange={handleChange}
                placeholder="20"
                step="0.01"
              />
            </div>

            <div className="form-field">
              <label htmlFor="billing_type">Billing Type</label>
              <select
                id="billing_type"
                name="billing_type"
                value={formData.billing_type}
                onChange={handleChange}
              >
                <option value="HOURLY">Hourly</option>
                <option value="FIXED_PRICE">Fixed Price</option>
                <option value="RETAINER">Retainer</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="payment_terms">Payment Terms</label>
              <input
                type="text"
                id="payment_terms"
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleChange}
                placeholder="e.g., Net 30"
              />
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="form-section">
          <h3>Requirements</h3>
          <div className="form-grid">
            <div className="form-field full-width">
              <label htmlFor="required_skills">Required Skills (comma-separated)</label>
              <input
                type="text"
                id="required_skills"
                name="required_skills"
                value={formData.required_skills}
                onChange={handleChange}
                placeholder="e.g., Java, Spring Boot, SQL"
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="preferred_skills">Preferred Skills (comma-separated)</label>
              <input
                type="text"
                id="preferred_skills"
                name="preferred_skills"
                value={formData.preferred_skills}
                onChange={handleChange}
                placeholder="e.g., AWS, Docker, Kubernetes"
              />
            </div>

            <div className="form-field">
              <label htmlFor="experience_years_min">Min Experience (years)</label>
              <input
                type="number"
                id="experience_years_min"
                name="experience_years_min"
                value={formData.experience_years_min}
                onChange={handleChange}
                placeholder="3"
              />
            </div>

            <div className="form-field">
              <label htmlFor="experience_years_max">Max Experience (years)</label>
              <input
                type="number"
                id="experience_years_max"
                name="experience_years_max"
                value={formData.experience_years_max}
                onChange={handleChange}
                placeholder="5"
                className={errors.experience_years_max ? 'error' : ''}
              />
              {errors.experience_years_max && <span className="error-message">{errors.experience_years_max}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="education_level">Education Level</label>
              <input
                type="text"
                id="education_level"
                name="education_level"
                value={formData.education_level}
                onChange={handleChange}
                placeholder="e.g., Bachelor&apos;s Degree"
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="certifications_required">Certifications (comma-separated)</label>
              <input
                type="text"
                id="certifications_required"
                name="certifications_required"
                value={formData.certifications_required}
                onChange={handleChange}
                placeholder="e.g., PMP, AWS Certified"
              />
            </div>
          </div>
        </section>

        {/* Status & Priority */}
        <section className="form-section">
          <h3>Status & Priority</h3>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="DRAFT">Draft</option>
                <option value="OPEN">Open</option>
                <option value="FILLED">Filled</option>
                <option value="CLOSED">Closed</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="openings_count">Openings Count</label>
              <input
                type="number"
                id="openings_count"
                name="openings_count"
                value={formData.openings_count}
                onChange={handleChange}
                min="1"
                className={errors.openings_count ? 'error' : ''}
              />
              {errors.openings_count && <span className="error-message">{errors.openings_count}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="filled_count">Filled Count</label>
              <input
                type="number"
                id="filled_count"
                name="filled_count"
                value={formData.filled_count}
                onChange={handleChange}
                min="0"
                className={errors.filled_count ? 'error' : ''}
              />
              {errors.filled_count && <span className="error-message">{errors.filled_count}</span>}
            </div>
          </div>
        </section>

        {/* Dates */}
        <section className="form-section">
          <h3>Dates</h3>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="start_date">Start Date</label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="end_date">End Date</label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="deadline">Application Deadline</label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="form-section">
          <h3>Notes</h3>
          <div className="form-grid">
            <div className="form-field full-width">
              <label htmlFor="notes">Notes (visible to client)</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Additional notes..."
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="internal_notes">Internal Notes (internal only)</label>
              <textarea
                id="internal_notes"
                name="internal_notes"
                value={formData.internal_notes}
                onChange={handleChange}
                rows="3"
                placeholder="Internal notes..."
              />
            </div>
          </div>
        </section>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : (jobOrder ? 'Update Job Order' : 'Create Job Order')}
        </button>
      </div>

      <style jsx>{`
        .job-order-form {
          padding: 24px;
        }

        .form-sections {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .form-section h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          padding-bottom: 12px;
          border-bottom: 2px solid #e5e7eb;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
        }

        .form-field.full-width {
          grid-column: span 2;
        }

        .form-field label {
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .required {
          color: #ef4444;
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-field input.error,
        .form-field select.error {
          border-color: #ef4444;
        }

        .error-message {
          margin-top: 4px;
          font-size: 12px;
          color: #ef4444;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 14px;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }
      `}</style>
    </form>
  )
}

JobOrderForm.propTypes = {
  jobOrder: PropTypes.object,
  clients: PropTypes.array.isRequired,
  businesses: PropTypes.array.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
}

export default JobOrderForm
