import React from 'react';
import './PortionPips.css';

const PortionPips = ({
  total: totalProp,
  available: availableProp,
  totalQuantity,
  availableQuantity,
  unit = 'portions',
  showLabel = false
}) => {
  const total = Number(totalProp !== undefined ? totalProp : totalQuantity) || 0;
  const available = Number(availableProp !== undefined ? availableProp : (availableQuantity !== undefined ? availableQuantity : total)) || 0;

  const safeAvailable = Math.max(0, Math.min(available, total));
  const safeTotal = Math.max(1, total);
  const percentage = Math.round((safeAvailable / safeTotal) * 100);

  if (total <= 30) {
    // Generate dots: filled for available, hollow for reserved
    const dots = [];
    for (let i = 0; i < total; i++) {
      const isAvailable = i < safeAvailable;
      dots.push(
        <span
          key={i}
          className={`portion-pip ${isAvailable ? 'portion-pip--available' : 'portion-pip--reserved'}`}
          title={isAvailable ? 'Available portion' : 'Reserved portion'}
          aria-hidden="true"
        />
      );
    }

    return (
      <div
        className="portion-pips"
        role="meter"
        aria-label={`${safeAvailable} of ${total} ${unit} available`}
        aria-valuenow={safeAvailable}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className="portion-pips__row">{dots}</div>
        {showLabel && (
          <div className="portion-pips__label">
            <span>{safeAvailable} of {total} {unit} left</span>
          </div>
        )}
      </div>
    );
  }

  // If total > 30, show progress bar
  return (
    <div
      className="portion-pips"
      role="progressbar"
      aria-label={`${safeAvailable} of ${total} ${unit} available`}
      aria-valuenow={safeAvailable}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div className="portion-progress-track">
        <div
          className="portion-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="portion-pips__label">
          <span>{safeAvailable} of {total} {unit} left</span>
          <span>{percentage}%</span>
        </div>
      )}
    </div>
  );
};

export default PortionPips;
