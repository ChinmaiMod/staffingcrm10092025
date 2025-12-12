import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../api/supabaseClient'
import { useAuth } from '../../../contexts/AuthProvider'
import { usePermissions } from '../../../contexts/PermissionsProvider'
import { useTenant } from '../../../contexts/TenantProvider'
import { validateTextField, handleSupabaseError, handleError } from '../../../utils/validators'
import './PipelineAdmin.css'

export default function PipelineAdmin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { permissions, loading: permissionsLoading } = usePermissions()
  const { tenant } = useTenant()
  const [pipelines, setPipelines] = useState([])
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingBusinesses, setLoadingBusinesses] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [businessOptions, setBusinessOptions] = useState([])
  
  // Form states
  const [showPipelineForm, setShowPipelineForm] = useState(false)
  const [showStageForm, setShowStageForm] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState(null)
  const [editingStage, setEditingStage] = useState(null)
  
  // Validation error states
  const [pipelineFieldErrors, setPipelineFieldErrors] = useState({})
  const [stageFieldErrors, setStageFieldErrors] = useState({})
  
  const [pipelineForm, setPipelineForm] = useState({
    name: '',
    description: '',
    color: '#4F46E5',
    icon: '📊',
    is_default: false,
    business_id: ''
  })
  
  const [stageForm, setStageForm] = useState({
    name: '',
    description: '',
    color: '#6366F1',
    display_order: 0,
    is_final: false
  })

  const canViewPipelines = Boolean(
    permissions?.can_view_all_records ||
      permissions?.can_view_subordinate_records ||
      permissions?.can_view_own_records
  )

  const canCreatePipelines = Boolean(permissions?.can_create_records)

  const canEditPipelines = Boolean(
    permissions?.can_edit_all_records ||
      permissions?.can_edit_subordinate_records ||
      permissions?.can_edit_own_records
  )

  const canDeletePipelines = Boolean(
    permissions?.can_delete_all_records ||
      permissions?.can_delete_subordinate_records ||
      permissions?.can_delete_own_records
  )

  const businessLookup = useMemo(() => {
    return (businessOptions || []).reduce((acc, business) => {
      if (!business?.business_id) return acc
      acc[business.business_id] = business.business_name
      return acc
    }, {})
  }, [businessOptions])

  const fetchPipelines = useCallback(async () => {
    if (!tenant?.tenant_id) {
      setPipelines([])
      setSelectedPipeline(null)
      setLoading(false)
      return
    }

    if (!canViewPipelines) {
      setPipelines([])
      setSelectedPipeline(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .order('display_order', { ascending: true })
      
      if (error) throw error
      
      setPipelines(data || [])
      if (data && data.length > 0) {
        const currentSelection = data.find((p) => p.pipeline_id === selectedPipeline?.pipeline_id)
        setSelectedPipeline(currentSelection || data[0])
      } else {
        setSelectedPipeline(null)
      }
    } catch (err) {
      console.error('Error fetching pipelines:', err)
      setError('Failed to load pipelines')
    } finally {
      setLoading(false)
    }
  }, [selectedPipeline?.pipeline_id, tenant?.tenant_id, canViewPipelines])

  useEffect(() => {
    if (!tenant?.tenant_id) {
      setBusinessOptions([])
      setLoadingBusinesses(false)
      return
    }

    let isCancelled = false
    const controller = new AbortController()

    const loadBusinesses = async () => {
      try {
        setLoadingBusinesses(true)
        const { data, error } = await supabase
          .from('businesses')
          .select('business_id, business_name, is_default, is_active')
          .eq('tenant_id', tenant.tenant_id)
          .order('is_default', { ascending: false })
          .order('business_name', { ascending: true })
          .abortSignal(controller.signal)

        if (error) throw error

        if (!isCancelled) {
          setBusinessOptions(data || [])
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Error loading businesses for pipelines:', err)
        if (!isCancelled) {
          setBusinessOptions([])
          setError('Unable to load businesses. Please refresh and try again.')
        }
      } finally {
        if (!isCancelled) {
          setLoadingBusinesses(false)
        }
      }
    }

    loadBusinesses()

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [tenant?.tenant_id])

  useEffect(() => {
    fetchPipelines()
  }, [fetchPipelines])

  useEffect(() => {
    if (selectedPipeline) {
      fetchStages(selectedPipeline.pipeline_id)
    }
  }, [selectedPipeline])

  const fetchStages = async (pipelineId) => {
    try {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('display_order', { ascending: true })
      
      if (error) throw error
      setStages(data || [])
    } catch (err) {
      console.error('Error fetching stages:', err)
      setError('Failed to load stages')
    }
  }

  const handleCreatePipeline = () => {
    if (!canCreatePipelines) {
      setError('You do not have permission to create pipelines.')
      return
    }
    if (businessOptions.length === 0) {
      setError('Create a business before configuring pipelines.')
      return
    }
    const defaultBusinessId = businessOptions.find((biz) => biz.is_default)?.business_id
    const fallbackBusinessId = defaultBusinessId || businessOptions[0]?.business_id || ''
    setEditingPipeline(null)
    setPipelineForm({
      name: '',
      description: '',
      color: '#4F46E5',
      icon: '📊',
      is_default: false,
      business_id: fallbackBusinessId
    })
    setPipelineFieldErrors({})
    setError('')
    setSuccess('')
    setShowPipelineForm(true)
  }

  const handleEditPipeline = (pipeline) => {
    if (!canEditPipelines) {
      setError('You do not have permission to edit pipelines.')
      return
    }
    setEditingPipeline(pipeline)
    setPipelineForm({
      name: pipeline.name,
      description: pipeline.description || '',
      color: pipeline.color || '#4F46E5',
      icon: pipeline.icon || '📊',
      is_default: pipeline.is_default || false,
      business_id: pipeline.business_id || businessOptions[0]?.business_id || ''
    })
    setPipelineFieldErrors({})
    setError('')
    setSuccess('')
    setShowPipelineForm(true)
  }

  const validatePipelineForm = () => {
    const errors = {}

    // Validate pipeline name (3-100 characters)
    const nameValidation = validateTextField(pipelineForm.name, {
      required: true,
      minLength: 3,
      maxLength: 100,
      fieldName: 'Pipeline name'
    })
    if (!nameValidation.valid) {
      errors.name = nameValidation.error
    }

    // Validate description (optional, max 500 characters)
    if (pipelineForm.description && pipelineForm.description.trim()) {
      const descValidation = validateTextField(pipelineForm.description, {
        required: false,
        maxLength: 500,
        fieldName: 'Description'
      })
      if (!descValidation.valid) {
        errors.description = descValidation.error
      }
    }

    // Validate icon (1-2 characters for emoji)
    if (pipelineForm.icon && pipelineForm.icon.trim()) {
      const iconValidation = validateTextField(pipelineForm.icon, {
        required: false,
        minLength: 1,
        maxLength: 2,
        fieldName: 'Icon'
      })
      if (!iconValidation.valid) {
        errors.icon = iconValidation.error
      }
    }

    // Validate color (hex format)
    const colorPattern = /^#[0-9A-Fa-f]{6}$/
    if (pipelineForm.color && !colorPattern.test(pipelineForm.color)) {
      errors.color = 'Color must be a valid hex color (e.g., #4F46E5)'
    }

    if (!pipelineForm.business_id) {
      errors.business_id = 'Please select a business for this pipeline'
    }

    setPipelineFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSavePipeline = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (editingPipeline && !canEditPipelines) {
      setError('You do not have permission to edit pipelines.')
      return
    }

    if (!editingPipeline && !canCreatePipelines) {
      setError('You do not have permission to create pipelines.')
      return
    }
    
    if (!tenant?.tenant_id) {
      setError('Missing tenant context. Please refresh and try again.')
      return
    }
    
    // Validate form
    if (!validatePipelineForm()) {
      setError('Please fix the validation errors before saving')
      return
    }

    try {
      const pipelineData = {
        ...pipelineForm,
        tenant_id: tenant?.tenant_id,
        updated_by: user.id
      }

      if (editingPipeline) {
        // Update existing pipeline
        const { error: updateError } = await supabase
          .from('pipelines')
          .update(pipelineData)
          .eq('pipeline_id', editingPipeline.pipeline_id)
        
        if (updateError) {
          const errorMessage = handleSupabaseError(updateError)
          throw new Error(errorMessage)
        }
        setSuccess('Pipeline updated successfully')
      } else {
        // Create new pipeline
        const { error: insertError } = await supabase
          .from('pipelines')
          .insert([{
            ...pipelineData,
            created_by: user.id,
            display_order: pipelines.length
          }])
        
        if (insertError) {
          const errorMessage = handleSupabaseError(insertError)
          throw new Error(errorMessage)
        }
        setSuccess('Pipeline created successfully')
      }
      
      setShowPipelineForm(false)
      setPipelineFieldErrors({})
      fetchPipelines()
    } catch (err) {
      console.error('Error saving pipeline:', err)
      const errorMessage = handleError(err, 'saving pipeline')
      setError(errorMessage)
    }
  }

  const handleDeletePipeline = async (pipeline) => {
    if (!canDeletePipelines) {
      setError('You do not have permission to delete pipelines.')
      return
    }
    if (!confirm(`Are you sure you want to delete "${pipeline.name}"?\n\nThis will also delete all stages and assignments. This action cannot be undone.`)) {
      return
    }
    
    try {
      setError('')
      setSuccess('')
      
      const { error: deleteError } = await supabase
        .from('pipelines')
        .delete()
        .eq('pipeline_id', pipeline.pipeline_id)
      
      if (deleteError) {
        const errorMessage = handleSupabaseError(deleteError)
        throw new Error(errorMessage)
      }
      
      setSuccess('Pipeline deleted successfully')
      fetchPipelines()
      if (selectedPipeline?.pipeline_id === pipeline.pipeline_id) {
        setSelectedPipeline(null)
      }
    } catch (err) {
      console.error('Error deleting pipeline:', err)
      const errorMessage = handleError(err, 'deleting pipeline')
      setError(errorMessage)
    }
  }

  const handleCreateStage = () => {
    if (!canCreatePipelines) {
      setError('You do not have permission to create stages.')
      return
    }
    setEditingStage(null)
    setStageForm({
      name: '',
      description: '',
      color: '#6366F1',
      display_order: stages.length,
      is_final: false
    })
    setStageFieldErrors({})
    setError('')
    setSuccess('')
    setShowStageForm(true)
  }

  const handleEditStage = (stage) => {
    if (!canEditPipelines) {
      setError('You do not have permission to edit stages.')
      return
    }
    setEditingStage(stage)
    setStageForm({
      name: stage.name,
      description: stage.description || '',
      color: stage.color || '#6366F1',
      display_order: stage.display_order,
      is_final: stage.is_final || false
    })
    setStageFieldErrors({})
    setError('')
    setSuccess('')
    setShowStageForm(true)
  }

  const validateStageForm = () => {
    const errors = {}

    // Validate stage name (3-100 characters)
    const nameValidation = validateTextField(stageForm.name, {
      required: true,
      minLength: 3,
      maxLength: 100,
      fieldName: 'Stage name'
    })
    if (!nameValidation.valid) {
      errors.name = nameValidation.error
    }

    // Validate description (optional, max 300 characters)
    if (stageForm.description && stageForm.description.trim()) {
      const descValidation = validateTextField(stageForm.description, {
        required: false,
        maxLength: 300,
        fieldName: 'Description'
      })
      if (!descValidation.valid) {
        errors.description = descValidation.error
      }
    }

    // Validate color (hex format)
    const colorPattern = /^#[0-9A-Fa-f]{6}$/
    if (stageForm.color && !colorPattern.test(stageForm.color)) {
      errors.color = 'Color must be a valid hex color (e.g., #6366F1)'
    }

    setStageFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveStage = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (editingStage && !canEditPipelines) {
      setError('You do not have permission to edit stages.')
      return
    }

    if (!editingStage && !canCreatePipelines) {
      setError('You do not have permission to create stages.')
      return
    }
    
    if (!selectedPipeline) {
      setError('Please select a pipeline first')
      return
    }

    // Validate form
    if (!validateStageForm()) {
      setError('Please fix the validation errors before saving')
      return
    }
    
    try {
      const stageData = {
        ...stageForm,
        pipeline_id: selectedPipeline.pipeline_id
      }

      if (editingStage) {
        // Update existing stage
        const { error: updateError } = await supabase
          .from('pipeline_stages')
          .update(stageData)
          .eq('stage_id', editingStage.stage_id)
        
        if (updateError) {
          const errorMessage = handleSupabaseError(updateError)
          throw new Error(errorMessage)
        }
        setSuccess('Stage updated successfully')
      } else {
        // Create new stage
        const { error: insertError } = await supabase
          .from('pipeline_stages')
          .insert([stageData])
        
        if (insertError) {
          const errorMessage = handleSupabaseError(insertError)
          throw new Error(errorMessage)
        }
        setSuccess('Stage created successfully')
      }
      
      setShowStageForm(false)
      setStageFieldErrors({})
      fetchStages(selectedPipeline.pipeline_id)
    } catch (err) {
      console.error('Error saving stage:', err)
      const errorMessage = handleError(err, 'saving stage')
      setError(errorMessage)
    }
  }

  const handleDeleteStage = async (stage) => {
    if (!canDeletePipelines) {
      setError('You do not have permission to delete stages.')
      return
    }
    if (!confirm(`Are you sure you want to delete "${stage.name}"?\n\nThis action cannot be undone.`)) {
      return
    }
    
    try {
      setError('')
      setSuccess('')
      
      const { error: deleteError } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('stage_id', stage.stage_id)
      
      if (deleteError) {
        const errorMessage = handleSupabaseError(deleteError)
        throw new Error(errorMessage)
      }
      
      setSuccess('Stage deleted successfully')
      fetchStages(selectedPipeline.pipeline_id)
    } catch (err) {
      console.error('Error deleting stage:', err)
      const errorMessage = handleError(err, 'deleting stage')
      setError(errorMessage)
    }
  }

  const moveStage = async (stage, direction) => {
    if (!canEditPipelines) {
      setError('You do not have permission to reorder stages.')
      return
    }
    const currentIndex = stages.findIndex(s => s.stage_id === stage.stage_id)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (newIndex < 0 || newIndex >= stages.length) return
    
    const newStages = [...stages]
    const [movedStage] = newStages.splice(currentIndex, 1)
    newStages.splice(newIndex, 0, movedStage)
    
    // Update display_order for all stages
    try {
      setError('')
      
      for (let i = 0; i < newStages.length; i++) {
        const { error: reorderError } = await supabase
          .from('pipeline_stages')
          .update({ display_order: i })
          .eq('stage_id', newStages[i].stage_id)
        
        if (reorderError) {
          const errorMessage = handleSupabaseError(reorderError)
          throw new Error(errorMessage)
        }
      }
      
      fetchStages(selectedPipeline.pipeline_id)
    } catch (err) {
      console.error('Error reordering stages:', err)
      const errorMessage = handleError(err, 'reordering stages')
      setError(errorMessage)
    }
  }

  if (permissionsLoading) {
    return <div className="loading">Loading permissions...</div>
  }

  if (!canViewPipelines) {
    return (
      <div className="pipeline-admin">
        <div style={{ marginBottom: '16px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/crm/data-admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              padding: '8px 16px'
            }}
          >
            ← Back to All Tables
          </button>
        </div>
        <div className="error">
          <h2>Access Restricted</h2>
          <p>You do not have permission to view pipelines.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading">Loading pipelines...</div>
  }

  return (
    <div className="pipeline-admin">
      <div style={{ marginBottom: '16px' }}>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/crm/data-admin')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '14px',
            padding: '8px 16px'
          }}
        >
          ← Back to All Tables
        </button>
      </div>
      
      <div className="pipeline-admin-header">
        <h1>Pipeline Administration</h1>
        {canCreatePipelines && (
          <button
            className="btn btn-primary"
            onClick={handleCreatePipeline}
            disabled={businessOptions.length === 0}
            title={businessOptions.length === 0 ? 'Add a business in Data Admin before creating pipelines' : undefined}
          >
            + Create Pipeline
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="pipeline-admin-content">
        {/* Pipelines List */}
        <div className="pipelines-sidebar">
          <h3>Pipelines</h3>
          {pipelines.length === 0 ? (
            <p className="empty-state">No pipelines yet. Create your first pipeline!</p>
          ) : (
            <div className="pipeline-list">
              {pipelines.map(pipeline => (
                <div
                  key={pipeline.pipeline_id}
                  className={`pipeline-item ${selectedPipeline?.pipeline_id === pipeline.pipeline_id ? 'active' : ''}`}
                  onClick={() => setSelectedPipeline(pipeline)}
                >
                  <span className="pipeline-icon">{pipeline.icon || '📊'}</span>
                  <div className="pipeline-info">
                    <div className="pipeline-name">
                      {pipeline.name}
                      {pipeline.is_default && <span className="badge">Default</span>}
                      {pipeline.business_id && (
                        <span className="badge badge-secondary">
                          {businessLookup[pipeline.business_id] || 'Business' }
                        </span>
                      )}
                    </div>
                    <div className="pipeline-description">{pipeline.description}</div>
                  </div>
                  <div className="pipeline-actions">
                    {canEditPipelines && (
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditPipeline(pipeline)
                        }}
                        title="Edit pipeline"
                      >
                        ✏️
                      </button>
                    )}
                    {canDeletePipelines && (
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePipeline(pipeline)
                        }}
                        title="Delete pipeline"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stages Panel */}
        <div className="stages-panel">
          {selectedPipeline ? (
            <>
              <div className="stages-header">
                <h3>Stages for {selectedPipeline.name}</h3>
                {canCreatePipelines && (
                  <button className="btn btn-secondary" onClick={handleCreateStage}>
                    + Add Stage
                  </button>
                )}
              </div>

              {stages.length === 0 ? (
                <p className="empty-state">No stages yet. Add your first stage!</p>
              ) : (
                <div className="stages-list">
                  {stages.map((stage, index) => (
                    <div key={stage.stage_id} className="stage-item">
                      <div className="stage-color" style={{ backgroundColor: stage.color }}></div>
                      <div className="stage-info">
                        <div className="stage-name">
                          {stage.name}
                          {stage.is_final && <span className="badge-success">Final</span>}
                        </div>
                        <div className="stage-description">{stage.description}</div>
                      </div>
                      <div className="stage-actions">
                        {canEditPipelines && (
                          <button
                            className="btn-icon"
                            onClick={() => moveStage(stage, 'up')}
                            disabled={index === 0}
                            title="Move up"
                          >
                            ⬆️
                          </button>
                        )}
                        {canEditPipelines && (
                          <button
                            className="btn-icon"
                            onClick={() => moveStage(stage, 'down')}
                            disabled={index === stages.length - 1}
                            title="Move down"
                          >
                            ⬇️
                          </button>
                        )}
                        {canEditPipelines && (
                          <button
                            className="btn-icon"
                            onClick={() => handleEditStage(stage)}
                            title="Edit stage"
                          >
                            ✏️
                          </button>
                        )}
                        {canDeletePipelines && (
                          <button
                            className="btn-icon"
                            onClick={() => handleDeleteStage(stage)}
                            title="Delete stage"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="empty-state">Select a pipeline to manage its stages</p>
          )}
        </div>
      </div>

      {/* Pipeline Form Modal */}
      {showPipelineForm && (
        <div className="modal-overlay" onClick={() => setShowPipelineForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPipeline ? 'Edit Pipeline' : 'Create Pipeline'}</h2>
              <button className="btn-icon" onClick={() => setShowPipelineForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSavePipeline} className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={pipelineForm.name}
                  onChange={(e) => {
                    setPipelineForm({ ...pipelineForm, name: e.target.value })
                    setPipelineFieldErrors({ ...pipelineFieldErrors, name: '' })
                  }}
                  className={pipelineFieldErrors.name ? 'error' : ''}
                  required
                  placeholder="e.g., Recruitment Pipeline"
                />
                {pipelineFieldErrors.name && (
                  <small className="error-text">{pipelineFieldErrors.name}</small>
                )}
              </div>
              <div className="form-group">
                <label>Business *</label>
                {loadingBusinesses ? (
                  <div className="skeleton" style={{ height: '36px', marginTop: '8px' }}></div>
                ) : businessOptions.length === 0 ? (
                  <div className="alert alert-warning">
                    No businesses available. Create a business before configuring pipelines.
                  </div>
                ) : (
                  <select
                    value={pipelineForm.business_id}
                    onChange={(e) => {
                      setPipelineForm({ ...pipelineForm, business_id: e.target.value })
                      setPipelineFieldErrors({ ...pipelineFieldErrors, business_id: '' })
                    }}
                    className={pipelineFieldErrors.business_id ? 'error' : ''}
                    required
                  >
                    <option value="">Select a business...</option>
                    {businessOptions.map((business) => (
                      <option key={business.business_id} value={business.business_id}>
                        {business.business_name}
                        {!business.is_active ? ' (Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                {pipelineFieldErrors.business_id && (
                  <small className="error-text">{pipelineFieldErrors.business_id}</small>
                )}
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={pipelineForm.description}
                  onChange={(e) => {
                    setPipelineForm({ ...pipelineForm, description: e.target.value })
                    setPipelineFieldErrors({ ...pipelineFieldErrors, description: '' })
                  }}
                  className={pipelineFieldErrors.description ? 'error' : ''}
                  placeholder="Brief description of this pipeline"
                  rows="3"
                />
                {pipelineFieldErrors.description && (
                  <small className="error-text">{pipelineFieldErrors.description}</small>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Icon</label>
                  <input
                    type="text"
                    value={pipelineForm.icon}
                    onChange={(e) => {
                      setPipelineForm({ ...pipelineForm, icon: e.target.value })
                      setPipelineFieldErrors({ ...pipelineFieldErrors, icon: '' })
                    }}
                    className={pipelineFieldErrors.icon ? 'error' : ''}
                    placeholder="📊"
                    maxLength="2"
                  />
                  {pipelineFieldErrors.icon && (
                    <small className="error-text">{pipelineFieldErrors.icon}</small>
                  )}
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="color"
                    value={pipelineForm.color}
                    onChange={(e) => {
                      setPipelineForm({ ...pipelineForm, color: e.target.value })
                      setPipelineFieldErrors({ ...pipelineFieldErrors, color: '' })
                    }}
                    className={pipelineFieldErrors.color ? 'error' : ''}
                  />
                  {pipelineFieldErrors.color && (
                    <small className="error-text">{pipelineFieldErrors.color}</small>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pipelineForm.is_default}
                    onChange={(e) => setPipelineForm({ ...pipelineForm, is_default: e.target.checked })}
                  />
                  Set as default pipeline
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPipelineForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPipeline ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage Form Modal */}
      {showStageForm && (
        <div className="modal-overlay" onClick={() => setShowStageForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStage ? 'Edit Stage' : 'Create Stage'}</h2>
              <button className="btn-icon" onClick={() => setShowStageForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveStage} className="modal-body">
              <div className="form-group">
                <label>Stage Name *</label>
                <input
                  type="text"
                  value={stageForm.name}
                  onChange={(e) => {
                    setStageForm({ ...stageForm, name: e.target.value })
                    setStageFieldErrors({ ...stageFieldErrors, name: '' })
                  }}
                  className={stageFieldErrors.name ? 'error' : ''}
                  required
                  placeholder="e.g., Qualified"
                />
                {stageFieldErrors.name && (
                  <small className="error-text">{stageFieldErrors.name}</small>
                )}
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={stageForm.description}
                  onChange={(e) => {
                    setStageForm({ ...stageForm, description: e.target.value })
                    setStageFieldErrors({ ...stageFieldErrors, description: '' })
                  }}
                  className={stageFieldErrors.description ? 'error' : ''}
                  placeholder="Brief description of this stage"
                  rows="2"
                />
                {stageFieldErrors.description && (
                  <small className="error-text">{stageFieldErrors.description}</small>
                )}
              </div>
              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={stageForm.color}
                  onChange={(e) => {
                    setStageForm({ ...stageForm, color: e.target.value })
                    setStageFieldErrors({ ...stageFieldErrors, color: '' })
                  }}
                  className={stageFieldErrors.color ? 'error' : ''}
                />
                {stageFieldErrors.color && (
                  <small className="error-text">{stageFieldErrors.color}</small>
                )}
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={stageForm.is_final}
                    onChange={(e) => setStageForm({ ...stageForm, is_final: e.target.checked })}
                  />
                  Mark as final/completed stage
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStageForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStage ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
