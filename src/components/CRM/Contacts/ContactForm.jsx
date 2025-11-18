import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../../api/supabaseClient'
import { useTenant } from '../../../contexts/TenantProvider'
import AutocompleteSelect from '../common/AutocompleteSelect'
import StatusChangeModal from './StatusChangeModal'
import { formatFileSize } from '../../../utils/fileUtils'
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

// Statuses will be loaded from workflow_status table
const DEFAULT_STATUSES = [
  'Initial Contact', 'Spoke to candidate', 'Resume needs to be prepared', 
  'Resume prepared and sent for review', 'Assigned to Recruiter', 
  'Recruiter started marketing', 'Placed into Job', 'Candidate declined marketing', 
  'Candidate on vacation', 'Candidate not responding', 'Exclusive roles only'
]

const FALLBACK_STATUS_RECORDS = DEFAULT_STATUSES.map((label, index) => ({
  id: `fallback-status-${index}`,
  workflow_status: label
}))

const ROLE_TYPES = ['Remote', 'Hybrid Local', 'Onsite Local', 'Open to Relocate']

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

const FALLBACK_VISA_STATUS_RECORDS = VISA_STATUSES.map((label, index) => ({
  id: `fallback-visa-${index}`,
  visa_status: label
}))

const mapJobTitlesByField = (titles, field) =>
  titles.map((title, index) => ({
    id: `fallback-${field.toLowerCase()}-${index}`,
    job_title: title,
    field: field.toUpperCase()
  }))

const FALLBACK_JOB_TITLE_RECORDS = [
  ...mapJobTitlesByField(IT_JOB_TITLES, 'IT'),
  ...mapJobTitlesByField(HEALTHCARE_JOB_TITLES, 'HEALTHCARE')
]

const FALLBACK_ROLE_TYPE_RECORDS = ROLE_TYPES.map((label, index) => ({
  id: `fallback-role-${index}`,
  type_of_roles: label
}))

const FALLBACK_YEARS_EXPERIENCE_RECORDS = YEARS_EXPERIENCE.map((label, index) => ({
  id: `fallback-years-${index}`,
  years_of_experience: label
}))

const FALLBACK_REFERRAL_SOURCE_RECORDS = REFERRAL_SOURCES.map((label, index) => ({
  id: `fallback-ref-${index}`,
  referral_source: label,
  refered_by: ''
}))

const FALLBACK_REASON_FOR_CONTACT_RECORDS = REASONS_FOR_CONTACT.map((label, index) => ({
  id: `fallback-reason-${index}`,
  label,
  reason_for_contact: label
}))

