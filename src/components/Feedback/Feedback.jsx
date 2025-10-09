import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider';
import { useTenant } from '../../contexts/TenantProvider';
import './Feedback.css';

const Feedback = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'FEATURE_REQUEST'
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Insert feedback into database
      const { data: feedbackData, error: dbError } = await supabase
        .from('user_feedback')
        .insert([{
          tenant_id: tenant.tenant_id,
          user_id: user.id,
          subject: formData.subject,
          message: formData.message,
          category: formData.category,
          status: 'NEW'
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // Send email via edge function
      const { data: emailData, error: emailError } = await supabase.functions.invoke('sendFeedbackEmail', {
        body: {
          feedback_id: feedbackData.feedback_id,
          user_email: user.email,
          tenant_name: tenant.company_name,
          subject: formData.subject,
          message: formData.message,
          category: formData.category
        }
      });

      if (emailError) {
        console.error('Email send error:', emailError);
        // Don't throw - feedback is saved, email is nice-to-have
      }

      setSuccess(true);
      setFormData({
        subject: '',
        message: '',
        category: 'FEATURE_REQUEST'
      });

      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      subject: '',
      message: '',
      category: 'FEATURE_REQUEST'
    });
    setError('');
    setSuccess(false);
  };

  const messageLength = formData.message.length;
  const maxLength = 2000;

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <h1>💡 Suggestions & Ideas</h1>
        <p>We'd love to hear your feedback! Share your ideas, report bugs, or suggest improvements.</p>
      </div>

      {success && (
        <div className="success-message">
          ✓ Thank you for your feedback! We've received your message and will review it shortly.
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="feedback-info">
        <h3>What can you share?</h3>
        <ul>
          <li>Feature requests and new ideas</li>
          <li>Bug reports and issues</li>
          <li>Improvements to existing features</li>
          <li>Questions about functionality</li>
          <li>General feedback and suggestions</li>
        </ul>
      </div>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="FEATURE_REQUEST">Feature Request</option>
            <option value="BUG">Bug Report</option>
            <option value="IMPROVEMENT">Improvement</option>
            <option value="QUESTION">Question</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="subject">Subject *</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Brief summary of your suggestion..."
            maxLength={200}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">Message *</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Please provide details about your suggestion, idea, or feedback..."
            maxLength={maxLength}
            required
          />
          <div className={`character-count ${messageLength > maxLength * 0.9 ? 'warning' : ''} ${messageLength >= maxLength ? 'error' : ''}`}>
            {messageLength} / {maxLength} characters
          </div>
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
            className="btn btn-primary"
            disabled={loading || !formData.subject || !formData.message}
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Feedback;
