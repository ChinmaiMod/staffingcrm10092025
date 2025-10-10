import { useState, useEffect, useRef } from 'react'
import MultiSelect from '../common/MultiSelect'
import AutocompleteSelect from '../common/AutocompleteSelect'
import StatusChangeModal from './StatusChangeModal'
import { 
  validateEmail, 
  validatePhone, 
  validateTextField, 
  validateSelect
} from '../../../utils/validators'

// Reference data - in production, fetch from API
const CONTACT_TYPES = [
  { value: 'it_candidate', label: 'IT Job Candidate' },
  { value: 'healthcare_candidate', label: 'Healthcare Job Candidate' },
  { value: 'vendor_client', label: 'Vendor/Client Contact' },
  { value: 'empanelment_contact', label: 'Empanelment Contact' },
  { value: 'internal_india', label: 'Internal Hire (India)' },
  { value: 'internal_usa', label: 'Internal Hire (USA)' },
]

const VISA_STATUSES = [
  'F1', 'OPT', 'STEM OPT', 'H1B', 'H4', 'H4 EAD', 'GC EAD', 'L1B', 'L2S', 
  'B1/B2', 'J1', 'TN', 'E3', 'GC', 'USC'
]

const IT_JOB_TITLES = [
  'Java Back End Developer', 'Java Full Stack Developer', 'Dotnet Developer', 
  'Python Developer', 'Data Analyst', 'AWS Data Engineer', 'Azure Data Engineer', 
  'GCP Data Engineer', 'Big Data Developer', 'Power BI Developer', 'Qliksense Developer', 
  'Tableau Developer', 'Informatica Developer', 'Talend Developer', 'Abinitio Developer', 
  'Oracle PL/SQL Developer', 'Oracle Apex Developer', 'Oracle EBS Techno-functional consultant', 
  'Oracle EBS Functional consultant', 'Business Analyst', 'Manual QA', 'Automation QA', 
  'ETL Tester', 'iOS Developer', 'Android Developer', 'AWS Devops', 'Azure Devops', 
  'GCP Devops', 'Manhattan WMS', 'Embedded Engineer', 'Servicenow Admin', 
  'Servicenow Developer', 'Oracle DBA', 'SQL DBA', 'Scrum Master', 'Project Manager', 
  'Mainframe Developer', 'Mainframe Architect'
]

const HEALTHCARE_JOB_TITLES = [
  'Licensed Practical Nurse(LPN)', 'GNA', 'Registered nurse (RN)', 
  'Respiratory Therapist (RRT)', 'Nurse Practitioner (NP)'
]

const REASONS_FOR_CONTACT = [
  'Training and Placement', 'Marketing and Placement', 'H1B Sponsorship', 
  'H1B Transfer', 'GC Processing'
]

const STATUSES = [
  'Initial Contact', 'Spoke to candidate', 'Resume needs to be prepared', 
  'Resume prepared and sent for review', 'Assigned to Recruiter', 
  'Recruiter started marketing', 'Placed into Job', 'Candidate declined marketing', 
  'Candidate on vacation', 'Candidate not responding', 'Exclusive roles only'
]

const ROLE_TYPES = ['Remote', 'Hybrid Local', 'Onsite Local', 'Open to Relocate']

const COUNTRIES = ['USA', 'India']

const USA_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
  'Wisconsin', 'Wyoming'
]

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]

const YEARS_EXPERIENCE = ['0', '1 to 3', '4 to 6', '7 to 9', '10 -15', '15+']

const REFERRAL_SOURCES = ['FB', 'Google', 'Friend']

