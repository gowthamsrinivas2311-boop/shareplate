import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__brand" onClick={closeMenu}>
          <span>🍽️</span>
          <span>SharePlate</span>
        </Link>

        <button
          className="navbar__toggle"
          onClick={toggleMenu}
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
        >
          {isOpen ? '✕' : '☰'}
        </button>

        <nav
          className={`navbar__menu ${isOpen ? 'navbar__menu--open' : ''}`}
          aria-label="Main navigation"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `navbar__link ${isActive ? 'navbar__link--active' : ''}`
            }
            onClick={closeMenu}
          >
            Browse
          </NavLink>
          <NavLink
            to="/donor"
            className={({ isActive }) =>
              `navbar__link ${isActive ? 'navbar__link--active' : ''}`
            }
            onClick={closeMenu}
          >
            Donor desk
          </NavLink>
          <NavLink
            to="/pickup"
            className={({ isActive }) =>
              `navbar__link ${isActive ? 'navbar__link--active' : ''}`
            }
            onClick={closeMenu}
          >
            Find my pickup
          </NavLink>
          <NavLink
            to="/donate"
            className={({ isActive }) =>
              `navbar__link navbar__cta ${isActive ? 'navbar__link--active' : ''}`
            }
            onClick={closeMenu}
          >
            Donate food
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
