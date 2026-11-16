import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createListing } from '../api/listings';
import { useToast } from '../hooks/useToast';
import './CreateListing.css';

const formatLocalDatetime = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const CreateListing = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 15 * 60000);
  const defaultEnd = new Date(now.getTime() + 4 * 3600000);
  const defaultExpires = new Date(now.getTime() + 4 * 3600000);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'cooked',
    donorName: '',
    donorContact: '',
    address: '',
    quantity: 1,
    unit: 'portions',
    pickupStart: formatLocalDatetime(defaultStart),
    pickupEnd: formatLocalDatetime(defaultEnd),
    expiresAt: formatLocalDatetime(defaultExpires)
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'Please enter a descriptive food title.';
    }

    if (!formData.description.trim()) {
      errors.description = 'Please provide details about the food, allergens, or packaging.';
    }

    if (!formData.donorName.trim()) {
      errors.donorName = 'Please enter your name or business name.';
    }

    if (!formData.donorContact.trim()) {
      errors.donorContact = 'Please enter a contact phone number or email.';
    }

    if (!formData.address.trim()) {
      errors.address = 'Please specify where food should be picked up.';
    }

    const qty = Number(formData.quantity);
    if (!qty || qty <= 0) {
      errors.quantity = 'Quantity must be at least 1.';
    }

    if (!formData.pickupStart) {
      errors.pickupStart = 'Pickup start time is required.';
    }

    if (!formData.pickupEnd) {
      errors.pickupEnd = 'Pickup end time is required.';
    }

    if (formData.pickupStart && formData.pickupEnd) {
      const start = new Date(formData.pickupStart).getTime();
      const end = new Date(formData.pickupEnd).getTime();
      if (end <= start) {
        errors.pickupEnd = 'Pickup end time must be after the start time.';
      }
    }

    if (!formData.expiresAt) {
      errors.expiresAt = 'Expiry deadline is required.';
    } else {
      const exp = new Date(formData.expiresAt).getTime();
      if (exp <= Date.now()) {
        errors.expiresAt = 'Expiry time must be in the future.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        donorName: formData.donorName.trim(),
        donorContact: formData.donorContact.trim().toLowerCase(),
        contact: formData.donorContact.trim().toLowerCase(), // backwards compatibility
        address: formData.address.trim(),
        quantity: Number(formData.quantity),
        totalQuantity: Number(formData.quantity),
        unit: formData.unit,
        pickupStart: new Date(formData.pickupStart).toISOString(),
        pickupEnd: new Date(formData.pickupEnd).toISOString(),
        expiresAt: new Date(formData.expiresAt).toISOString()
      };

      const res = await createListing(payload);
      const resData = res.data || res;
      const createdId = resData._id || resData.id || (resData.listing && (resData.listing._id || resData.listing.id));

      showToast('Surplus food listing created successfully!', 'success');

      if (createdId) {
        navigate(`/listings/${createdId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Create listing error:', err);
      const message = err.message || 'Could not create listing. Please check the fields and try again.';
      showToast(message, 'error');

      // Map server validation errors to inline fields
      if (Array.isArray(err.errors)) {
        const serverErrors = {};
        err.errors.forEach((e) => {
          const field = e.param || e.field || e.path;
          if (field) {
            serverErrors[field] = e.msg || e.message;
          }
        });
        setFormErrors(serverErrors);
      } else if (err.data?.field) {
        setFormErrors({ [err.data.field]: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container main-content">
      <div className="create-listing-page">
        <Link to="/" className="listing-detail__back">
          &larr; Back to browse
        </Link>

        <div className="create-listing-card">
          <header className="create-listing__header">
            <h1 className="create-listing__title">Share Surplus Food</h1>
            <p className="create-listing__subtitle">
              List excess prepared meals, baked goods, or fresh ingredients for community rescue.
            </p>
          </header>

          <form className="create-listing-form" onSubmit={handleSubmit} noValidate>
            <h2 className="form-section-title">Food Information</h2>

            <div className="form-group">
              <label htmlFor="title" className="form-label">
                Food item title <span className="required">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className={`form-control ${formErrors.title ? 'has-error' : ''}`}
                placeholder="e.g. 15 Assorted Sourdough Loaves & Croissants"
                value={formData.title}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {formErrors.title && <div className="form-error">{formErrors.title}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category" className="form-label">
                  Category <span className="required">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  className="form-control"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="cooked">Cooked Meals</option>
                  <option value="packaged">Packaged Goods</option>
                  <option value="produce">Fresh Produce</option>
                  <option value="bakery">Bakery & Pastries</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantity" className="form-label">
                  Quantity <span className="required">*</span>
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  className={`form-control ${formErrors.quantity ? 'has-error' : ''}`}
                  value={formData.quantity}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {formErrors.quantity && <div className="form-error">{formErrors.quantity}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="unit" className="form-label">
                  Unit <span className="required">*</span>
                </label>
                <select
                  id="unit"
                  name="unit"
                  className="form-control"
                  value={formData.unit}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="portions">Portions</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="packs">Packs</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description & allergens <span className="required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows="3"
                className={`form-control ${formErrors.description ? 'has-error' : ''}`}
                placeholder="Mention key ingredients, dietary details (e.g. vegetarian, gluten-free), and storage condition."
                value={formData.description}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {formErrors.description && <div className="form-error">{formErrors.description}</div>}
            </div>

            <h2 className="form-section-title">Donor & Location</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="donorName" className="form-label">
                  Donor or business name <span className="required">*</span>
                </label>
                <input
                  id="donorName"
                  name="donorName"
                  type="text"
                  className={`form-control ${formErrors.donorName ? 'has-error' : ''}`}
                  placeholder="e.g. Downtown Bakery"
                  value={formData.donorName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {formErrors.donorName && <div className="form-error">{formErrors.donorName}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="donorContact" className="form-label">
                  Contact email or phone <span className="required">*</span>
                </label>
                <input
                  id="donorContact"
                  name="donorContact"
                  type="text"
                  className={`form-control ${formErrors.donorContact ? 'has-error' : ''}`}
                  placeholder="e.g. bakery@example.com or 555-0144"
                  value={formData.donorContact}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <span className="form-hint">Used to verify and manage your listing on Donor Desk.</span>
                {formErrors.donorContact && <div className="form-error">{formErrors.donorContact}</div>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address" className="form-label">
                Pickup address <span className="required">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                rows="2"
                className={`form-control ${formErrors.address ? 'has-error' : ''}`}
                placeholder="e.g. 104 Market St, Suite 4B (side door on Elm Alley)"
                value={formData.address}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {formErrors.address && <div className="form-error">{formErrors.address}</div>}
            </div>

            <h2 className="form-section-title">Schedule & Timing</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pickupStart" className="form-label">
                  Pickup window start <span className="required">*</span>
                </label>
                <input
                  id="pickupStart"
                  name="pickupStart"
                  type="datetime-local"
                  className={`form-control ${formErrors.pickupStart ? 'has-error' : ''}`}
                  value={formData.pickupStart}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {formErrors.pickupStart && <div className="form-error">{formErrors.pickupStart}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="pickupEnd" className="form-label">
                  Pickup window end <span className="required">*</span>
                </label>
                <input
                  id="pickupEnd"
                  name="pickupEnd"
                  type="datetime-local"
                  className={`form-control ${formErrors.pickupEnd ? 'has-error' : ''}`}
                  value={formData.pickupEnd}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {formErrors.pickupEnd && <div className="form-error">{formErrors.pickupEnd}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="expiresAt" className="form-label">
                  Listing expires at <span className="required">*</span>
                </label>
                <input
                  id="expiresAt"
                  name="expiresAt"
                  type="datetime-local"
                  className={`form-control ${formErrors.expiresAt ? 'has-error' : ''}`}
                  value={formData.expiresAt}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {formErrors.expiresAt && <div className="form-error">{formErrors.expiresAt}</div>}
              </div>
            </div>

            <div className="create-listing__actions">
              <Link to="/" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating listing...' : 'Create listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateListing;