export default function ContactForm({ contact, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    contact_type: 'it_candidate',
    visa_status: '',
    job_title: '',
    reasons_for_contact: [],
    status: 'Initial Contact',
    role_types: [],
    country: 'USA',
    state: '',
    city: '',
    years_experience: '',
    referral_source: '',
    recruiting_team_lead: '',
    recruiter: '',
    remarks: '',
    ...contact
  })

  const [availableStates, setAvailableStates] = useState(USA_STATES)
  const [availableJobTitles, setAvailableJobTitles] = useState(IT_JOB_TITLES)
  const [attachments, setAttachments] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  
  // Status change tracking
  const initialStatus = useRef(contact?.status || 'Initial Contact')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState(null)
  const [statusChangeRemarks, setStatusChangeRemarks] = useState('')

  useEffect(() => {
    // Update states based on country
    setAvailableStates(formData.country === 'USA' ? USA_STATES : INDIA_STATES)
  }, [formData.country])

  useEffect(() => {
    // Update job titles based on contact type
    if (formData.contact_type === 'healthcare_candidate') {
      setAvailableJobTitles(HEALTHCARE_JOB_TITLES)
    } else if (formData.contact_type === 'it_candidate') {
      setAvailableJobTitles(IT_JOB_TITLES)
    } else {
      setAvailableJobTitles([])
    }
  }, [formData.contact_type])

  // Sync form data when contact prop changes (Bug #7 fix)
  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        contact_type: 'it_candidate',
        visa_status: '',
        job_title: '',
        reasons_for_contact: [],
        status: 'Initial Contact',
        role_types: [],
        country: 'USA',
        state: '',
        city: '',
        years_experience: '',
        referral_source: '',
        recruiting_team_lead: '',
        recruiter: '',
        remarks: '',
        ...contact
      })
      initialStatus.current = contact.status || 'Initial Contact'
    }
  }, [contact])

  const handleChange = (field, value) => {
    // Clear field error when user changes value
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Special handling for status changes
    if (field === 'status' && contact && value !== initialStatus.current) {
      // Bug #15 fix: Don't open another modal if one is already showing
      if (showStatusModal) {
        return  // Prevent multiple modals
      }
      
      // Status is changing - show modal for remarks
      setPendingStatusChange({ field, value })
      setShowStatusModal(true)
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleStatusChangeConfirm = (remarks) => {
    // Apply the pending status change with remarks
    if (pendingStatusChange) {
      setFormData(prev => ({ 
        ...prev, 
        [pendingStatusChange.field]: pendingStatusChange.value 
      }))
      setStatusChangeRemarks(remarks)
      setShowStatusModal(false)
      setPendingStatusChange(null)
    }
  }

  const handleStatusChangeCancel = () => {
    // Cancel the status change
    setShowStatusModal(false)
    setPendingStatusChange(null)
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const newAttachments = files.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      description: '', // Add description field
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))
    setAttachments(prev => [...prev, ...newAttachments])
  }

  const handleAttachmentDescriptionChange = (index, description) => {
    setAttachments(prev => {
      const updated = [...prev]
      updated[index].description = description
      return updated
    })
  }

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => {
      const updated = [...prev]
      // Revoke object URL if it's an image
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview)
      }
      updated.splice(index, 1)
      return updated
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const validateForm = () => {
    const errors = {};

    // Validate first name (2-50 characters, letters and spaces only)
    const firstNameValidation = validateTextField(formData.first_name, {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s'-]+$/,
      fieldName: 'First name'
    });
    if (!firstNameValidation.valid) {
      errors.first_name = firstNameValidation.error;
    }

    // Validate last name (2-50 characters, letters and spaces only)
    const lastNameValidation = validateTextField(formData.last_name, {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s'-]+$/,
      fieldName: 'Last name'
    });
    if (!lastNameValidation.valid) {
      errors.last_name = lastNameValidation.error;
    }

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      errors.email = emailValidation.error;
    }

    // Validate phone (optional but must be valid if provided)
    if (formData.phone && formData.phone.trim()) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        errors.phone = phoneValidation.error;
      }
    }

    // Validate contact type
    const contactTypeValidation = validateSelect(formData.contact_type, { required: true });
    if (!contactTypeValidation.valid) {
      errors.contact_type = contactTypeValidation.error;
    }

    // Validate city (if provided, 2-100 characters)
    if (formData.city && formData.city.trim()) {
      const cityValidation = validateTextField(formData.city, {
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Z\s'-]+$/,
        fieldName: 'City'
      });
      if (!cityValidation.valid) {
        errors.city = cityValidation.error;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate form
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(fieldErrors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      return;
    }

    // Pass form data, attachments, and status change remarks to parent
    const saveData = {
      ...formData,
      // Trim text fields
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      phone: formData.phone ? formData.phone.trim() : '',
      city: formData.city ? formData.city.trim() : '',
      remarks: formData.remarks ? formData.remarks.trim() : '',
      statusChangeRemarks: statusChangeRemarks || null,
      statusChanged: formData.status !== initialStatus.current
    }
    onSave(saveData, attachments)
  }

  const showCandidateFields = formData.contact_type === 'it_candidate' || formData.contact_type === 'healthcare_candidate'

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        {/* Basic Information */}
        <div className="form-group">
          <label>First Name <span style={{ color: 'red' }}>*</span></label>
          <input
            id="first_name"
            type="text"
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            className={fieldErrors.first_name ? 'error' : ''}
            placeholder="John"
            required
          />
          {fieldErrors.first_name && (
            <small className="error-text">{fieldErrors.first_name}</small>
          )}
        </div>

        <div className="form-group">
          <label>Last Name <span style={{ color: 'red' }}>*</span></label>
          <input
            id="last_name"
            type="text"
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            className={fieldErrors.last_name ? 'error' : ''}
            placeholder="Doe"
            required
          />
          {fieldErrors.last_name && (
            <small className="error-text">{fieldErrors.last_name}</small>
          )}
        </div>

        <div className="form-group">
          <label>Email <span style={{ color: 'red' }}>*</span></label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={fieldErrors.email ? 'error' : ''}
            placeholder="john.doe@example.com"
            required
          />
          {fieldErrors.email && (
            <small className="error-text">{fieldErrors.email}</small>
          )}
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={fieldErrors.phone ? 'error' : ''}
            placeholder="(555) 123-4567"
          />
          {fieldErrors.phone && (
            <small className="error-text">{fieldErrors.phone}</small>
          )}
        </div>

        <div className="form-group">
          <label>Contact Type <span style={{ color: 'red' }}>*</span></label>
          <select
            id="contact_type"
            value={formData.contact_type}
            onChange={(e) => handleChange('contact_type', e.target.value)}
            className={fieldErrors.contact_type ? 'error' : ''}
            required
          >
            {CONTACT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          {fieldErrors.contact_type && (
            <small className="error-text">{fieldErrors.contact_type}</small>
          )}
        </div>

        <div className="form-group">
          <label>Status <span style={{ color: 'red' }}>*</span></label>
          <AutocompleteSelect
            options={STATUSES}
            value={formData.status}
            onChange={(value) => handleChange('status', value)}
            placeholder="Select or type status..."
          />
        </div>

        {/* Candidate-specific fields */}
        {showCandidateFields && (
          <>
            <div className="form-group">
              <label>Visa Status</label>
              <AutocompleteSelect
                options={VISA_STATUSES}
                value={formData.visa_status}
                onChange={(value) => handleChange('visa_status', value)}
                placeholder="Select or type visa status..."
              />
            </div>

            <div className="form-group">
              <label>Job Title</label>
              <AutocompleteSelect
                options={availableJobTitles}
                value={formData.job_title}
                onChange={(value) => handleChange('job_title', value)}
                placeholder="Select or type job title..."
              />
            </div>

            <div className="form-group">
              <label>Reasons for Contact</label>
              <MultiSelect
                options={REASONS_FOR_CONTACT}
                selected={formData.reasons_for_contact}
                onChange={(values) => handleChange('reasons_for_contact', values)}
                placeholder="Select reasons..."
              />
            </div>

            <div className="form-group">
              <label>Type of Roles</label>
              <MultiSelect
                options={ROLE_TYPES}
                selected={formData.role_types}
                onChange={(values) => handleChange('role_types', values)}
                placeholder="Select role types..."
              />
            </div>

            <div className="form-group">
              <label>Years of Experience</label>
              <select
                value={formData.years_experience}
                onChange={(e) => handleChange('years_experience', e.target.value)}
              >
                <option value="">Select...</option>
                {YEARS_EXPERIENCE.map(exp => (
                  <option key={exp} value={exp}>{exp}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Referral Source</label>
              <select
                value={formData.referral_source}
                onChange={(e) => handleChange('referral_source', e.target.value)}
              >
                <option value="">Select...</option>
                {REFERRAL_SOURCES.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Location */}
        <div className="form-group">
          <label>Country</label>
          <select
            value={formData.country}
            onChange={(e) => handleChange('country', e.target.value)}
          >
            {COUNTRIES.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>State</label>
          <AutocompleteSelect
            options={availableStates}
            value={formData.state}
            onChange={(value) => handleChange('state', value)}
            placeholder="Select or type state..."
          />
        </div>

        <div className="form-group">
          <label>City</label>
          <input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className={fieldErrors.city ? 'error' : ''}
            placeholder="Enter city..."
          />
          {fieldErrors.city && (
            <small className="error-text">{fieldErrors.city}</small>
          )}
        </div>

        {showCandidateFields && (
          <>
            <div className="form-group">
              <label>Recruiting Team Lead</label>
              <input
                type="text"
                value={formData.recruiting_team_lead}
                onChange={(e) => handleChange('recruiting_team_lead', e.target.value)}
                placeholder="Select from employees..."
              />
              <small>TODO: Autocomplete from employees table</small>
            </div>

            <div className="form-group">
              <label>Recruiter</label>
              <input
                type="text"
                value={formData.recruiter}
                onChange={(e) => handleChange('recruiter', e.target.value)}
                placeholder="Select from employees..."
              />
              <small>TODO: Filter by team lead</small>
            </div>
          </>
        )}
      </div>

      {/* Remarks */}
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label>Remarks / Comments</label>
        <textarea
          value={formData.remarks}
          onChange={(e) => handleChange('remarks', e.target.value)}
          placeholder="Add any additional notes..."
          rows="4"
        />
      </div>

      {/* Attachments */}
      <div className="form-group" style={{ marginTop: '20px' }}>
        <label>Attachments (Resume, Documents, etc.)</label>
        <div className="attachment-upload-area">
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
          />
          <label htmlFor="file-upload" className="btn btn-secondary" style={{ cursor: 'pointer', marginBottom: '12px' }}>
            <span style={{ marginRight: '8px' }}>📎</span>
            Choose Files
          </label>
          <small style={{ display: 'block', color: '#64748b', marginTop: '4px' }}>
            Supported: PDF, DOC, DOCX, TXT, Images (Max 10MB per file)
          </small>

          {/* Attachment List */}
          {attachments.length > 0 && (
            <div className="attachment-list" style={{ marginTop: '16px' }}>
              {attachments.map((attachment, index) => (
                <div key={attachment.id || attachment.name || `attachment-${index}`} className="attachment-item" style={{
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    {attachment.preview ? (
                      <img 
                        src={attachment.preview} 
                        alt={attachment.name}
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', marginRight: '12px' }}
                      />
                    ) : (
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        backgroundColor: '#3b82f6', 
                        borderRadius: '4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginRight: '12px',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {attachment.name.split('.').pop().toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '14px', color: '#1e293b' }}>
                        {attachment.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {formatFileSize(attachment.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="btn btn-danger"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      value={attachment.description || ''}
                      onChange={(e) => handleAttachmentDescriptionChange(index, e.target.value)}
                      placeholder="Add a description (e.g., Resume, Cover Letter, Portfolio...)"  
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        fontSize: '13px',
                        backgroundColor: 'white'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="modal-footer" style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {contact ? 'Update Contact' : 'Create Contact'}
        </button>
      </div>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={showStatusModal}
        oldStatus={initialStatus.current}
        newStatus={pendingStatusChange?.value}
        onConfirm={handleStatusChangeConfirm}
        onCancel={handleStatusChangeCancel}
      />
    </form>
  )
}
