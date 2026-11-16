import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { lookupReservation, cancelReservation } from '../api/reservations';
import Spinner from '../components/Spinner';
import { useToast } from '../hooks/useToast';
import './FindPickup.css';

const FindPickup = () => {
  const { showToast } = useToast();

  const [contact, setContact] = useState('');
  const [pickupCode, setPickupCode] = useState('');
  const [reservation, setReservation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    const cleanContact = contact.trim().toLowerCase();
    const cleanCode = pickupCode.trim().toUpperCase();

    if (!cleanContact) {
      showToast('Please enter your contact phone or email.', 'error');
      return;
    }

    if (!cleanCode) {
      showToast('Please enter your pickup code.', 'error');
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    setReservation(null);
    setHasSearched(true);

    try {
      const res = await lookupReservation(cleanContact, cleanCode);
      const data = res.data || res;

      if (!data || (Array.isArray(data) && data.length === 0)) {
        setSearchError('No matching reservation found. Please check your contact and pickup code.');
      } else {
        // If an array was returned, grab the first reservation
        const item = Array.isArray(data) ? data[0] : data;
        setReservation(item);
      }
    } catch (err) {
      console.error('Lookup failed:', err);
      const msg = err.message || 'No reservation matching those details could be found.';
      setSearchError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel this reservation? The reserved food will be returned to the community pool.'
    );
    if (!confirmed) return;

    setIsCancelling(true);
    const resId = reservation._id || reservation.id;
    const code = reservation.pickupCode || pickupCode.trim().toUpperCase();

    try {
      await cancelReservation(resId, code);
      showToast('Reservation successfully cancelled.', 'info');
      setReservation((prev) => ({
        ...prev,
        status: 'cancelled'
      }));
    } catch (err) {
      console.error('Cancellation failed:', err);
      showToast(err.message || 'Failed to cancel reservation.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCopy = () => {
    const codeToCopy = reservation?.pickupCode || pickupCode.trim().toUpperCase();
    if (codeToCopy) {
      navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(true);
      showToast('Pickup code copied to clipboard!', 'info');
      setTimeout(() => setCopiedCode(false), 3000);
    }
  };

  const listing = reservation?.listingId || reservation?.listing || reservation?.foodListing || {};
  const listingId = listing._id || listing.id || reservation?.listingId;
  const status = reservation?.status || 'reserved';
  const pickupStart = listing.pickupStart ? new Date(listing.pickupStart).toLocaleString() : 'As scheduled';
  const pickupEnd = listing.pickupEnd ? new Date(listing.pickupEnd).toLocaleString() : 'As scheduled';

  return (
    <div className="container main-content">
      <div className="find-pickup-page">
        <header className="find-pickup__header">
          <h1 className="find-pickup__title">Find My Pickup Ticket</h1>
          <p className="find-pickup__subtitle">
            Look up your reservation, check pickup hours, or present your ticket code at pickup.
          </p>
        </header>

        {/* Search Form */}
        <div className="find-pickup-form-card">
          <form className="find-pickup-form" onSubmit={handleLookup} noValidate>
            <div className="find-pickup-form__grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="lookup-contact" className="form-label">
                  Contact email or phone <span className="required">*</span>
                </label>
                <input
                  id="lookup-contact"
                  type="text"
                  className="form-control"
                  placeholder="e.g. maya@example.com"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="lookup-code" className="form-label">
                  Pickup code <span className="required">*</span>
                </label>
                <input
                  id="lookup-code"
                  type="text"
                  className="form-control pickup-code-input-lg"
                  placeholder="e.g. SP-49B2"
                  value={pickupCode}
                  onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
              disabled={isLoading}
            >
              {isLoading ? 'Looking up...' : 'Find reservation'}
            </button>
          </form>
        </div>

        {/* Results Area */}
        {isLoading ? (
          <Spinner message="Verifying reservation details..." />
        ) : searchError ? (
          <div className="browse-empty" role="alert">
            <div className="browse-empty__icon" aria-hidden="true">
              🔍
            </div>
            <h2 className="browse-empty__title">Reservation not found</h2>
            <p className="browse-empty__desc">{searchError}</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted-text)' }}>
              Check for typos in your contact address or pickup code, or check your confirmation email/message.
            </p>
          </div>
        ) : reservation ? (
          <article className="pickup-result-card" aria-label="Reservation details">
            <div className="pickup-result-header">
              <div>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--spinach)', marginBottom: '0.25rem' }}>
                  {listing.title || 'Reserved Surplus Meal'}
                </h2>
                <div style={{ fontSize: '0.9rem', color: 'var(--muted-text)' }}>
                  Reserved by {reservation.reserverName || reservation.name || contact}
                </div>
              </div>

              <span className={`badge badge-${status.toLowerCase()}`}>
                {status}
              </span>
            </div>

            <div className="pickup-result-body">
              {/* Large Ticket Display */}
              <div className="pickup-result__code-banner">
                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Official Pickup Code
                </span>
                <div className="pickup-code-display">
                  {reservation.pickupCode || pickupCode.toUpperCase()}
                </div>
                <button
                  type="button"
                  className="btn btn-accent btn-sm"
                  onClick={handleCopy}
                >
                  {copiedCode ? '✓ Copied!' : '📋 Copy code'}
                </button>
              </div>

              {/* Grid details */}
              <div className="pickup-result-details-grid">
                <div>
                  <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted-text)' }}>
                    RESERVED PORTIONS
                  </strong>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--spinach)' }}>
                    {reservation.quantity} {listing.unit || 'portions'}
                  </span>
                </div>

                <div>
                  <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted-text)' }}>
                    PICKUP WINDOW
                  </strong>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    {pickupStart} &ndash; {pickupEnd}
                  </span>
                </div>

                <div>
                  <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted-text)' }}>
                    PICKUP ADDRESS
                  </strong>
                  <span style={{ fontSize: '0.95rem' }}>
                    📍 {listing.address || 'Address on file'}
                  </span>
                </div>

                <div>
                  <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted-text)' }}>
                    DONOR CONTACT
                  </strong>
                  <span style={{ fontSize: '0.95rem' }}>
                    👤 {listing.donorName || 'Donor'} {listing.donorContact ? `(${listing.donorContact})` : ''}
                  </span>
                </div>
              </div>

              <div className="pickup-result-actions">
                {listingId ? (
                  <Link to={`/listings/${listingId}`} className="btn btn-secondary btn-sm">
                    View original listing
                  </Link>
                ) : <div />}

                {status === 'reserved' && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleCancel}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel reservation'}
                  </button>
                )}
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
};

export default FindPickup;
