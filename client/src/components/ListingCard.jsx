import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortionPips from './PortionPips';
import './ListingCard.css';

const ListingCard = ({ listing }) => {
  const navigate = useNavigate();

  const id = listing._id || listing.id;
  const title = listing.title || 'Untitled listing';
  const category = listing.category || 'other';
  const donorName = listing.donorName || 'Anonymous donor';
  const address = listing.address || '';
  const total = Number(listing.totalQuantity !== undefined ? listing.totalQuantity : listing.quantity) || 1;
  const available = Number(
    listing.availableQuantity !== undefined
      ? listing.availableQuantity
      : (listing.remainingQuantity !== undefined ? listing.remainingQuantity : total)
  );
  const unit = listing.unit || 'portions';
  const rawStatus = listing.status || (available <= 0 ? 'sold_out' : 'active');
  const expiresAt = listing.expiresAt || listing.pickupEnd;

  // Countdown calculation
  const [timeLeft, setTimeLeft] = useState({ text: '', isUrgent: false, isExpired: false });

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft({ text: 'No expiry', isUrgent: false, isExpired: false });
      return;
    }

    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        return { text: 'Expired', isUrgent: true, isExpired: true };
      }

      const totalMinutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;

      const isUrgent = totalMinutes < 30;

      let text = '';
      if (days > 0) {
        text = `${days}d ${remHours}h left`;
      } else if (hours > 0) {
        text = `${hours}h ${minutes}m left`;
      } else {
        text = `${minutes}m left`;
      }

      return { text, isUrgent, isExpired: false };
    };

    setTimeLeft(calculateTime());
    const interval = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 60000); // 1-minute interval for card preview is great

    return () => clearInterval(interval);
  }, [expiresAt]);

  const effectiveStatus = timeLeft.isExpired ? 'expired' : rawStatus;

  const handleClick = () => {
    navigate(`/listings/${id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/listings/${id}`);
    }
  };

  return (
    <article
      className="listing-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Pickup ticket for ${title}`}
    >
      <div className="listing-card__body">
        <div>
          <div className="listing-card__header">
            <h3 className="listing-card__title">{title}</h3>
            <span className={`badge badge-${category.toLowerCase()}`}>
              {category}
            </span>
          </div>
          <div className="listing-card__donor">
            <span>👤</span>
            <span>{donorName}</span>
          </div>
          {address && (
            <div className="listing-card__address" title={address}>
              <span>📍</span>
              <span>{address}</span>
            </div>
          )}
        </div>

        <div className="listing-card__footer">
          <PortionPips
            total={total}
            available={available}
            unit={unit}
            showLabel={false}
          />
        </div>
      </div>

      <div className="listing-card__stub">
        <span className={`badge badge-${effectiveStatus.toLowerCase()}`}>
          {effectiveStatus.replace('_', ' ')}
        </span>

        <div>
          <div className="listing-card__qty">
            {available}
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--muted-text)' }}>
              /{total}
            </span>
          </div>
          <div className="listing-card__unit">{unit}</div>
        </div>

        <div className={`listing-card__time ${timeLeft.isUrgent ? 'listing-card__time--urgent' : ''}`}>
          <span aria-hidden="true">⏱️</span>
          <span>{timeLeft.text}</span>
        </div>
      </div>
    </article>
  );
};

export default ListingCard;
