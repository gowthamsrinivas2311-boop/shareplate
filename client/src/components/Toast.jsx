import React from 'react';
import './Toast.css';

const Toast = ({ toasts, onClose }) => {
  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type || 'info'} ${toast.isExiting ? 'toast--exiting' : ''}`}
          role="alert"
        >
          <div className="toast__content">
            <span className="toast__icon" aria-hidden="true">
              {getIcon(toast.type)}
            </span>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            className="toast__close"
            onClick={() => onClose(toast.id)}
            aria-label="Close notification"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
