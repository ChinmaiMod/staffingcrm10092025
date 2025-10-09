import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { useTenant } from '../../contexts/TenantProvider';
import './IssueReport.css';

const IssueReport = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM',
    issue_type: 'BUG',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    page_url: window.location.href,
    browser_info: navigator.userAgent
  });
  
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const severityOptions = [
    { value: 'LOW', label: 'Low', description: 'Minor issue', color: 'low' },
    { value: 'MEDIUM', label: 'Medium', description: 'Moderate issue', color: 'medium' },
    { value: 'HIGH', label: 'High', description: 'Major issue', color: 'high' },
    { value: 'CRITICAL', label: 'Critical', description: 'System down', color: 'critical' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSeveritySelect = (severity) => {
    setFormData(prev => ({
      ...prev,
      severity
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB');
        return;
      }
      setScreenshot(file);
      setError('');
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setScreenshot(file);
      setError('');
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
  };

  const uploadScreenshot = async (issueId) => {
    if (!screenshot) return null;

    const fileExt = screenshot.name.split('.').pop();
    const fileName = `${issueId}-${Date.now()}.${fileExt}`;
    const filePath = `issue-screenshots/${tenant.tenant_id}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(filePath, screenshot);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Insert issue report into database
      const { data: issueData, error: dbError } = await supabase
        .from('issue_reports')
        .insert([{
          tenant_id: tenant.tenant_id,
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          issue_type: formData.issue_type,
          steps_to_reproduce: formData.steps_to_reproduce,
          expected_behavior: formData.expected_behavior,
          actual_behavior: formData.actual_behavior,
          page_url: formData.page_url,
          browser_info: formData.browser_info,
          status: 'OPEN'
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // Upload screenshot if provided
      let screenshotUrl = null;
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(issueData.issue_id);
        
        // Update issue with screenshot URL
        await supabase
          .from('issue_reports')
          .update({ screenshot_url: screenshotUrl })
          .eq('issue_id', issueData.issue_id);
      }

      setSuccess(true);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        severity: 'MEDIUM',
        issue_type: 'BUG',
        steps_to_reproduce: '',
        expected_behavior: '',
        actual_behavior: '',
        page_url: window.location.href,
        browser_info: navigator.userAgent
      });
      setScreenshot(null);

      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

    } catch (err) {
      console.error('Error submitting issue report:', err);
      setError(err.message || 'Failed to submit issue report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      severity: 'MEDIUM',
      issue_type: 'BUG',
      steps_to_reproduce: '',
      expected_behavior: '',
      actual_behavior: '',
      page_url: window.location.href,
      browser_info: navigator.userAgent
    });
    setScreenshot(null);
    setError('');
    setSuccess(false);
  };

  return (
    <div className="issue-report-page">
      <div className="issue-report-header">
        <h1>🐛 Report an Issue</h1>
        <p>Help us improve by reporting bugs and issues you encounter</p>
      </div>

      {success && (
        <div className="success-message">
          ✓ Thank you for reporting this issue! We'll investigate and get back to you shortly.
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="issue-info">
        <h3>📋 What makes a good bug report?</h3>
        <ul>
          <li>Clear, descriptive title</li>
          <li>Step-by-step instructions to reproduce the issue</li>
          <li>What you expected to happen</li>
          <li>What actually happened</li>
          <li>Screenshots or screen recordings (if applicable)</li>
        </ul>
      </div>

      <form className="issue-report-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">
            Issue Title <span className="required">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Brief description of the issue..."
            maxLength={200}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="issue_type">
              Issue Type <span className="required">*</span>
            </label>
            <select
              id="issue_type"
              name="issue_type"
              value={formData.issue_type}
              onChange={handleChange}
              required
            >
              <option value="BUG">Bug / Error</option>
              <option value="UI_ISSUE">UI / Display Issue</option>
              <option value="PERFORMANCE">Performance Problem</option>
              <option value="DATA_ERROR">Data / Calculation Error</option>
              <option value="FEATURE_NOT_WORKING">Feature Not Working</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="page_url">Page URL</label>
            <input
              type="url"
              id="page_url"
              name="page_url"
              value={formData.page_url}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="form-group">
          <label>
            Severity <span className="required">*</span>
          </label>
          <div className="severity-selector">
            {severityOptions.map(option => (
              <div
                key={option.value}
                className={`severity-option ${option.color} ${formData.severity === option.value ? 'selected' : ''}`}
                onClick={() => handleSeveritySelect(option.value)}
              >
                <div className="severity-label">{option.label}</div>
                <div className="severity-description">{option.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">
            Description <span className="required">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide a detailed description of the issue..."
            maxLength={2000}
            required
          />
          <div className={`character-count ${formData.description.length > 1800 ? 'warning' : ''}`}>
            {formData.description.length} / 2000 characters
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="steps_to_reproduce">Steps to Reproduce</label>
          <textarea
            id="steps_to_reproduce"
            name="steps_to_reproduce"
            value={formData.steps_to_reproduce}
            onChange={handleChange}
            placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
            maxLength={1000}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="expected_behavior">Expected Behavior</label>
            <textarea
              id="expected_behavior"
              name="expected_behavior"
              value={formData.expected_behavior}
              onChange={handleChange}
              placeholder="What should happen..."
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label htmlFor="actual_behavior">Actual Behavior</label>
            <textarea
              id="actual_behavior"
              name="actual_behavior"
              value={formData.actual_behavior}
              onChange={handleChange}
              placeholder="What actually happened..."
              maxLength={500}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Screenshot (Optional)</label>
          {!screenshot ? (
            <div
              className="file-upload-area"
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('screenshot-input').click()}
            >
              <div className="upload-icon">📸</div>
              <div className="upload-text">Click to upload or drag and drop</div>
              <div className="upload-hint">PNG, JPG up to 5MB</div>
              <input
                type="file"
                id="screenshot-input"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="uploaded-file">
              <img src={URL.createObjectURL(screenshot)} alt="Screenshot preview" />
              <div className="file-info">
                <div className="file-name">{screenshot.name}</div>
                <div className="file-size">{(screenshot.size / 1024).toFixed(2)} KB</div>
              </div>
              <button type="button" className="remove-file" onClick={removeScreenshot}>
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </button>
          <button
            type="submit"
            className="btn btn-danger"
            disabled={loading || !formData.title || !formData.description}
          >
            {loading ? 'Submitting...' : '🐛 Submit Issue Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IssueReport;
