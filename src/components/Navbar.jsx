import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { href: '/', label: 'Home' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link className="brand" to="/">
          <img src="/sdlmwm-logo.jpg" alt="Scout Du Liban" width="40" height="40" />
          <span>Scout Inventory</span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              className={`nav-link ${pathname === link.href ? 'nav-link--active' : ''}`}
              to={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}