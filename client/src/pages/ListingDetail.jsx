import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getListing, createReservation } from '../api/listings';
import PortionPips from '../components/PortionPips';
import Spinner from '../components/Spinner';
import { useToast } from '../hooks/useToast';
import './ListingDetail.css';

const ListingDetail = () => {
  const { id } = useParams();
  const { showToast } = useToast();

  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reserve Form State
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    quantity: 1
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Countdown timer state
  const [countdown, setCountdown] = useState({
    formatted: '',
    isUrgent: false,
    isExpired: false
  });

  const fetchListingDetails = useCallback(async () => {
    try {
      const res = await getListing(id);
      const data = res.data || res;
      setListing(data);
      return data;
    } catch (err) {
      console.error('Failed to load listing:', err);
      setError(err.message || 'Unable to load listing details.');
      showToast(err.message || 'Failed to load listing details', 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchListingDetails();
  }, [fetchListingDetails]);

  // Target deadline for countdown: expiresAt or pickupEnd
  const targetDeadline = useMemo(() => {
    if (!listing) return null;
    return listing.effectiveDeadline || listing.expiresAt || listing.pickupEnd;
  }, [listing]);

  // Live countdown timer (updates every 1s)
  useEffect(() => {
    if (!targetDeadline) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(targetDeadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({
          formatted: '00d 00h 00m 00s',
          isUrgent: true,
          isExpired: true
        });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (n) => String(n).padStart(2, '0');
      const isUrgent = totalSeconds < 1800; // less than 30 minutes

      setCountdown({
        formatted: `${days > 0 ? `${days}d ` : ''}${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
        isUrgent,
        isExpired: false
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDeadline]);

  if (isLoading) {
    return (
      <div className="container main-content">
        <Spinner message="Fetching food listing..." />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container main-content">
        <div className="listing-detail-page">
          <Link to="/" className="listing-detail__back">
            &larr; Back to browse
          </Link>
          <div className="status-notice status-notice--expired">
            <h3>Listing unavailable</h3>
            <p>{error || 'This listing could not be found or has been removed.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const title = listing.title || 'Surplus Food';
  const description = listing.description || 'No description provided.';
  const category = listing.category || 'other';
  const donorName = listing.donorName || 'Anonymous donor';
  const donorContact = listing.donorContact || '';
  const address = listing.address || 'Address provided upon reservation';
  const total = Number(listing.totalQuantity !== undefined ? listing.totalQuantity : listing.quantity) || 1;
  const available = Number(
    listing.availableQuantity !== undefined
      ? listing.availableQuantity
      : (listing.remainingQuantity !== undefined ? listing.remainingQuantity : total)
  );
  const unit = listing.unit || 'portions';
  const pickupStart = listing.pickupStart ? new Date(listing.pickupStart).toLocaleString() : 'Anytime';
  const pickupEnd = listing.pickupEnd ? new Date(listing.pickupEnd).toLocaleString() : 'Anytime';
  const rawStatus = listing.status || (available <= 0 ? 'sold_out' : 'active');
  const isExpired = countdown.isExpired || rawStatus === 'expired';
  const isSoldOut = available <= 0 || rawStatus === 'sold_out';
  const isCancelled = rawStatus === 'cancelled';
  const canReserve = !isExpired && !isSoldOut && !isCancelled && rawStatus === 'active';

  const handleInputChange = (e) => {
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

  const validateForm = () => {
    const errors = {};
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Please enter your name.';
    }

    if (!formData.contact || !formData.contact.trim()) {
      errors.contact = 'Please enter your contact phone or email.';
    }

    const qty = Number(formData.quantity);
    if (!qty || qty <= 0) {
      errors.quantity = 'Quantity must be at least 1.';
    } else if (qty > available) {
      errors.quantity = `Only ${available} ${unit} available.`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const payload = {
        reserverName: formData.name.trim(),
        reserverContact: formData.contact.trim().toLowerCase(),
        quantity: Number(formData.quantity)
      };

      const res = await createReservation(id, payload);
      const resData = res.data || res;
      const pickupCode =
        resData.pickupCode ||
        resData.reservation?.pickupCode ||
        (resData.data && resData.data.pickupCode) ||
        'SP-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      setConfirmedReservation({
        ...resData,
        pickupCode,
        quantity: Number(formData.quantity),
        name: formData.name.trim()
      });

      showToast('Reservation successful! Keep your pickup code safe.', 'success');
      // Refetch latest listing data
      fetchListingDetails();
    } catch (err) {
      console.error('Reservation error:', err);
      const errMsg = err.message || 'Could not complete reservation.';
      showToast(errMsg, 'error');

      // Map server field errors if available
      if (err.errors && Array.isArray(err.errors)) {
        const mapped = {};
        err.errors.forEach((e) => {
          if (e.param) mapped[e.param] = e.msg;
          else if (e.field) mapped[e.field] = e.message;
        });
        setFormErrors(mapped);
      } else if (err.data?.field) {
        setFormErrors({ [err.data.field]: errMsg });
      }

      // Refetch to reflect current inventory in case another user took portions
      fetchListingDetails();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (confirmedReservation?.pickupCode) {
      navigator.clipboard.writeText(confirmedReservation.pickupCode);
      setCopiedCode(true);
      showToast('Pickup code copied to clipboard!', 'info');
      setTimeout(() => setCopiedCode(false), 3000);
    }
  };

  return (
    <div className="container main-content">
      <div className="listing-detail-page">
        <Link to="/" className="listing-detail__back">
          &larr; Back to browse listings
        </Link>

        {/* Success Confirmation Modal/Banner */}
        {confirmedReservation && (
          <section className="pickup-code-banner" role="region" aria-label="Reservation confirmed">
            <span style={{ fontSize: '3rem' }}>🎉</span>
            <h2 className="pickup-code-banner__title">Reservation confirmed!</h2>
            <p className="pickup-code-banner__instruction">
              Show this unique pickup code to <strong>{donorName}</strong> when you collect your food:
            </p>

            <div className="pickup-code-display" aria-label={`Pickup code: ${confirmedReservation.pickupCode}`}>
              {confirmedReservation.pickupCode}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-accent"
                onClick={handleCopyCode}
              >
                {copiedCode ? '✓ Copied to clipboard' : '📋 Copy pickup code'}
              </button>
              <Link to="/pickup" className="btn btn-secondary">
                View my pickups
              </Link>
            </div>

            <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              You reserved {confirmedReservation.quantity} {unit}. Pickup address: {address}
            </p>
          </section>
        )}

        <article className="listing-detail-card">
          <header className="listing-detail__header">
            <div className="listing-detail__badges">
              <span className={`badge badge-${category.toLowerCase()}`}>
                {category}
              </span>
              <span className={`badge badge-${isExpired ? 'expired' : rawStatus.toLowerCase()}`}>
                {isExpired ? 'expired' : rawStatus.replace('_', ' ')}
              </span>
            </div>

            <h1 className="listing-detail__title">{title}</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-text)' }}>
              <span>Donated by <strong>{donorName}</strong></span>
              {donorContact && <span>({donorContact})</span>}
            </div>
          </header>

          {/* Countdown Display */}
          <div className={`listing-countdown ${countdown.isUrgent ? 'listing-countdown--urgent' : ''}`}>
            <span style={{ fontSize: '1.25rem' }}>⏱️</span>
            <div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isExpired ? 'Deadline status' : 'Time remaining to claim'}
              </div>
              <div className="listing-countdown__timer">
                {isExpired ? 'Expired' : countdown.formatted}
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="listing-detail__meta-grid">
            <div className="listing-detail__meta-item">
              <span className="listing-detail__meta-label">Pickup Location</span>
              <span className="listing-detail__meta-val">📍 {address}</span>
            </div>
            <div className="listing-detail__meta-item">
              <span className="listing-detail__meta-label">Pickup Window</span>
              <span className="listing-detail__meta-val">
                {pickupStart} &ndash; {pickupEnd}
              </span>
            </div>
            <div className="listing-detail__meta-item">
              <span className="listing-detail__meta-label">Remaining Portions</span>
              <span className="listing-detail__meta-val">
                {available} {unit} available
              </span>
            </div>
          </div>

          <div className="listing-detail__body">
            {/* Description */}
            <section>
              <h2 className="listing-detail__section-title">About this surplus food</h2>
              <p className="listing-detail__desc">{description}</p>
            </section>

            {/* Inventory / Portion Pips */}
            <section className="listing-qty-box">
              <div className="listing-qty-box__headline">
                <span className="listing-qty-box__amount">
                  {available} of {total} {unit} available
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted-text)' }}>
                  {total - available} reserved
                </span>
              </div>
              <PortionPips
                total={total}
                available={available}
                unit={unit}
                showLabel={true}
              />
            </section>

            {/* Reservation Form or Status Notices */}
            {canReserve ? (
              <section className="reserve-section" aria-label="Reserve surplus food">
                <h2 className="listing-detail__section-title">Reserve your portion</h2>
                <p style={{ color: 'var(--muted-text)', fontSize: '0.95rem' }}>
                  Reserving is free. Once confirmed, you will receive a pickup ticket code to present to the donor.
                </p>

                <form className="reserve-form" onSubmit={handleReserve} noValidate>
                  <div className="reserve-form__grid">
                    <div className="form-group">
                      <label htmlFor="reserve-name" className="form-label">
                        Your name <span className="required">*</span>
                      </label>
                      <input
                        id="reserve-name"
                        type="text"
                        name="name"
                        className={`form-control ${formErrors.name ? 'has-error' : ''}`}
                        placeholder="e.g. Maya Lin"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                      />
                      {formErrors.name && (
                        <div className="form-error">{formErrors.name}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="reserve-contact" className="form-label">
                        Contact phone or email <span className="required">*</span>
                      </label>
                      <input
                        id="reserve-contact"
                        type="text"
                        name="contact"
                        className={`form-control ${formErrors.contact ? 'has-error' : ''}`}
                        placeholder="e.g. maya@example.com or 555-0199"
                        value={formData.contact}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                      />
                      {formErrors.contact && (
                        <div className="form-error">{formErrors.contact}</div>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ maxWidth: '240px' }}>
                    <label htmlFor="reserve-quantity" className="form-label">
                      Quantity to reserve ({unit}) <span className="required">*</span>
                    </label>
                    <input
                      id="reserve-quantity"
                      type="number"
                      name="quantity"
                      min="1"
                      max={available}
                      className={`form-control ${formErrors.quantity ? 'has-error' : ''}`}
                      value={formData.quantity}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                    {formErrors.quantity && (
                      <div className="form-error">{formErrors.quantity}</div>
                    )}
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting || available <= 0}
                    >
                      {isSubmitting ? 'Reserving portion...' : 'Reserve now'}
                    </button>
                  </div>
                </form>
              </section>
            ) : isSoldOut ? (
              <div className="status-notice status-notice--sold-out">
                All {total} {unit} have been reserved. Thank you for helping fight food waste!
              </div>
            ) : isCancelled ? (
              <div className="status-notice status-notice--cancelled">
                This listing was cancelled by the donor.
              </div>
            ) : isExpired ? (
              <div className="status-notice status-notice--expired">
                This listing has reached its expiry window and is no longer available for pickup.
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
};

export default ListingDetail;
