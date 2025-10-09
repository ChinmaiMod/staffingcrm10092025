import { useState, useEffect } from 'react'
import { supabase } from '../../../api/supabaseClient'
import { useAuth } from '../../../contexts/AuthProvider'
import './PipelineAdmin.css'

export default function PipelineAdmin() {
  const { user } = useAuth()
  const [pipelines, setPipelines] = useState([])
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form states
  const [showPipelineForm, setShowPipelineForm] = useState(false)
  const [showStageForm, setShowStageForm] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState(null)
  const [editingStage, setEditingStage] = useState(null)
  
  const [pipelineForm, setPipelineForm] = useState({
    name: '',
    description: '',
    color: '#4F46E5',
    icon: '📊',
    is_default: false
  })
  
  const [stageForm, setStageForm] = useState({
    name: '',
    description: '',
    color: '#6366F1',
    display_order: 0,
    is_final: false
  })

  useEffect(() => {
    fetchPipelines()
  }, [])

  useEffect(() => {
    if (selectedPipeline) {
      fetchStages(selectedPipeline.pipeline_id)
    }
  }, [selectedPipeline])

  const fetchPipelines = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .order('display_order', { ascending: true })
      
      if (error) throw error
      
      setPipelines(data || [])
      if (data && data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0])
      }
    } catch (err) {
      console.error('Error fetching pipelines:', err)
      setError('Failed to load pipelines')
    } finally {
      setLoading(false)
    }
  }

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
    setEditingPipeline(null)
    setPipelineForm({
      name: '',
      description: '',
      color: '#4F46E5',
      icon: '📊',
      is_default: false
    })
    setShowPipelineForm(true)
  }

  const handleEditPipeline = (pipeline) => {
    setEditingPipeline(pipeline)
    setPipelineForm({
      name: pipeline.name,
      description: pipeline.description || '',
      color: pipeline.color || '#4F46E5',
      icon: pipeline.icon || '📊',
      is_default: pipeline.is_default || false
    })
    setShowPipelineForm(true)
  }

  const handleSavePipeline = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    try {
      const pipelineData = {
        ...pipelineForm,
        updated_by: user.id
      }

      if (editingPipeline) {
        // Update existing pipeline
        const { error } = await supabase
          .from('pipelines')
          .update(pipelineData)
          .eq('pipeline_id', editingPipeline.pipeline_id)
        
        if (error) throw error
        setSuccess('Pipeline updated successfully')
      } else {
        // Create new pipeline
        const { error } = await supabase
          .from('pipelines')
          .insert([{
            ...pipelineData,
            created_by: user.id,
            display_order: pipelines.length
          }])
        
        if (error) throw error
        setSuccess('Pipeline created successfully')
      }
      
      setShowPipelineForm(false)
      fetchPipelines()
    } catch (err) {
      console.error('Error saving pipeline:', err)
      setError(err.message || 'Failed to save pipeline')
    }
  }

  const handleDeletePipeline = async (pipeline) => {
    if (!confirm(`Are you sure you want to delete "${pipeline.name}"? This will also delete all stages and assignments.`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('pipeline_id', pipeline.pipeline_id)
      
      if (error) throw error
      
      setSuccess('Pipeline deleted successfully')
      fetchPipelines()
      if (selectedPipeline?.pipeline_id === pipeline.pipeline_id) {
        setSelectedPipeline(null)
      }
    } catch (err) {
      console.error('Error deleting pipeline:', err)
      setError(err.message || 'Failed to delete pipeline')
    }
  }

  const handleCreateStage = () => {
    setEditingStage(null)
    setStageForm({
      name: '',
      description: '',
      color: '#6366F1',
      display_order: stages.length,
      is_final: false
    })
    setShowStageForm(true)
  }

  const handleEditStage = (stage) => {
    setEditingStage(stage)
    setStageForm({
      name: stage.name,
      description: stage.description || '',
      color: stage.color || '#6366F1',
      display_order: stage.display_order,
      is_final: stage.is_final || false
    })
    setShowStageForm(true)
  }

  const handleSaveStage = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!selectedPipeline) {
      setError('Please select a pipeline first')
      return
    }
    
    try {
      const stageData = {
        ...stageForm,
        pipeline_id: selectedPipeline.pipeline_id
      }

      if (editingStage) {
        // Update existing stage
        const { error } = await supabase
          .from('pipeline_stages')
          .update(stageData)
          .eq('stage_id', editingStage.stage_id)
        
        if (error) throw error
        setSuccess('Stage updated successfully')
      } else {
        // Create new stage
        const { error } = await supabase
          .from('pipeline_stages')
          .insert([stageData])
        
        if (error) throw error
        setSuccess('Stage created successfully')
      }
      
      setShowStageForm(false)
      fetchStages(selectedPipeline.pipeline_id)
    } catch (err) {
      console.error('Error saving stage:', err)
      setError(err.message || 'Failed to save stage')
    }
  }

  const handleDeleteStage = async (stage) => {
    if (!confirm(`Are you sure you want to delete "${stage.name}"?`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('stage_id', stage.stage_id)
      
      if (error) throw error
      
      setSuccess('Stage deleted successfully')
      fetchStages(selectedPipeline.pipeline_id)
    } catch (err) {
      console.error('Error deleting stage:', err)
      setError(err.message || 'Failed to delete stage')
    }
  }

  const moveStage = async (stage, direction) => {
    const currentIndex = stages.findIndex(s => s.stage_id === stage.stage_id)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (newIndex < 0 || newIndex >= stages.length) return
    
    const newStages = [...stages]
    const [movedStage] = newStages.splice(currentIndex, 1)
    newStages.splice(newIndex, 0, movedStage)
    
    // Update display_order for all stages
    try {
      for (let i = 0; i < newStages.length; i++) {
        await supabase
          .from('pipeline_stages')
          .update({ display_order: i })
          .eq('stage_id', newStages[i].stage_id)
      }
      
      fetchStages(selectedPipeline.pipeline_id)
    } catch (err) {
      console.error('Error reordering stages:', err)
      setError('Failed to reorder stages')
    }
  }

  if (loading) {
    return <div className="loading">Loading pipelines...</div>
  }

  return (
    <div className="pipeline-admin">
      <div className="pipeline-admin-header">
        <h1>Pipeline Administration</h1>
        <button className="btn btn-primary" onClick={handleCreatePipeline}>
          + Create Pipeline
        </button>
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
                    </div>
                    <div className="pipeline-description">{pipeline.description}</div>
                  </div>
                  <div className="pipeline-actions">
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
                <button className="btn btn-secondary" onClick={handleCreateStage}>
                  + Add Stage
                </button>
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
                        <button 
                          className="btn-icon"
                          onClick={() => moveStage(stage, 'up')}
                          disabled={index === 0}
                          title="Move up"
                        >
                          ⬆️
                        </button>
                        <button 
                          className="btn-icon"
                          onClick={() => moveStage(stage, 'down')}
                          disabled={index === stages.length - 1}
                          title="Move down"
                        >
                          ⬇️
                        </button>
                        <button 
                          className="btn-icon" 
                          onClick={() => handleEditStage(stage)}
                          title="Edit stage"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-icon" 
                          onClick={() => handleDeleteStage(stage)}
                          title="Delete stage"
                        >
                          🗑️
                        </button>
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
                  onChange={(e) => setPipelineForm({ ...pipelineForm, name: e.target.value })}
                  required
                  placeholder="e.g., Recruitment Pipeline"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={pipelineForm.description}
                  onChange={(e) => setPipelineForm({ ...pipelineForm, description: e.target.value })}
                  placeholder="Brief description of this pipeline"
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Icon</label>
                  <input
                    type="text"
                    value={pipelineForm.icon}
                    onChange={(e) => setPipelineForm({ ...pipelineForm, icon: e.target.value })}
                    placeholder="📊"
                    maxLength="2"
                  />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="color"
                    value={pipelineForm.color}
                    onChange={(e) => setPipelineForm({ ...pipelineForm, color: e.target.value })}
                  />
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
                  onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                  required
                  placeholder="e.g., Qualified"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={stageForm.description}
                  onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
                  placeholder="Brief description of this stage"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={stageForm.color}
                  onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                />
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
