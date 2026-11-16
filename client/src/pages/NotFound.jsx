import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="container main-content">
      <div className="not-found-page">
        <div className="not-found-code">
          4<span>0</span>4
        </div>
        <div style={{ fontSize: '3rem' }} aria-hidden="true">
          🥗
        </div>
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-desc">
          Looks like this plate is completely clean! The page you were looking for doesn't exist, has been moved, or eaten.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            Back to surplus listings
          </Link>
          <Link to="/donate" className="btn btn-secondary">
            Donate surplus food
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
