import React, { createContext, useState, useCallback, useRef } from 'react';
import Toast from '../components/Toast';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    const newToast = { id, message, type, isExiting: false };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  // Alias showToast to addToast so both can be called interchangeably
  const showToast = addToast;

  return (
    <ToastContext.Provider value={{ addToast, showToast, removeToast, toasts }}>
      {children}
      <Toast toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};
