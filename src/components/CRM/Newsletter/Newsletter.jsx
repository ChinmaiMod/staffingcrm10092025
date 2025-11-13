import { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthProvider'
import { supabase as supabaseClient } from '../../../api/supabaseClient'
import { generateNewsletterContent, sendNewsletter } from '../../../api/edgeFunctions'
import './Newsletter.css'

export default function Newsletter() {
  const { session, profile } = useAuth()
  const tenant = profile?.tenant_id

  const [businesses, setBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [aiPrompts, setAiPrompts] = useState([])
  const [selectedPrompt, setSelectedPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [sending, setSending] = useState(false)

  // Newsletter form data
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    header: '',
    footer: '',
    logoUrl: '',
    businessDescription: ''
  })

  // Recipient filters
  const [filters, setFilters] = useState({
    sendToAll: false,
    contactType: '',
    jobTitleId: '',
    yearsExperienceId: '',
    workflowStatusId: '',
    visaStatusId: '',
    countryId: '',
    stateId: '',
    cityId: ''
  })

  // Lookup data
  const [lookups, setLookups] = useState({
    jobTitles: {},
    yearsExperience: {},
    contactTypes: {},
    workflowStatus: {},
    visaStatus: {},
    countries: {},
    states: {},
    cities: {}
  })

  useEffect(() => {
    if (tenant) {
      loadBusinesses()
      loadAiPrompts()
      loadLookups()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant])

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('businesses')
        .select('business_id, business_name')
        .eq('tenant_id', tenant)
        .eq('is_active', true)
        .order('business_name')

      if (error) throw error
      setBusinesses(data || [])
      if (data && data.length === 1) setSelectedBusiness(data[0].business_id)
    } catch (error) {
      console.error('Error loading businesses:', error)
    }
  }

  const loadAiPrompts = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('ai_prompts')
        .select('*')
        .eq('tenant_id', tenant)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setAiPrompts(data || [])
    } catch (error) {
      console.error('Error loading AI prompts:', error)
    }
  }

  const loadLookups = async () => {
    if (!tenant) return

    const tables = [
      { key: 'job_title', mapKey: 'jobTitles', id: 'id', label: 'job_title' },
      { key: 'years_of_experience', mapKey: 'yearsExperience', id: 'id', label: 'years_of_experience' },
      { key: 'workflow_status', mapKey: 'workflowStatus', id: 'id', label: 'workflow_status' },
      { key: 'visa_status', mapKey: 'visaStatus', id: 'id', label: 'visa_status' },
      { key: 'countries', mapKey: 'countries', id: 'country_id', label: 'name' },
    ]

    const newLookups = { ...lookups }

    for (const tbl of tables) {
      try {
        let query = supabaseClient.from(tbl.key).select(`${tbl.id}, ${tbl.label}`)
        if (tbl.key !== 'countries') {
          query = query.eq('tenant_id', tenant)
        }
        const { data, error } = await query
        if (!error && data) {
          newLookups[tbl.mapKey] = {}
          data.forEach(row => {
            newLookups[tbl.mapKey][row[tbl.id]] = row[tbl.label]
          })
        }
      } catch (err) {
        console.error(`Error loading ${tbl.key}:`, err)
      }
    }

    // Contact types are predefined
    newLookups.contactTypes = {
      'IT_CANDIDATE': 'IT Candidate',
      'HEALTHCARE_CANDIDATE': 'Healthcare Candidate',
      'VENDOR_CLIENT': 'Vendor Client',
      'VENDOR_EMPANELMENT': 'Vendor Empanelment',
      'EMPLOYEE_INDIA': 'Employee India',
      'EMPLOYEE_USA': 'Employee USA'
    }

    setLookups(newLookups)
  }

  const handleGenerateWithAI = async () => {
    if (!selectedPrompt) {
      alert('Please select an AI prompt first')
      return
    }

    const prompt = aiPrompts.find(p => p.prompt_id === selectedPrompt)
    if (!prompt) return

    try {
      setAiGenerating(true)
      const result = await generateNewsletterContent(
        formData.body || formData.businessDescription,
        prompt.prompt_text,
        tenant,
        session?.access_token,
        prompt.model || null  // Pass the model from the selected prompt
      )

      if (result.error) throw new Error(result.error)
      
      // Update the body with AI-generated content
      setFormData({ ...formData, body: result.content || result.generatedContent || '' })
    } catch (error) {
      console.error('AI generation error:', error)
      alert('Failed to generate content: ' + error.message)
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSendNewsletter = async () => {
    if (!selectedBusiness) {
      alert('Please select a business')
      return
    }

    if (!formData.subject || !formData.body) {
      alert('Please fill in subject and body')
      return
    }

    if (!filters.sendToAll && !Object.values(filters).slice(1).some(v => v)) {
      alert('Please select recipient filters or choose "Send to All Contacts"')
      return
    }

    try {
      setSending(true)
      const result = await sendNewsletter({
        businessId: selectedBusiness,
        tenantId: tenant,
        subject: formData.subject,
        bodyHtml: buildFullHtmlTemplate(),
        headerHtml: formData.header || '',
        footerHtml: formData.footer || '',
        logoUrl: formData.logoUrl || '',
        recipientFilters: filters.sendToAll ? null : {
          contactType: filters.contactType || null,
          jobTitleId: filters.jobTitleId || null,
          yearsExperienceId: filters.yearsExperienceId || null,
          workflowStatusId: filters.workflowStatusId || null,
          visaStatusId: filters.visaStatusId || null,
          countryId: filters.countryId || null,
          stateId: filters.stateId || null,
          cityId: filters.cityId || null
        },
        sendToAll: filters.sendToAll
      }, session?.access_token)

      if (result.error) throw new Error(result.error)

      alert(`Newsletter sent successfully! ${result.sentCount || 0} emails sent, ${result.failedCount || 0} failed.`)
      
      // Reset form
      setFormData({
        subject: '',
        body: '',
        header: '',
        footer: '',
        logoUrl: '',
        businessDescription: ''
      })
      setFilters({
        sendToAll: false,
        contactType: '',
        jobTitleId: '',
        yearsExperienceId: '',
        workflowStatusId: '',
        visaStatusId: '',
        countryId: '',
        stateId: '',
        cityId: ''
      })
    } catch (error) {
      console.error('Send newsletter error:', error)
      alert('Failed to send newsletter: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const buildFullHtmlTemplate = () => {
    // This is just the body - header, logo, and footer are added in the Edge Function
    // We pass them separately so the Edge Function can assemble them properly
    return formData.body
  }

  const getPlaceholderPreview = () => {
    return formData.body
      .replace(/{first_name}/g, 'John')
      .replace(/{last_name}/g, 'Doe')
      .replace(/{business_name}/g, businesses.find(b => b.business_id === selectedBusiness)?.business_name || 'Your Company')
      .replace(/{email}/g, 'john.doe@example.com')
  }

  return (
    <div className="newsletter-page">
      <div className="crm-header">
        <h1>Newsletter</h1>
        <p style={{ margin: 0, color: '#64748b' }}>Create and send newsletters to contacts</p>
      </div>

      <div className="newsletter-container">
        {/* Business Selection */}
        <div className="newsletter-section">
          <h2>Business Selection</h2>
          <select
            value={selectedBusiness || ''}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="form-select"
            required
          >
            <option value="">Select a Business</option>
            {businesses.map(b => (
              <option key={b.business_id} value={b.business_id}>{b.business_name}</option>
            ))}
          </select>
        </div>

        {/* Template Editor */}
        <div className="newsletter-section">
          <h2>Newsletter Template</h2>
          
          <div className="form-group">
            <label>Logo URL</label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Header HTML</label>
            <textarea
              value={formData.header}
              onChange={(e) => setFormData({ ...formData, header: e.target.value })}
              placeholder="<div style='background: #f0f0f0; padding: 20px;'><h1>Newsletter Header</h1></div>"
              rows={4}
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label>Email Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Monthly Newsletter - March 2024"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Body HTML * (Use placeholders: {"{first_name}"}, {"{last_name}"}, {"{business_name}"}, {"{email}"})</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="<p>Hi {first_name},</p><p>This is your newsletter content...</p>"
              rows={12}
              className="form-textarea"
              required
            />
            
            {/* AI Writing Assistant */}
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={selectedPrompt}
                onChange={(e) => setSelectedPrompt(e.target.value)}
                className="form-select"
                style={{ flex: 1 }}
              >
                <option value="">Select AI Prompt...</option>
                {aiPrompts.map(p => (
                  <option key={p.prompt_id} value={p.prompt_id}>{p.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGenerateWithAI}
                disabled={!selectedPrompt || aiGenerating}
              >
                {aiGenerating ? 'Generating...' : '✍️ Write with AI'}
              </button>
            </div>
            <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
              Describe what you want to write below, then select a prompt and click &quot;Write with AI&quot;
            </small>
            <textarea
              value={formData.businessDescription}
              onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
              placeholder="Describe the newsletter content you want to create..."
              rows={3}
              className="form-textarea"
              style={{ marginTop: '8px' }}
            />
          </div>

          <div className="form-group">
            <label>Footer HTML</label>
            <textarea
              value={formData.footer}
              onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
              placeholder="<div style='background: #f0f0f0; padding: 20px; text-align: center;'><p>© 2024 Your Company</p></div>"
              rows={4}
              className="form-textarea"
            />
          </div>

          <div className="preview-section">
            <h3>Preview (with sample data)</h3>
            <div 
              className="preview-box"
              dangerouslySetInnerHTML={{ __html: getPlaceholderPreview() }}
            />
          </div>
        </div>

        {/* Recipient Filters */}
        <div className="newsletter-section">
          <h2>Recipient Selection</h2>
          
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={filters.sendToAll}
                onChange={(e) => setFilters({ ...filters, sendToAll: e.target.checked })}
              />
              {' '}Send to All Contacts of Selected Business
            </label>
          </div>

          {!filters.sendToAll && (
            <>
              <div className="form-group">
                <label>Contact Type</label>
                <select
                  value={filters.contactType}
                  onChange={(e) => setFilters({ ...filters, contactType: e.target.value })}
                  className="form-select"
                >
                  <option value="">All Contact Types</option>
                  {Object.entries(lookups.contactTypes).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Job Title</label>
                <select
                  value={filters.jobTitleId}
                  onChange={(e) => setFilters({ ...filters, jobTitleId: e.target.value })}
                  className="form-select"
                >
                  <option value="">All Job Titles</option>
                  {Object.entries(lookups.jobTitles).map(([id, title]) => (
                    <option key={id} value={id}>{title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Years of Experience</label>
                <select
                  value={filters.yearsExperienceId}
                  onChange={(e) => setFilters({ ...filters, yearsExperienceId: e.target.value })}
                  className="form-select"
                >
                  <option value="">All Experience Levels</option>
                  {Object.entries(lookups.yearsExperience).map(([id, exp]) => (
                    <option key={id} value={id}>{exp}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Workflow Status</label>
                <select
                  value={filters.workflowStatusId}
                  onChange={(e) => setFilters({ ...filters, workflowStatusId: e.target.value })}
                  className="form-select"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(lookups.workflowStatus).map(([id, status]) => (
                    <option key={id} value={id}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Visa Status</label>
                <select
                  value={filters.visaStatusId}
                  onChange={(e) => setFilters({ ...filters, visaStatusId: e.target.value })}
                  className="form-select"
                >
                  <option value="">All Visa Statuses</option>
                  {Object.entries(lookups.visaStatus).map(([id, status]) => (
                    <option key={id} value={id}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Country</label>
                <select
                  value={filters.countryId}
                  onChange={(e) => setFilters({ ...filters, countryId: e.target.value, stateId: '', cityId: '' })}
                  className="form-select"
                >
                  <option value="">All Countries</option>
                  {Object.entries(lookups.countries).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Send Button */}
        <div className="newsletter-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSendNewsletter}
            disabled={sending || !selectedBusiness || !formData.subject || !formData.body}
          >
            {sending ? 'Sending Newsletter...' : '📧 Send Newsletter'}
          </button>
        </div>
      </div>
    </div>
  )
}

