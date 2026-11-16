import React from 'react';
import './Spinner.css';

const Spinner = ({ size = 'md', message = 'Loading...' }) => {
  return (
    <div className="spinner-wrapper" role="status" aria-live="polite">
      <div className={`spinner spinner--${size}`} />
      <span className="sr-only">{message}</span>
      {message && size !== 'sm' && (
        <p className="spinner-message">{message}</p>
      )}
    </div>
  );
};

export default Spinner;
