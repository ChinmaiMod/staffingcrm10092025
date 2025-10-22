import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../api/supabaseClient'
import { useTenant } from '../../../contexts/TenantProvider'
import MultiSelect from '../common/MultiSelect'
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

// Statuses will be loaded from contact_statuses table
const DEFAULT_STATUSES = [
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

export default function ContactForm({ contact, onSave, onCancel, isSaving = false }) {
  const { tenant } = useTenant()
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUSES)
  const [reasonOptions, setReasonOptions] = useState([])
  // Load reason for contact options from DB
  useEffect(() => {
    async function loadReasons() {
      if (!tenant?.tenant_id) {
        setReasonOptions([])
        return
      }
      try {
        const { data, error } = await supabase
          .from('reason_for_contact')
          .select('id, reason_label')
          .eq('tenant_id', tenant.tenant_id)
          .order('reason_label', { ascending: true })
        if (error) throw error
        setReasonOptions((data || []).map(row => ({ id: row.id, label: row.reason_label })))
      } catch (err) {
        setReasonOptions([])
      }
    }
    loadReasons()
  }, [tenant?.tenant_id])
  // Load statuses from contact_statuses table
  useEffect(() => {
    async function loadStatuses() {
      if (!tenant?.tenant_id) {
        setStatusOptions(DEFAULT_STATUSES)
        return
      }
      try {
        const { data, error } = await supabase
          .from('contact_statuses')
          .select('status_name')
          .eq('tenant_id', tenant.tenant_id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
        if (error) throw error
        const statuses = (data || []).map(row => row.status_name).filter(Boolean)
        setStatusOptions(statuses.length > 0 ? statuses : DEFAULT_STATUSES)
      } catch (err) {
        setStatusOptions(DEFAULT_STATUSES)
      }
    }
    loadStatuses()
  }, [tenant?.tenant_id])
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    contact_type: 'it_candidate',
    visa_status_id: '',
    job_title_id: '',
  reason_for_contact_id: '',
    status: 'Initial Contact',
    type_of_roles_id: '',
    country_id: '',
    state_id: '',
    city_id: '',
    years_of_experience_id: '',
    referral_source_id: '',
    recruiting_team_lead: '',
    recruiter: '',
    remarks: '',
    ...(contact ? {
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
      remarks: contact.remarks || '',
    } : {})
  })

  const [availableStates, setAvailableStates] = useState([])
  const [availableCities, setAvailableCities] = useState([])
  const [countries, setCountries] = useState([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [availableJobTitles, setAvailableJobTitles] = useState(IT_JOB_TITLES)
  const [attachments, setAttachments] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [yearsExperienceOptions, setYearsExperienceOptions] = useState(YEARS_EXPERIENCE)
  const [loadingYearsExperience, setLoadingYearsExperience] = useState(false)
  
  // Team leads and recruiters
  const [teamLeads, setTeamLeads] = useState([])
  const [recruiters, setRecruiters] = useState([])
  const [loadingTeamLeads, setLoadingTeamLeads] = useState(false)
  const [loadingRecruiters, setLoadingRecruiters] = useState(false)
  
  // Status change tracking
  const initialStatus = useRef(contact?.status || 'Initial Contact')
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
      // If country_id is an object, use its name; if string, find object in countries array
      let countryName = '';
      if (typeof formData.country_id === 'object') {
        countryName = formData.country_id.name;
      } else {
        const countryObj = countries.find(c => c.country_id === formData.country_id);
        countryName = countryObj ? countryObj.name : formData.country_id;
      }
      loadStates(countryName);
    } else {
      setAvailableStates([]);
      setAvailableCities([]);
      // Only reset if country was actually changed (not initial load)
      if (contact && contact.country_id !== formData.country_id) {
        setFormData(prev => ({ ...prev, state_id: '', city_id: '' }));
      }
    }
  }, [formData.country_id])

  // Load cities when state changes
  useEffect(() => {
    if (formData.state_id) {
      // If state_id is an object, use its name; if string, find object in availableStates array
      let stateName = '';
      if (typeof formData.state_id === 'object') {
        stateName = formData.state_id.name;
      } else {
        const stateObj = availableStates.find(s => s.state_id === formData.state_id);
        stateName = stateObj ? stateObj.name : formData.state_id;
      }
      loadCities(stateName);
    } else {
      setAvailableCities([])
      // Only reset if state was actually changed (not initial load)
      if (contact && contact.state_id !== formData.state_id) {
        setFormData(prev => ({ ...prev, city_id: '' }))
      }
    }
  }, [formData.state_id])

  // Load team leads on mount
  useEffect(() => {
    if (tenant?.tenant_id) {
      loadTeamLeads()
    }
  }, [tenant?.tenant_id])

  // Load recruiters when team lead changes or on mount
  useEffect(() => {
    if (tenant?.tenant_id) {
      // Pass the selected team lead name to filter recruiters
      loadRecruiters(formData.recruiting_team_lead)
    }
  }, [tenant?.tenant_id, formData.recruiting_team_lead])

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
      // Helper to normalize lookup arrays to [{id, label}] format
      const normalizeOptions = (arr, labelKey = 'label', idKey = 'id') => {
        if (!Array.isArray(arr)) return [];
        return arr.map(opt =>
          typeof opt === 'object' ? opt : { id: opt, [labelKey]: opt }
        );
      };

      // Normalize all lookup arrays
      const visaStatusOptions = normalizeOptions(VISA_STATUSES, 'visa_status', 'id');
      const jobTitleOptions = normalizeOptions(availableJobTitles, 'job_title', 'id');
      const roleTypeOptions = normalizeOptions(ROLE_TYPES, 'type_of_roles', 'id');
      const yearsExpOptions = normalizeOptions(yearsExperienceOptions, 'years_of_experience', 'id');
      const referralSourceOptions = normalizeOptions(REFERRAL_SOURCES, 'referral_source', 'id');

      // Map all lookup IDs to option objects for display
  // Country mapping: always pass object or null
  const countryObj = countries.find(c => c.country_id === contact.country_id) || null;
      const stateObj = availableStates.find(s => s.state_id === contact.state_id) || '';
      const cityObj = availableCities.find(c => c.city_id === contact.city_id) || '';
      const visaStatusObj = visaStatusOptions.find(v => v.id === contact.visa_status_id) || visaStatusOptions.find(v => v.visa_status === contact.visa_status_id) || '';
      const jobTitleObj = jobTitleOptions.find(j => j.id === contact.job_title_id) || jobTitleOptions.find(j => j.job_title === contact.job_title_id) || '';
      const typeOfRolesObj = roleTypeOptions.find(r => r.id === contact.type_of_roles_id) || roleTypeOptions.find(r => r.type_of_roles === contact.type_of_roles_id) || '';
      const yearsExpObj = yearsExpOptions.find(y => y.id === contact.years_of_experience_id) || yearsExpOptions.find(y => y.years_of_experience === contact.years_of_experience_id) || '';
      const referralSourceObj = referralSourceOptions.find(r => r.id === contact.referral_source_id) || referralSourceOptions.find(r => r.referral_source === contact.referral_source_id) || '';
      setFormData({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        contact_type: contact.contact_type || 'it_candidate',
        visa_status_id: visaStatusObj,
        job_title_id: jobTitleObj,
        reasons_for_contact: contact.reasons_for_contact || [],
        status: contact.status || 'Initial Contact',
        type_of_roles_id: typeOfRolesObj,
        country_id: countryObj,
        state_id: stateObj,
        city_id: cityObj,
        years_of_experience_id: yearsExpObj,
        referral_source_id: referralSourceObj,
        recruiting_team_lead: contact.recruiting_team_lead || '',
        recruiter: contact.recruiter || '',
        remarks: contact.remarks || '',
      });
      initialStatus.current = contact.status || 'Initial Contact';
    }
  }, [contact])

  useEffect(() => {
    if (!tenant?.tenant_id) {
      setYearsExperienceOptions(YEARS_EXPERIENCE)
      return
    }

    if (yearsExperienceAbortController.current) {
      yearsExperienceAbortController.current.abort()
    }

    const controller = new AbortController()
    yearsExperienceAbortController.current = controller

    const loadYearsExperience = async () => {
      try {
        setLoadingYearsExperience(true)

        const { data: yearsData, error } = await supabase
          .from('years_of_experience')
          .select('years_of_experience, business_id')
          .eq('tenant_id', tenant.tenant_id)
          .order('business_id', { ascending: true, nullsFirst: true })
          .order('years_of_experience', { ascending: true })
          .abortSignal(controller.signal)

        if (error) {
          throw error
        }

        const deduped = Array.from(
          new Set((yearsData || []).map((row) => row.years_of_experience).filter(Boolean))
        )

        setYearsExperienceOptions(deduped.length > 0 ? deduped : YEARS_EXPERIENCE)
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        setYearsExperienceOptions(YEARS_EXPERIENCE)
      } finally {
        if (!controller.signal.aborted) {
          setLoadingYearsExperience(false)
        }
      }
    }

    loadYearsExperience()

    return () => {
      controller.abort()
    }
  }, [tenant?.tenant_id])

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
  const loadStates = async (countryName) => {
    try {
      setLoadingStates(true)
      
      const { data: countryData, error: countryError } = await supabase
        .from('countries')
        .select('country_id')
        .eq('name', countryName)
        .single()

      if (countryError) throw countryError

      const { data, error } = await supabase
        .from('states')
        .select('state_id, code, name')
        .eq('country_id', countryData.country_id)
        .order('name')

      if (error) throw error
  setAvailableStates((data || []).map(s => ({ state_id: s.state_id, name: s.name, code: s.code })))
    } catch (err) {
      console.error('Error loading states:', err)
      // Fallback to hardcoded lists
  setAvailableStates((countryName === 'USA' ? USA_STATES : INDIA_STATES).map(s => ({ state_id: s, name: s, code: s })))
    } finally {
      setLoadingStates(false)
    }
  }

  // Load cities for selected state
  const loadCities = async (stateName) => {
    try {
      setLoadingCities(true)
      
      const { data: stateData, error: stateError } = await supabase
        .from('states')
        .select('state_id')
        .eq('name', stateName)
        .single()

      if (stateError) throw stateError

      const { data, error } = await supabase
        .from('cities')
        .select('city_id, name')
        .eq('state_id', stateData.state_id)
        .order('name')

      if (error) throw error
  setAvailableCities((data || []).map(c => ({ city_id: c.city_id, name: c.name })))
    } catch (err) {
      console.error('Error loading cities:', err)
  setAvailableCities([])
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
    const getId = (val, key = 'id') => (val && typeof val === 'object' ? val[key] : val);
    // Ensure job_title_id is always an ID, not a label string
    let jobTitleId = formData.job_title_id;
    if (jobTitleId && typeof jobTitleId === 'string') {
      // Try to find the matching job title object by label
      const jobTitleObj = (availableJobTitles || []).find(j => j.job_title === jobTitleId);
      jobTitleId = jobTitleObj ? jobTitleObj.id : jobTitleId;
    } else if (jobTitleId && typeof jobTitleId === 'object') {
      jobTitleId = jobTitleId.id;
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
      statusChanged: formData.status !== initialStatus.current,
      visa_status_id: getId(formData.visa_status_id),
      job_title_id: jobTitleId,
      reason_for_contact_id: getId(formData.reason_for_contact_id),
      type_of_roles_id: getId(formData.type_of_roles_id),
      years_of_experience_id: getId(formData.years_of_experience_id),
      referral_source_id: getId(formData.referral_source_id),
      country_id: getId(formData.country_id, 'country_id'),
      state_id: getId(formData.state_id, 'state_id'),
      city_id: getId(formData.city_id, 'city_id'),
    };
    onSave(saveData, attachments);
  }

  const showCandidateFields = formData.contact_type === 'it_candidate' || formData.contact_type === 'healthcare_candidate'

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
                  value={formData.visa_status_id}
                  onChange={(id) => handleChange('visa_status_id', id)}
                  getOptionLabel={option => option.visa_status}
                  getOptionValue={option => option.id}
                  placeholder="Select visa status..."
                />
              </div>

              <div className="form-group">
                <label>Job Title</label>
                <AutocompleteSelect
                  options={availableJobTitles}
                  value={formData.job_title_id}
                  onChange={(id) => handleChange('job_title_id', id)}
                  getOptionLabel={option => option.job_title}
                  getOptionValue={option => option.id}
                  placeholder="Select job title..."
                />
              </div>

              <div className="form-group">
                <label>Reason for Contact</label>
                <AutocompleteSelect
                  options={reasonOptions}
                  value={formData.reason_for_contact_id}
                  onChange={option => handleChange('reason_for_contact_id', option)}
                  getOptionLabel={option => (typeof option === 'object' ? option.label : option)}
                  getOptionValue={option => (typeof option === 'object' ? option.id : option)}
                  placeholder="Select reason for contact..."
                />
              </div>

              <div className="form-group">
                <label>Type of Roles</label>
                <AutocompleteSelect
                  options={ROLE_TYPES}
                  value={formData.type_of_roles_id}
                  onChange={(id) => handleChange('type_of_roles_id', id)}
                  getOptionLabel={option => (typeof option === 'string' ? option : option.type_of_roles)}
                  getOptionValue={option => (typeof option === 'string' ? option : option.id)}
                  placeholder="Select role type..."
                />
              </div>

              <div className="form-group">
                <label>Years of Experience</label>
                <AutocompleteSelect
                  options={yearsExperienceOptions}
                  value={formData.years_of_experience_id}
                  onChange={(id) => handleChange('years_of_experience_id', id)}
                  getOptionLabel={option => option.years_of_experience}
                  getOptionValue={option => option.id}
                  placeholder="Select years of experience..."
                />
              </div>

              <div className="form-group">
                <label>Referral Source</label>
                <AutocompleteSelect
                  options={REFERRAL_SOURCES}
                  value={formData.referral_source_id}
                  onChange={(id) => handleChange('referral_source_id', id)}
                  getOptionLabel={option => (typeof option === 'string' ? option : option.referral_source)}
                  getOptionValue={option => (typeof option === 'string' ? option : option.id)}
                  placeholder="Select referral source..."
                />
              </div>
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
            />
          </div>

          {showCandidateFields && (
            <>
              {/* Show recruiting team lead and recruiter fields only for specific statuses */}
              {(formData.status === 'Assigned to Recruiter' || 
                formData.status === 'Recruiter started marketing' || 
                formData.status === 'Placed into Job' ||
                formData.status === 'Exclusive roles only') && (
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
