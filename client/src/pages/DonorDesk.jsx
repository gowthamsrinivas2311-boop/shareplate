import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getListings, cancelListing, getListingReservations } from '../api/listings';
import { collectReservation } from '../api/reservations';
import Spinner from '../components/Spinner';
import PortionPips from '../components/PortionPips';
import { useToast } from '../hooks/useToast';
import './DonorDesk.css';

const DonorDesk = () => {
  const { showToast } = useToast();

  const [contactInput, setContactInput] = useState('');
  const [searchedContact, setSearchedContact] = useState('');
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Expanded listings map: { [listingId]: true/false }
  const [expandedMap, setExpandedMap] = useState({});
  // Reservations per listing: { [listingId]: [ ... ] }
  const [reservationsMap, setReservationsMap] = useState({});
  const [loadingReservations, setLoadingReservations] = useState({});

  // Input pickup codes for collection: { [reservationId]: code }
  const [pickupCodes, setPickupCodes] = useState({});
  const [processingReservation, setProcessingReservation] = useState({});
  const [cancellingListingId, setCancellingListingId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    const cleanContact = contactInput.trim().toLowerCase();
    if (!cleanContact) {
      showToast('Please enter your donor contact email or phone.', 'error');
      return;
    }

    setIsLoading(true);
    setSearchedContact(cleanContact);
    setHasSearched(true);

    try {
      // Query listings by donor contact
      const res = await getListings({ donorContact: cleanContact, status: 'all' });

      let items = [];
      if (Array.isArray(res)) items = res;
      else if (res?.data && Array.isArray(res.data)) items = res.data;
      else if (res?.listings && Array.isArray(res.listings)) items = res.listings;
      else if (res?.data?.listings && Array.isArray(res.data.listings)) items = res.data.listings;

      // Filter client-side as safeguard if backend returns all listings
      const filtered = items.filter(
        (item) =>
          (item.donorContact && item.donorContact.toLowerCase() === cleanContact) ||
          (item.contact && item.contact.toLowerCase() === cleanContact)
      );

      setListings(filtered.length > 0 ? filtered : items);
    } catch (err) {
      console.error('Failed to find donor listings:', err);
      showToast(err.message || 'Error loading listings for this contact', 'error');
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = async (listingId) => {
    const isCurrentlyExpanded = !!expandedMap[listingId];
    setExpandedMap((prev) => ({
      ...prev,
      [listingId]: !isCurrentlyExpanded
    }));

    if (!isCurrentlyExpanded && !reservationsMap[listingId]) {
      // Fetch reservations for this listing
      setLoadingReservations((prev) => ({ ...prev, [listingId]: true }));
      try {
        const res = await getListingReservations(listingId);
        const resList = Array.isArray(res)
          ? res
          : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.reservations) ? res.reservations : []));
        setReservationsMap((prev) => ({
          ...prev,
          [listingId]: resList
        }));
      } catch (err) {
        console.error('Failed to load reservations:', err);
        showToast(err.message || 'Could not load reservations for this listing', 'error');
      } finally {
        setLoadingReservations((prev) => ({ ...prev, [listingId]: false }));
      }
    }
  };

  const handlePickupCodeChange = (resId, val) => {
    setPickupCodes((prev) => ({
      ...prev,
      [resId]: val
    }));
  };

  const handleMarkCollected = async (listingId, resId) => {
    const code = pickupCodes[resId]?.trim();
    if (!code) {
      showToast('Please enter the customer pickup code.', 'error');
      return;
    }

    setProcessingReservation((prev) => ({ ...prev, [resId]: true }));
    try {
      await collectReservation(resId, code.toUpperCase());
      showToast('Reservation marked as collected!', 'success');

      // Update reservation status in local state
      setReservationsMap((prev) => ({
        ...prev,
        [listingId]: (prev[listingId] || []).map((r) =>
          (r._id === resId || r.id === resId) ? { ...r, status: 'collected' } : r
        )
      }));

      // Clear input
      setPickupCodes((prev) => ({ ...prev, [resId]: '' }));
    } catch (err) {
      console.error('Collect error:', err);
      showToast(err.message || 'Invalid pickup code or collection failed.', 'error');
    } finally {
      setProcessingReservation((prev) => ({ ...prev, [resId]: false }));
    }
  };

  const handleCancelListing = async (listingId) => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this surplus listing? Active reservations will be alerted.'
    );
    if (!confirmed) return;

    setCancellingListingId(listingId);
    try {
      await cancelListing(listingId);
      showToast('Listing has been cancelled.', 'info');

      // Update status in list
      setListings((prev) =>
        prev.map((l) =>
          (l._id === listingId || l.id === listingId) ? { ...l, status: 'cancelled' } : l
        )
      );
    } catch (err) {
      console.error('Cancel listing error:', err);
      showToast(err.message || 'Failed to cancel listing.', 'error');
    } finally {
      setCancellingListingId(null);
    }
  };

  return (
    <div className="container main-content">
      <div className="donor-desk-page">
        <header className="donor-desk__header">
          <h1 className="donor-desk__title">Donor Desk</h1>
          <p className="donor-desk__subtitle">
            Manage your surplus food listings, verify pickup codes, and record collections.
          </p>
        </header>

        {/* Step 1: Donor Contact Search */}
        <section className="donor-lookup-card">
          <div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--spinach)', marginBottom: '0.25rem' }}>
              Find your listings
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted-text)' }}>
              Enter the email address or phone number you used when creating your food listings.
            </p>
          </div>

          <form className="donor-lookup-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. bakery@example.com or 555-0144"
              value={contactInput}
              onChange={(e) => setContactInput(e.target.value)}
              disabled={isLoading}
              aria-label="Donor contact phone or email"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : 'Find my listings'}
            </button>
          </form>
        </section>

        {/* Step 2: Listings List */}
        {isLoading ? (
          <Spinner message="Searching for your donor listings..." />
        ) : hasSearched ? (
          <section className="donor-listings-container" aria-label="Your listings">
            {listings.length === 0 ? (
              <div className="browse-empty">
                <div className="browse-empty__icon" aria-hidden="true">
                  📦
                </div>
                <h2 className="browse-empty__title">No listings found</h2>
                <p className="browse-empty__desc">
                  We could not find any food listings associated with "{searchedContact}".
                  Make sure you typed the exact contact email or phone number.
                </p>
                <Link to="/donate" className="btn btn-primary">
                  Create a new listing
                </Link>
              </div>
            ) : (
              listings.map((listing) => {
                const listingId = listing._id || listing.id;
                const isExpanded = !!expandedMap[listingId];
                const reservations = reservationsMap[listingId] || listing.reservations || [];
                const isLoadingRes = !!loadingReservations[listingId];
                const isCancelled = listing.status === 'cancelled';
                const total = listing.totalQuantity || listing.quantity || 1;
                const available = listing.availableQuantity !== undefined ? listing.availableQuantity : total;
                const unit = listing.unit || 'portions';

                return (
                  <article key={listingId} className="donor-listing-item">
                    <div
                      className="donor-listing-header"
                      onClick={() => toggleExpand(listingId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleExpand(listingId);
                        }
                      }}
                      aria-expanded={isExpanded}
                    >
                      <div className="donor-listing-header__left">
                        <div className="donor-listing-title">
                          <span>{listing.title}</span>
                          <span className={`badge badge-${(listing.status || 'active').toLowerCase()}`}>
                            {(listing.status || 'active').replace('_', ' ')}
                          </span>
                        </div>
                        <div className="donor-listing-meta">
                          <span>📍 {listing.address}</span>
                          <span>
                            📦 {available} / {total} {unit} left
                          </span>
                          <span>
                            Expires: {listing.expiresAt ? new Date(listing.expiresAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="donor-listing-header__right">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(listingId);
                          }}
                        >
                          {isExpanded ? 'Hide reservations ▲' : 'View reservations ▼'}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Area */}
                    {isExpanded && (
                      <div className="donor-listing-content">
                        <div className="donor-listing-actions-row">
                          <div style={{ maxWidth: '300px', width: '100%' }}>
                            <PortionPips
                              total={total}
                              available={available}
                              unit={unit}
                              showLabel={true}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <Link
                              to={`/listings/${listingId}`}
                              className="btn btn-secondary btn-sm"
                            >
                              Public listing page
                            </Link>
                            {!isCancelled && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleCancelListing(listingId)}
                                disabled={cancellingListingId === listingId}
                              >
                                {cancellingListingId === listingId ? 'Cancelling...' : 'Cancel listing'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="reservations-section-title">
                            <span>👥</span>
                            <span>Reservations ({reservations.length})</span>
                          </h3>

                          {isLoadingRes ? (
                            <Spinner size="sm" message="Loading reservations..." />
                          ) : reservations.length === 0 ? (
                            <p style={{ color: 'var(--muted-text)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                              No reservations placed yet for this listing.
                            </p>
                          ) : (
                            <div className="reservations-list">
                              {reservations.map((res) => {
                                const resId = res._id || res.id;
                                const resStatus = res.status || 'reserved';
                                const isCollected = resStatus === 'collected';
                                const isResCancelled = resStatus === 'cancelled';
                                const isProcessing = !!processingReservation[resId];

                                return (
                                  <div key={resId} className="reservation-row">
                                    <div className="reservation-row__info">
                                      <div className="reservation-row__name">
                                        {res.reserverName || res.name || 'Anonymous Reserver'}
                                      </div>
                                      <div className="reservation-row__meta">
                                        Quantity: <strong>{res.quantity} {unit}</strong> &bull; Contact: {res.reserverContact || res.contact}
                                      </div>
                                    </div>

                                    <div className="reservation-row__action">
                                      <span className={`badge badge-${resStatus.toLowerCase()}`}>
                                        {resStatus}
                                      </span>

                                      {resStatus === 'reserved' && (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                          <input
                                            type="text"
                                            className="form-control pickup-code-input"
                                            placeholder="Code"
                                            maxLength={10}
                                            value={pickupCodes[resId] || ''}
                                            onChange={(e) => handlePickupCodeChange(resId, e.target.value)}
                                            disabled={isProcessing}
                                            aria-label="Enter pickup code"
                                          />
                                          <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleMarkCollected(listingId, resId)}
                                            disabled={isProcessing || !pickupCodes[resId]?.trim()}
                                          >
                                            {isProcessing ? 'Verifying...' : 'Mark collected'}
                                          </button>
                                        </div>
                                      )}

                                      {isCollected && (
                                        <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>
                                          ✓ Handed over
                                        </span>
                                      )}

                                      {isResCancelled && (
                                        <span style={{ fontSize: '0.85rem', color: 'var(--tomato)' }}>
                                          Cancelled
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default DonorDesk;
