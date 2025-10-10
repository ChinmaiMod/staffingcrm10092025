import { useState, useEffect } from 'react'
import { supabase } from '../../../api/supabaseClient'
import { useAuth } from '../../../contexts/AuthProvider'
import { useNavigate } from 'react-router-dom'
import './PipelineView.css'

export default function PipelineView() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pipelines, setPipelines] = useState([])
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [stages, setStages] = useState([])
  const [contacts, setContacts] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draggedContact, setDraggedContact] = useState(null)

  useEffect(() => {
    fetchPipelines()
  }, [])

  useEffect(() => {
    if (selectedPipeline) {
      fetchStages(selectedPipeline.pipeline_id)
      fetchContactsInPipeline(selectedPipeline.pipeline_id)
    }
  }, [selectedPipeline])

  const fetchPipelines = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      
      if (error) throw error
      
      setPipelines(data || [])
      
      // Select default pipeline or first pipeline
      const defaultPipeline = data?.find(p => p.is_default)
      setSelectedPipeline(defaultPipeline || data?.[0] || null)
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

  const fetchContactsInPipeline = async (pipelineId) => {
    try {
      // Fetch assignments with contact details
      const { data: assignmentData, error: assignError } = await supabase
        .from('contact_pipeline_assignments')
        .select(`
          *,
          contacts (
            contact_id,
            first_name,
            last_name,
            email,
            phone,
            contact_type,
            job_title_id,
            job_titles (title)
          )
        `)
        .eq('pipeline_id', pipelineId)
      
      if (assignError) throw assignError
      
      setAssignments(assignmentData || [])
      
      // Extract unique contacts
      const uniqueContacts = assignmentData?.map(a => a.contacts).filter(Boolean) || []
      setContacts(uniqueContacts)
    } catch (err) {
      console.error('Error fetching contacts:', err)
      setError('Failed to load contacts')
    }
  }

  const getContactsForStage = (stageId) => {
    return assignments
      .filter(a => a.stage_id === stageId)
      .map(a => ({
        ...a.contacts,
        assignment_id: a.assignment_id,
        notes: a.notes,
        assigned_at: a.assigned_at
      }))
      .filter(Boolean)
  }

  const handleDragStart = (e, contact, stageId) => {
    setDraggedContact({ contact, fromStageId: stageId })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, toStageId) => {
    e.preventDefault()
    
    if (!draggedContact) return
    
    const { contact, fromStageId } = draggedContact
    
    // Don't do anything if dropped on same stage
    if (fromStageId === toStageId) {
      setDraggedContact(null)
      return
    }
    
    try {
      // Find the assignment
      const assignment = assignments.find(a => a.contact_id === contact.contact_id)
      
      if (!assignment) {
        throw new Error('Assignment not found')
      }
      
      // Update the assignment to new stage
      const { error } = await supabase
        .from('contact_pipeline_assignments')
        .update({
          stage_id: toStageId,
          last_stage_change: new Date().toISOString(),
          assigned_by: user.id
        })
        .eq('assignment_id', assignment.assignment_id)
      
      if (error) throw error
      
      // Refresh contacts
      await fetchContactsInPipeline(selectedPipeline.pipeline_id)
    } catch (err) {
      console.error('Error moving contact:', err)
      setError('Failed to move contact')
    } finally {
      setDraggedContact(null)
    }
  }

  const handleContactClick = (contact) => {
    navigate(`/crm/contacts?id=${contact.contact_id}`)
  }

  const getStageStats = (stageId) => {
    const count = getContactsForStage(stageId).length
    return count
  }

  if (loading) {
    return <div className="loading">Loading pipeline...</div>
  }

  if (pipelines.length === 0) {
    return (
      <div className="empty-pipeline">
        <div className="empty-pipeline-content">
          <h2>No Pipelines Available</h2>
          <p>Create a pipeline in Data Administration to get started.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/crm/data-admin')}
          >
            Go to Data Administration
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pipeline-view">
      <div className="pipeline-view-header">
        <div>
          <h1>Pipelines</h1>
          <p className="subtitle">Manage contacts through your sales pipeline</p>
        </div>
        <div className="pipeline-selector">
          <label>Pipeline:</label>
          <select
            value={selectedPipeline?.pipeline_id || ''}
            onChange={(e) => {
              const pipeline = pipelines.find(p => p.pipeline_id === e.target.value)
              setSelectedPipeline(pipeline)
            }}
          >
            {pipelines.map(pipeline => (
              <option key={pipeline.pipeline_id} value={pipeline.pipeline_id}>
                {pipeline.icon} {pipeline.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {selectedPipeline && (
        <div className="pipeline-kanban">
          {stages.map(stage => (
            <div
              key={stage.stage_id}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.stage_id)}
            >
              <div 
                className="kanban-column-header"
                style={{ borderTopColor: stage.color }}
              >
                <h3>{stage.name}</h3>
                <span className="contact-count">{getStageStats(stage.stage_id)}</span>
              </div>
              <div className="kanban-column-content">
                {getContactsForStage(stage.stage_id).map(contact => (
                  <div
                    key={contact.contact_id}
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, contact, stage.stage_id)}
                    onClick={() => handleContactClick(contact)}
                  >
                    <div className="card-header">
                      <div className="contact-name">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div className="contact-type-badge">
                        {contact.contact_type?.replace(/_/g, ' ')}
                      </div>
                    </div>
                    {contact.job_titles?.title && (
                      <div className="card-field">
                        <span className="field-icon">💼</span>
                        <span className="field-value">{contact.job_titles.title}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="card-field">
                        <span className="field-icon">📧</span>
                        <span className="field-value">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="card-field">
                        <span className="field-icon">📱</span>
                        <span className="field-value">{contact.phone}</span>
                      </div>
                    )}
                    {contact.notes && (
                      <div className="card-notes">
                        <span className="field-icon">📝</span>
                        <span className="field-value">{contact.notes}</span>
                      </div>
                    )}
                    <div className="card-footer">
                      <span className="card-date">
                        Added {new Date(contact.assigned_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {getContactsForStage(stage.stage_id).length === 0 && (
                  <div className="empty-column">
                    Drop contacts here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {stages.length === 0 && selectedPipeline && (
        <div className="empty-state">
          <h3>No Stages Defined</h3>
          <p>This pipeline doesn&apos;t have any stages yet. Add stages in Data Administration.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/crm/data-admin')}
          >
            Configure Pipeline
          </button>
        </div>
      )}
    </div>
  )
}
