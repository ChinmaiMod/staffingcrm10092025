import { useState, useEffect, useId } from 'react';
import { flushSync } from 'react-dom';
import { useTenant } from '../../../contexts/TenantProvider';
import { useAuth } from '../../../contexts/AuthProvider';

const ClientForm = ({ client = null, onSubmit, onCancel }) => {
  const { tenant } = useTenant();
  const { profile } = useAuth();
  
  // Generate unique IDs for form fields
  const clientNameId = useId();
  const websiteId = useId();
  const revenueId = useId();
  const clientSourceId = useId();
  const primaryEmailId = useId();
  const primaryPhoneId = useId();
  const industryId = useId();
  const statusId = useId();
  const addressId = useId();
  const cityId = useId();
  const stateId = useId();
  const countryId = useId();
  const postalCodeId = useId();
  const notesId = useId();

  const [formData, setFormData] = useState({
    client_name: '',
    website: '',
    revenue: '',
    client_source: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    industry: '',
    status: 'ACTIVE',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    postal_code: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        client_name: client.client_name || '',
        website: client.website || '',
        revenue: client.revenue || '',
        client_source: client.client_source || '',
        primary_contact_email: client.primary_contact_email || '',
        primary_contact_phone: client.primary_contact_phone || '',
        industry: client.industry || '',
        status: client.status || 'ACTIVE',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        country: client.country || 'USA',
        postal_code: client.postal_code || '',
        notes: client.notes || '',
      });
    }
  }, [client]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.client_name || formData.client_name.trim() === '') {
      newErrors.client_name = 'Client name is required';
    }

    if (formData.primary_contact_email && formData.primary_contact_email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.primary_contact_email)) {
        newErrors.primary_contact_email = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let validationErrors;
    flushSync(() => {
      validationErrors = validateForm();
    });
    
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData = {
        ...formData,
        revenue: formData.revenue ? parseFloat(formData.revenue) : null,
        tenant_id: tenant?.tenant_id,
        ...(client ? { updated_by: profile?.id } : { created_by: profile?.id }),
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="client-form">
      <div className="form-grid">
        {/* Client Name */}
        <div className="form-group">
          <label htmlFor={clientNameId}>
            Client Name <span className="required">*</span>
          </label>
          <input
            id={clientNameId}
            type="text"
            name="client_name"
            value={formData.client_name}
            onChange={handleChange}
            placeholder="Enter client name"
          />
          {errors.client_name && (
            <span className="error-message">{errors.client_name}</span>
          )}
        </div>

        {/* Website */}
        <div className="form-group">
          <label htmlFor={websiteId}>Website</label>
          <input
            id={websiteId}
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://example.com"
          />
        </div>

        {/* Revenue */}
        <div className="form-group">
          <label htmlFor={revenueId}>Revenue (Annual)</label>
          <input
            id={revenueId}
            type="number"
            name="revenue"
            value={formData.revenue}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
          />
        </div>

        {/* Client Source */}
        <div className="form-group">
          <label htmlFor={clientSourceId}>Client Source</label>
          <input
            id={clientSourceId}
            type="text"
            name="client_source"
            value={formData.client_source}
            onChange={handleChange}
            placeholder="Referral, Cold Call, etc."
          />
        </div>

        {/* Primary Contact Email */}
        <div className="form-group">
          <label htmlFor={primaryEmailId}>Primary Contact Email</label>
          <input
            id={primaryEmailId}
            type="email"
            name="primary_contact_email"
            value={formData.primary_contact_email}
            onChange={handleChange}
            placeholder="contact@client.com"
          />
          {errors.primary_contact_email && (
            <span className="error-message">{errors.primary_contact_email}</span>
          )}
        </div>

        {/* Primary Contact Phone */}
        <div className="form-group">
          <label htmlFor={primaryPhoneId}>Primary Contact Phone</label>
          <input
            id={primaryPhoneId}
            type="tel"
            name="primary_contact_phone"
            value={formData.primary_contact_phone}
            onChange={handleChange}
            placeholder="+1-555-0100"
          />
        </div>

        {/* Industry */}
        <div className="form-group">
          <label htmlFor={industryId}>Industry</label>
          <input
            id={industryId}
            type="text"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            placeholder="Technology, Healthcare, etc."
          />
        </div>

        {/* Status */}
        <div className="form-group">
          <label htmlFor={statusId}>Status</label>
          <select
            id={statusId}
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PROSPECT">PROSPECT</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="LOST">LOST</option>
          </select>
        </div>

        {/* Address */}
        <div className="form-group full-width">
          <label htmlFor={addressId}>Address</label>
          <input
            id={addressId}
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address"
          />
        </div>

        {/* City */}
        <div className="form-group">
          <label htmlFor={cityId}>City</label>
          <input
            id={cityId}
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
          />
        </div>

        {/* State */}
        <div className="form-group">
          <label htmlFor={stateId}>State</label>
          <input
            id={stateId}
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="State"
          />
        </div>

        {/* Country */}
        <div className="form-group">
          <label htmlFor={countryId}>Country</label>
          <input
            id={countryId}
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="USA"
          />
        </div>

        {/* Postal Code */}
        <div className="form-group">
          <label htmlFor={postalCodeId}>Postal Code</label>
          <input
            id={postalCodeId}
            type="text"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            placeholder="10001"
          />
        </div>

        {/* Notes */}
        <div className="form-group full-width">
          <label htmlFor={notesId}>Notes</label>
          <textarea
            id={notesId}
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional notes about the client"
            rows="4"
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>

      <style jsx>{`
        .client-form {
          padding: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
        }

        .required {
          color: #ef4444;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          padding: 10px 24px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  );
};

export default ClientForm;