export default function ContactForm({ contact, onSave, onCancel, isSaving = false }) {
  const { tenant } = useTenant()
  const [statusOptions, setStatusOptions] = useState(FALLBACK_STATUS_RECORDS)
  const [reasonOptions, setReasonOptions] = useState(FALLBACK_REASON_FOR_CONTACT_RECORDS)
  
  // Initialize formData BEFORE useEffects that depend on it
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    contact_type: 'it_candidate',
    visa_status_id: '',
    job_title_id: '',
  reason_for_contact_id: '',
    workflow_status_id: '',
    type_of_roles_id: '',
    country_id: '',
    state_id: '',
    city_id: '',
    years_of_experience_id: '',
    referral_source_id: '',
    recruiting_team_lead: '',
    recruiter: '',
    referred_by: '',
    remarks: '',
    business_id: contact?.business_id || null,
    ...(contact ? {
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      contact_type: contact.contact_type || 'it_candidate',
      visa_status_id: contact.visa_status_id || '',
      job_title_id: contact.job_title_id || '',
      reason_for_contact_id: contact.reason_for_contact_id || '',
      workflow_status_id: contact.workflow_status_id || '',
      type_of_roles_id: contact.type_of_roles_id || '',
      country_id: contact.country_id || '',
      state_id: contact.state_id || '',
      city_id: contact.city_id || '',
      years_of_experience_id: contact.years_of_experience_id || '',
      referral_source_id: contact.referral_source_id || '',
      recruiting_team_lead: contact.recruiting_team_lead || '',
      recruiter: contact.recruiter || '',
      referred_by: contact.referred_by || '',
      remarks: contact.remarks || '',
      business_id: contact.business_id || null,
    } : {})
  })

  const getIdValue = (val, defaultKey = 'id') => {
    if (val == null) return null
    if (typeof val === 'object') {
      if (val[defaultKey] != null) return val[defaultKey]
      if (val.id != null) return val.id
      if (val.value != null) return val.value
      if (val.country_id != null) return val.country_id
      if (val.state_id != null) return val.state_id
      if (val.city_id != null) return val.city_id
    }
    return val
  }
  const extractReferralLabel = (option) => {
    if (!option) return ''
    if (typeof option === 'object') {
      return option.referral_source || option.label || option.name || option.value || ''
    }
    return String(option)
  }
  // Load reason for contact options from DB
  useEffect(() => {
    async function loadReasons() {
      if (!tenant?.tenant_id) {
        setReasonOptions(FALLBACK_REASON_FOR_CONTACT_RECORDS)
        return
      }
      try {
        let query = supabase
          .from('reason_for_contact')
          .select('id, reason_for_contact')
          .eq('tenant_id', tenant.tenant_id)
        
        // Filter by business_id if available from formData (works for both create and edit)
        const businessId = formData.business_id
        if (businessId) {
          query = query.eq('business_id', businessId)
        }
        
        const { data, error } = await query.order('reason_for_contact', { ascending: true })
        if (error) throw error
        const mapped = (data || []).map(row => ({
          id: row.id,
          label: row.reason_for_contact,
          reason_for_contact: row.reason_for_contact
        }))
        setReasonOptions(mapped.length > 0 ? mapped : FALLBACK_REASON_FOR_CONTACT_RECORDS)
      } catch (err) {
        console.error('Error loading reasons for contact:', err)
        setReasonOptions(FALLBACK_REASON_FOR_CONTACT_RECORDS)
      }
    }
    if (tenant?.tenant_id) {
      loadReasons()
    }
  }, [tenant?.tenant_id, formData.business_id])
  // Load statuses from workflow_status table
  useEffect(() => {
    async function loadStatuses() {
      if (!tenant?.tenant_id) {
        setStatusOptions(FALLBACK_STATUS_RECORDS)
        return
      }
      try {
        let query = supabase
          .from('workflow_status')
          .select('id, workflow_status')
          .eq('tenant_id', tenant.tenant_id)
        
        // Filter by business_id if available from formData (works for both create and edit)
        const businessId = formData.business_id
        if (businessId) {
          query = query.eq('business_id', businessId)
        }
        
        const { data, error } = await query.order('workflow_status', { ascending: true })
        if (error) throw error
        const statuses = (data || []).filter(row => row.id && row.workflow_status)
        setStatusOptions(statuses.length > 0 ? statuses : FALLBACK_STATUS_RECORDS)
      } catch (err) {
        console.error('Error loading workflow statuses:', err)
        setStatusOptions(FALLBACK_STATUS_RECORDS)
      }
    }
    if (tenant?.tenant_id) {
      loadStatuses()
    }
  }, [tenant?.tenant_id, formData.business_id])

  const [availableStates, setAvailableStates] = useState([])
  const [availableCities, setAvailableCities] = useState([])
  const [countries, setCountries] = useState([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [visaStatusOptions, setVisaStatusOptions] = useState(FALLBACK_VISA_STATUS_RECORDS)
  const [allJobTitles, setAllJobTitles] = useState(FALLBACK_JOB_TITLE_RECORDS)
  const [availableJobTitles, setAvailableJobTitles] = useState(FALLBACK_JOB_TITLE_RECORDS)
  const [roleTypeOptions, setRoleTypeOptions] = useState(FALLBACK_ROLE_TYPE_RECORDS)
  const [referralSourceOptions, setReferralSourceOptions] = useState(FALLBACK_REFERRAL_SOURCE_RECORDS)
  const [attachments, setAttachments] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [yearsExperienceOptions, setYearsExperienceOptions] = useState(FALLBACK_YEARS_EXPERIENCE_RECORDS)
  
  useEffect(() => {
    async function loadVisaStatuses() {
      if (!tenant?.tenant_id) {
        setVisaStatusOptions(FALLBACK_VISA_STATUS_RECORDS)
        return
      }
      try {
        let query = supabase
          .from('visa_status')
          .select('id, visa_status')
          .eq('tenant_id', tenant.tenant_id)
        
        // Filter by business_id if available from formData (works for both create and edit)
        const businessId = formData.business_id
        if (businessId) {
          query = query.eq('business_id', businessId)
        }
        
        const { data, error } = await query.order('visa_status', { ascending: true })
        if (error) throw error
  const records = Array.isArray(data) ? data : []
  setVisaStatusOptions(records.length > 0 ? records : FALLBACK_VISA_STATUS_RECORDS)
      } catch (err) {
        console.error('Error loading visa statuses:', err)
        setVisaStatusOptions(FALLBACK_VISA_STATUS_RECORDS)
      }
    }
    loadVisaStatuses()
  }, [tenant?.tenant_id, formData.business_id])

  useEffect(() => {
    async function loadJobTitles() {
      if (!tenant?.tenant_id) {
        setAllJobTitles(FALLBACK_JOB_TITLE_RECORDS)
        return
      }
      try {
        let query = supabase
          .from('job_title')
          .select('id, job_title, field')
          .eq('tenant_id', tenant.tenant_id)
        
        // Filter by business_id if available from formData (works for both create and edit)
        const businessId = formData.business_id
        if (businessId) {
          query = query.eq('business_id', businessId)
        }
        
        const { data, error } = await query.order('job_title', { ascending: true })
        if (error) throw error
  const records = Array.isArray(data) ? data : []
  setAllJobTitles(records.length > 0 ? records : FALLBACK_JOB_TITLE_RECORDS)
      } catch (err) {
        console.error('Error loading job titles:', err)
        setAllJobTitles(FALLBACK_JOB_TITLE_RECORDS)
      }
    }
    loadJobTitles()
  }, [tenant?.tenant_id, formData.business_id])

  useEffect(() => {
    async function loadRoleTypes() {
      if (!tenant?.tenant_id) {
        setRoleTypeOptions(FALLBACK_ROLE_TYPE_RECORDS)
        return
      }
      try {
        let query = supabase
          .from('type_of_roles')
          .select('id, type_of_roles')
          .eq('tenant_id', tenant.tenant_id)
        
        // Filter by business_id if available from formData (works for both create and edit)
        const businessId = formData.business_id
        if (businessId) {
          query = query.eq('business_id', businessId)
        }
        
        const { data, error } = await query.order('type_of_roles', { ascending: true })
        if (error) throw error
  const records = Array.isArray(data) ? data : []
  setRoleTypeOptions(records.length > 0 ? records : FALLBACK_ROLE_TYPE_RECORDS)
      } catch (err) {
        console.error('Error loading role types:', err)
        setRoleTypeOptions(FALLBACK_ROLE_TYPE_RECORDS)
      }
    }
    loadRoleTypes()
  }, [tenant?.tenant_id, formData.business_id])

  useEffect(() => {
    async function loadReferralSources() {
      if (!tenant?.tenant_id) {
        setReferralSourceOptions(FALLBACK_REFERRAL_SOURCE_RECORDS)
        return
      }
      try {
        let query = supabase
          .from('referral_sources')
          .select('id, referral_source, refered_by')
          .eq('tenant_id', tenant.tenant_id)
        
        // Filter by business_id if available from formData (works for both create and edit)
        const businessId = formData.business_id
        if (businessId) {
          query = query.eq('business_id', businessId)
        }
        
        const { data, error } = await query.order('referral_source', { ascending: true })
        if (error) throw error
  const records = Array.isArray(data) ? data : []
  setReferralSourceOptions(records.length > 0 ? records : FALLBACK_REFERRAL_SOURCE_RECORDS)
      } catch (err) {
        console.error('Error loading referral sources:', err)
        setReferralSourceOptions(FALLBACK_REFERRAL_SOURCE_RECORDS)
      }
    }
    loadReferralSources()
  }, [tenant?.tenant_id, formData.business_id])

  // Team leads and recruiters
  const [teamLeads, setTeamLeads] = useState([])
  const [recruiters, setRecruiters] = useState([])
  const [loadingTeamLeads, setLoadingTeamLeads] = useState(false)
  const [loadingRecruiters, setLoadingRecruiters] = useState(false)
  
  // Status change tracking
  const initialStatus = useRef(contact?.workflow_status_id || null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState(null)
  const [statusChangeRemarks, setStatusChangeRemarks] = useState('')
  const yearsExperienceAbortController = useRef(null)

  const [runtimeError, setRuntimeError] = useState(null)

  // Load countries on mount
  useEffect(() => {
    loadCountries()
  }, [])

  // Load states when country changes
  useEffect(() => {
    if (formData.country_id) {
      loadStates(formData.country_id)
    } else {
      setAvailableStates([])
      setAvailableCities([])
      setFormData(prev => ({ ...prev, state_id: '', city_id: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.country_id])

  // Load cities when state changes
  useEffect(() => {
    if (formData.state_id) {
      loadCities(formData.state_id)
    } else {
      setAvailableCities([])
      setFormData(prev => ({ ...prev, city_id: '' }))
    }
  }, [formData.state_id])

  // Load team leads on mount
  useEffect(() => {
    if (tenant?.tenant_id) {
      loadTeamLeads()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.tenant_id])

  // Load recruiters when team lead changes or on mount
  useEffect(() => {
    if (tenant?.tenant_id) {
      // Pass the selected team lead name to filter recruiters
      loadRecruiters(formData.recruiting_team_lead)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.tenant_id, formData.recruiting_team_lead])

  useEffect(() => {
    let filtered = allJobTitles

    if (formData.contact_type === 'healthcare_candidate') {
      filtered = allJobTitles.filter(title => (title.field || '').toLowerCase().includes('health'))
    } else if (formData.contact_type === 'it_candidate') {
      filtered = allJobTitles.filter(title => (title.field || '').toLowerCase().includes('it'))
    }

    setAvailableJobTitles(filtered)

    setFormData(prev => {
      if (!prev.job_title_id) {
        return prev
      }

      const currentId = typeof prev.job_title_id === 'object'
        ? prev.job_title_id.id
        : prev.job_title_id

      const hasMatch = filtered.some(title => title.id === currentId)
      if (hasMatch) {
        return prev
      }

      return { ...prev, job_title_id: '' }
    })
  }, [formData.contact_type, allJobTitles])

  // Sync form data when contact prop changes (Bug #7 fix)
  useEffect(() => {
    if (contact) {
      setFormData(prev => ({
        ...prev,
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        contact_type: contact.contact_type || 'it_candidate',
        visa_status_id: contact.visa_status_id || '',
        job_title_id: contact.job_title_id || '',
        reason_for_contact_id: contact.reason_for_contact_id || '',
        status: contact.status || 'Initial Contact',
        type_of_roles_id: contact.type_of_roles_id || '',
        country_id: contact.country_id || '',
        state_id: contact.state_id || '',
        city_id: contact.city_id || '',
        years_of_experience_id: contact.years_of_experience_id || '',
        referral_source_id: contact.referral_source_id || '',
        recruiting_team_lead: contact.recruiting_team_lead || '',
        recruiter: contact.recruiter || '',
        remarks: contact.remarks || ''
      }))
      initialStatus.current = contact.workflow_status_id || null
    } else {
      initialStatus.current = null
    }
  }, [contact])

  useEffect(() => {
    if (!tenant?.tenant_id) {
      setYearsExperienceOptions(FALLBACK_YEARS_EXPERIENCE_RECORDS)
      return
    }

    if (yearsExperienceAbortController.current) {
      yearsExperienceAbortController.current.abort()
    }

    const controller = new AbortController()
    yearsExperienceAbortController.current = controller

    const loadYearsExperience = async () => {
      try {
        let query = supabase
          .from('years_of_experience')
          .select('id, years_of_experience, business_id')
          .eq('tenant_id', tenant.tenant_id)
        
        // Filter by business_id if available from formData (works for both create and edit)
        const businessId = formData.business_id
        if (businessId) {
          query = query.eq('business_id', businessId)
        }
        
        const { data: yearsData, error} = await query
          .order('business_id', { ascending: true, nullsFirst: true })
          .order('years_of_experience', { ascending: true })
          .abortSignal(controller.signal)

        if (error) {
          throw error
        }

        const dedupedMap = new Map()
        ;(yearsData || []).forEach((row) => {
          if (!row.years_of_experience) {
            return
          }
          if (!dedupedMap.has(row.years_of_experience)) {
            dedupedMap.set(row.years_of_experience, row.id)
          }
        })

        const deduped = Array.from(dedupedMap.entries()).map(([label, id]) => ({
          id,
          years_of_experience: label
        }))

        setYearsExperienceOptions(deduped.length > 0 ? deduped : FALLBACK_YEARS_EXPERIENCE_RECORDS)
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        console.error('Error loading years of experience options:', err)
        setYearsExperienceOptions(FALLBACK_YEARS_EXPERIENCE_RECORDS)
      }
    }

    loadYearsExperience()

    return () => {
      controller.abort()
    }
  }, [tenant?.tenant_id, formData.business_id])

  // Load countries from database
  const loadCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('country_id, code, name')
        .order('name')

    if (error) throw error
    setCountries((data || []).map(c => ({ country_id: c.country_id, name: c.name, code: c.code })))
    } catch (err) {
      console.error('Error loading countries:', err)
      setCountries([
        { country_id: 'USA', name: 'USA', code: 'USA' },
        { country_id: 'IN', name: 'India', code: 'IN' }
      ])
    }
  }

  // Load states for selected country
  const loadStates = async (countryValue) => {
    try {
      setLoadingStates(true)

      const countryId = typeof countryValue === 'object'
        ? countryValue.country_id || countryValue.id
        : countryValue

      if (!countryId) {
        setAvailableStates([])
        return
      }

      // If fallback country is selected (non-UUID), return static list
      if (typeof countryId === 'string' && countryId.length !== 36) {
        const fallbackCountry = countries.find(c => c.country_id === countryId || c.code === countryId)
        const countryName = (fallbackCountry?.name || '').toLowerCase()
        const fallbackList = countryName === 'india' ? INDIA_STATES : countryName === 'usa' ? USA_STATES : []
        const mappedFallback = fallbackList.map((state, index) => ({
          state_id: `fallback-state-${index}`,
          name: state,
          code: state
        }))
        setAvailableStates(mappedFallback)
        setFormData(prev => ({ ...prev, state_id: '', city_id: '' }))
        return
      }

      const { data, error } = await supabase
        .from('states')
        .select('state_id, code, name')
        .eq('country_id', countryId)
        .order('name')

      if (error) throw error

      const mappedStates = (data || []).map(s => ({ state_id: s.state_id, name: s.name, code: s.code }))
      setAvailableStates(mappedStates)

      setFormData(prev => {
        if (!prev.state_id) {
          return prev
        }
        const currentStateId = typeof prev.state_id === 'object' ? prev.state_id.state_id : prev.state_id
        const hasState = mappedStates.some(state => state.state_id === currentStateId)
        return hasState ? prev : { ...prev, state_id: '', city_id: '' }
      })
    } catch (err) {
      console.error('Error loading states:', err)
      setAvailableStates([])
      setFormData(prev => ({ ...prev, state_id: '', city_id: '' }))
    } finally {
      setLoadingStates(false)
    }
  }

  // Load cities for selected state
  const loadCities = async (stateValue) => {
    try {
      setLoadingCities(true)

      const stateId = typeof stateValue === 'object'
        ? stateValue.state_id || stateValue.id
        : stateValue

      if (!stateId) {
        setAvailableCities([])
        return
      }

      if (typeof stateId === 'string' && stateId.startsWith('fallback-')) {
        setAvailableCities([])
        setFormData(prev => ({ ...prev, city_id: '' }))
        return
      }

      const { data, error } = await supabase
        .from('cities')
        .select('city_id, name')
        .eq('state_id', stateId)
        .order('name')

      if (error) throw error

      const mappedCities = (data || []).map(c => ({ city_id: c.city_id, name: c.name }))
      setAvailableCities(mappedCities)

      setFormData(prev => {
        if (!prev.city_id) {
          return prev
        }
        const currentCityId = typeof prev.city_id === 'object' ? prev.city_id.city_id : prev.city_id
        const hasCity = mappedCities.some(city => city.city_id === currentCityId)
        return hasCity ? prev : { ...prev, city_id: '' }
      })
    } catch (err) {
      console.error('Error loading cities:', err)
      setAvailableCities([])
      setFormData(prev => ({ ...prev, city_id: '' }))
    } finally {
      setLoadingCities(false)
    }
  }

  // Load team leads from team_members table (staff with LEAD role)
  const loadTeamLeads = async () => {
    if (!tenant?.tenant_id) return
    
    try {
      setLoadingTeamLeads(true)
      
      // Get staff who are team leads (role='LEAD' in team_members)
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          staff:internal_staff(
            staff_id,
            first_name,
            last_name,
            email,
            job_title,
            department
          )
        `)
        .eq('role', 'LEAD')
        .eq('is_active', true)

      if (error) throw error
      
      // Extract unique staff (in case someone is a lead on multiple teams)
      const staffMap = new Map()
      data?.forEach(member => {
        if (member.staff && !staffMap.has(member.staff.staff_id)) {
          staffMap.set(member.staff.staff_id, member.staff)
        }
      })
      
      const uniqueLeads = Array.from(staffMap.values()).sort((a, b) => 
        a.first_name.localeCompare(b.first_name)
      )
      
      setTeamLeads(uniqueLeads)
    } catch (err) {
      console.error('Error loading team leads:', err)
      setTeamLeads([])
    } finally {
      setLoadingTeamLeads(false)
    }
  }

  // Load recruiters from team_members table (staff with RECRUITER role)
  // Optionally filtered by selected team lead
  const loadRecruiters = async (selectedLeadName = null) => {
    if (!tenant?.tenant_id) return
    
    try {
      setLoadingRecruiters(true)
      
      // If a team lead is selected, find their member_id(s) first
      let leadMemberIds = []
      if (selectedLeadName) {
        // Parse the lead name from "FirstName LastName - JobTitle" format
        const leadNameParts = selectedLeadName.split(' - ')[0].trim().split(' ')
        const firstName = leadNameParts[0]
        const lastName = leadNameParts.slice(1).join(' ')
        
        // Find the lead's member_id(s)
        const { data: leadData, error: leadError } = await supabase
          .from('team_members')
          .select(`
            member_id,
            staff:internal_staff!inner(first_name, last_name)
          `)
          .eq('role', 'LEAD')
          .eq('is_active', true)
          .eq('staff.first_name', firstName)
          .eq('staff.last_name', lastName)
        
        if (!leadError && leadData) {
          leadMemberIds = leadData.map(m => m.member_id)
        }
      }
      
      // Build query for recruiters
      let query = supabase
        .from('team_members')
        .select(`
          member_id,
          reports_to_member_id,
          staff:internal_staff(
            staff_id,
            first_name,
            last_name,
            email,
            job_title,
            department
          )
        `)
        .eq('role', 'RECRUITER')
        .eq('is_active', true)
      
      // If lead is selected, filter by reports_to_member_id
      if (leadMemberIds.length > 0) {
        query = query.in('reports_to_member_id', leadMemberIds)
      }

      const { data, error } = await query

      if (error) throw error
      
      // Extract unique staff (in case someone is a recruiter on multiple teams)
      const staffMap = new Map()
      data?.forEach(member => {
        if (member.staff && !staffMap.has(member.staff.staff_id)) {
          staffMap.set(member.staff.staff_id, member.staff)
        }
      })
      
      const uniqueRecruiters = Array.from(staffMap.values()).sort((a, b) => 
        a.first_name.localeCompare(b.first_name)
      )
      
      setRecruiters(uniqueRecruiters)
    } catch (err) {
      console.error('Error loading recruiters:', err)
      setRecruiters([])
    } finally {
      setLoadingRecruiters(false)
    }
  }

  const handleChange = (field, value) => {
    // Clear field error when user changes value
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Special handling for workflow_status_id changes
    if (field === 'workflow_status_id' && contact && value !== initialStatus.current) {
      // Bug #15 fix: Don't open another modal if one is already showing
      if (showStatusModal) {
        return  // Prevent multiple modals
      }
      
      // Status is changing - show modal for remarks
      setPendingStatusChange({ field, value })
      setShowStatusModal(true)
      return
    }

    if (field === 'referral_source_id') {
      const selectedId = getIdValue(value)
      const selectedOption = referralSourceOptions.find(option => {
        const optionId = getIdValue(option)
        return optionId != null && String(optionId) === String(selectedId)
      })
      const label = extractReferralLabel(selectedOption).trim().toLowerCase()
      const isSocial = label === 'facebook' || label === 'google'
      const optionReferedBy = selectedOption && typeof selectedOption === 'object'
        ? selectedOption.refered_by || ''
        : ''
      setFormData(prev => ({
        ...prev,
        referral_source_id: value,
        referred_by: isSocial ? '' : (prev.referred_by || optionReferedBy || '')
      }))
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
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      return;
    }

    // Extract IDs for all lookup fields before saving
    const getId = (val, key = 'id') => getIdValue(val, key)
    const toNumericId = (val) => {
      const resolved = getId(val)
      if (resolved === null || resolved === undefined || resolved === '') {
        return null
      }
      if (typeof resolved === 'number') {
        return resolved
      }
      if (typeof resolved === 'string') {
        const numeric = Number(resolved)
        return Number.isNaN(numeric) ? null : numeric
      }
      return null
    }

    const normalizeGeoId = (val, key) => {
      const resolved = getId(val, key)
      if (!resolved) {
        return null
      }
      if (typeof resolved === 'string' && resolved.length !== 36) {
        return null
      }
      return resolved
    }

    const saveData = {
      ...formData,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      phone: formData.phone ? formData.phone.trim() : '',
      city: formData.city ? formData.city.trim() : '',
      remarks: formData.remarks ? formData.remarks.trim() : '',
      statusChangeRemarks: statusChangeRemarks || null,
      statusChanged: formData.workflow_status_id !== initialStatus.current,
      visa_status_id: toNumericId(formData.visa_status_id),
      job_title_id: toNumericId(formData.job_title_id),
      reason_for_contact_id: toNumericId(formData.reason_for_contact_id),
      workflow_status_id: toNumericId(formData.workflow_status_id),
      type_of_roles_id: toNumericId(formData.type_of_roles_id),
      years_of_experience_id: toNumericId(formData.years_of_experience_id),
      referral_source_id: toNumericId(formData.referral_source_id),
      country_id: normalizeGeoId(formData.country_id, 'country_id'),
      state_id: normalizeGeoId(formData.state_id, 'state_id'),
      city_id: normalizeGeoId(formData.city_id, 'city_id'),
      referral_source_label: extractReferralLabel(selectedReferralSourceOption) || null,
    };
    onSave(saveData, attachments);
  }

  const showCandidateFields = formData.contact_type === 'it_candidate' || formData.contact_type === 'healthcare_candidate'
  
  // Get current status label from workflow_status_id
  const currentStatusLabel = useMemo(() => {
    const selectedId = getIdValue(formData.workflow_status_id)
    if (selectedId == null) return ''
    const statusOption = statusOptions.find(option => {
      const optionId = getIdValue(option)
      return optionId != null && String(optionId) === String(selectedId)
    })
    return statusOption && typeof statusOption === 'object' ? statusOption.workflow_status : ''
  }, [formData.workflow_status_id, statusOptions])
  
  const selectedReferralSourceOption = useMemo(() => {
    const selectedId = getIdValue(formData.referral_source_id)
    if (selectedId == null) {
      return null
    }
    return referralSourceOptions.find(option => {
      const optionId = getIdValue(option)
      if (optionId == null) return false
      return String(optionId) === String(selectedId)
    }) || null
  }, [formData.referral_source_id, referralSourceOptions])

  const shouldShowReferredByInput = useMemo(() => {
    const label = extractReferralLabel(selectedReferralSourceOption).trim().toLowerCase()
    if (!label) return false
    return !(label === 'facebook' || label === 'google')
  }, [selectedReferralSourceOption])

  useEffect(() => {
    if (!shouldShowReferredByInput) {
      setFormData(prev => (prev.referred_by ? { ...prev, referred_by: '' } : prev))
      return
    }

    const optionReferedBy = selectedReferralSourceOption && typeof selectedReferralSourceOption === 'object'
      ? selectedReferralSourceOption.refered_by || ''
      : ''

    if (optionReferedBy) {
      setFormData(prev => (prev.referred_by ? prev : { ...prev, referred_by: optionReferedBy }))
    }
  }, [shouldShowReferredByInput, selectedReferralSourceOption])

  return (
    <>
      {runtimeError && (
        <div style={{ color: 'red', background: '#fee2e2', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          <strong>Runtime Error:</strong> {runtimeError.toString()}
        </div>
      )}
      <form
        onSubmit={e => {
          try {
            handleSubmit(e)
          } catch (err) {
            setRuntimeError(err)
            throw err
          }
        }}
      >
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
              options={statusOptions}
              value={formData.workflow_status_id}
              onChange={(id) => handleChange('workflow_status_id', id)}
              getOptionLabel={option => (typeof option === 'object' ? option.workflow_status : option)}
              getOptionValue={option => (typeof option === 'object' ? option.id : option)}
              placeholder="Select status..."
              allowCustomValue={false}
            />
          </div>

          {/* Candidate-specific fields */}
          {showCandidateFields && (
            <>
              <div className="form-group">
                <label>Visa Status</label>
                <AutocompleteSelect
                  options={visaStatusOptions}
                  value={formData.visa_status_id}
                  onChange={(id) => handleChange('visa_status_id', id)}
                  getOptionLabel={option => (typeof option === 'object' ? option.visa_status : option)}
                  getOptionValue={option => (typeof option === 'object' ? option.id : option)}
                  placeholder="Select visa status..."
                  allowCustomValue={false}
                />
              </div>

              <div className="form-group">
                <label>Job Title</label>
                <AutocompleteSelect
                  options={availableJobTitles}
                  value={formData.job_title_id}
                  onChange={(id) => handleChange('job_title_id', id)}
                  getOptionLabel={option => (typeof option === 'object' ? option.job_title : option)}
                  getOptionValue={option => (typeof option === 'object' ? option.id : option)}
                  placeholder="Select job title..."
                  allowCustomValue={false}
                />
              </div>

              <div className="form-group">
                <label>Reason for Contact</label>
                <AutocompleteSelect
                  options={reasonOptions}
                  value={formData.reason_for_contact_id}
                  onChange={value => handleChange('reason_for_contact_id', value)}
                  getOptionLabel={option => (typeof option === 'object' ? option.label || option.reason_for_contact : option)}
                  getOptionValue={option => (typeof option === 'object' ? option.id : option)}
                  placeholder="Select reason for contact..."
                  allowCustomValue={false}
                />
              </div>

              <div className="form-group">
                <label>Type of Roles</label>
                <AutocompleteSelect
                  options={roleTypeOptions}
                  value={formData.type_of_roles_id}
                  onChange={(id) => handleChange('type_of_roles_id', id)}
                  getOptionLabel={option => (typeof option === 'object' ? option.type_of_roles : option)}
                  getOptionValue={option => (typeof option === 'object' ? option.id : option)}
                  placeholder="Select role type..."
                  allowCustomValue={false}
                />
              </div>

              <div className="form-group">
                <label>Years of Experience</label>
                <AutocompleteSelect
                  options={yearsExperienceOptions}
                  value={formData.years_of_experience_id}
                  onChange={(id) => handleChange('years_of_experience_id', id)}
                  getOptionLabel={option => (typeof option === 'object' ? option.years_of_experience : option)}
                  getOptionValue={option => (typeof option === 'object' ? option.id : option)}
                  placeholder="Select years of experience..."
                  allowCustomValue={false}
                />
              </div>

              <div className="form-group">
                <label>Referral Source</label>
                <AutocompleteSelect
                  options={referralSourceOptions}
                  value={formData.referral_source_id}
                  onChange={(id) => handleChange('referral_source_id', id)}
                  getOptionLabel={option => (typeof option === 'object' ? option.referral_source : option)}
                  getOptionValue={option => (typeof option === 'object' ? option.id : option)}
                  placeholder="Select referral source..."
                  allowCustomValue={false}
                />
              </div>

              {shouldShowReferredByInput && (
                <div className="form-group">
                  <label>Referred By</label>
                  <input
                    type="text"
                    value={formData.referred_by}
                    onChange={(e) => handleChange('referred_by', e.target.value)}
                    placeholder="Enter name of the referring person"
                  />
                </div>
              )}
            </>
          )}

          {/* Location */}
          <div className="form-group">
            <label>Country</label>
            <AutocompleteSelect
              options={countries}
              value={formData.country_id}
              onChange={id => handleChange('country_id', id)}
              getOptionLabel={option => option?.name || ''}
              getOptionValue={option => option?.country_id || ''}
              placeholder="Select country..."
              allowCustomValue={false}
            />
          </div>

          <div className="form-group">
            <label>State {loadingStates && <small>(Loading...)</small>}</label>
            <AutocompleteSelect
              options={availableStates}
              value={formData.state_id}
              onChange={id => handleChange('state_id', id)}
              getOptionLabel={option => (typeof option === 'object' ? option.name : option)}
              getOptionValue={option => (typeof option === 'object' ? option.state_id : option)}
              placeholder="Select state..."
              disabled={!formData.country_id || loadingStates}
              allowCustomValue={false}
            />
          </div>

          <div className="form-group">
            <label>City {loadingCities && <small>(Loading...)</small>}</label>
            <AutocompleteSelect
              options={availableCities}
              value={formData.city_id}
              onChange={id => handleChange('city_id', id)}
              getOptionLabel={option => (typeof option === 'object' ? option.name : option)}
              getOptionValue={option => (typeof option === 'object' ? option.city_id : option)}
              placeholder="Select city..."
              disabled={!formData.state_id || loadingCities}
              allowCustomValue={false}
            />
          </div>

          {showCandidateFields && (
            <>
              {/* Show recruiting team lead and recruiter fields only for specific statuses */}
              {(currentStatusLabel === 'Assigned to Recruiter' || 
                currentStatusLabel === 'Recruiter Started Marketing' || 
                currentStatusLabel === 'Placed into Job' ||
                currentStatusLabel === 'Exclusive Roles Only') && (
                <>
                  <div className="form-group">
                    <label>Recruiting Team Lead {loadingTeamLeads && <small>(Loading...)</small>}</label>
                    <AutocompleteSelect
                      options={teamLeads.map(lead => 
                        `${lead.first_name} ${lead.last_name}${lead.job_title ? ` - ${lead.job_title}` : ''}`
                      )}
                      value={formData.recruiting_team_lead}
                      onChange={(value) => handleChange('recruiting_team_lead', value)}
                      placeholder={loadingTeamLeads ? "Loading team leads..." : "Select recruiting team lead..."}
                      disabled={loadingTeamLeads}
                    />
                  </div>

                  <div className="form-group">
                    <label>Recruiter {loadingRecruiters && <small>(Loading...)</small>}</label>
                    <AutocompleteSelect
                      options={recruiters.map(rec => 
                        `${rec.first_name} ${rec.last_name}${rec.job_title ? ` - ${rec.job_title}` : ''}`
                      )}
                      value={formData.recruiter}
                      onChange={(value) => handleChange('recruiter', value)}
                      placeholder={loadingRecruiters ? "Loading recruiters..." : "Select recruiter..."}
                      disabled={loadingRecruiters}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Remarks */}
        <div className="form-group" style={{ marginTop: '8px' }}>
          <label>Remarks / Comments (Optional)</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            placeholder="Add any additional notes or comments (optional)..."
            rows="4"
          />
        </div>

        {/* Attachments */}
        <div className="form-group" style={{ marginTop: '12px' }}>
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
        <div className="modal-footer" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : contact ? 'Update Contact' : 'Create Contact'}
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
    </>
  )
}
