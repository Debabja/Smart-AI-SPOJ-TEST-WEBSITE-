// Shared Navbar component — Globussoft branding (Section 14), Avatar Dropdown (BUG-05)
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuthContext';
import toast from 'react-hot-toast';
import api from '../services/apiClient';

import globussoftLogo from '../assets/globussoft-logo.png';

export default function AdminNavbar() {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setDropdownOpen(false);
    try {
      await api.logout();
    } catch (_) {}
    logout();
    navigate('/admin/login');
    toast.success('Logged out successfully');
  };

  const isActive = (path) => (location.pathname.startsWith(path) ? 'active' : '');

  return (
    <>
      <nav className="navbar">
        {/* Globussoft Logo (Section 14) */}
        <div className="navbar-brand">
          <img
            src={globussoftLogo}
            alt="Globussoft Technology"
            style={{ height: 38, width: 'auto', objectFit: 'contain', display: 'block' }}
          />
          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: 10, marginLeft: 2 }}>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.85)',
                letterSpacing: '0.05em',
              }}
            >
              Admin Panel
            </div>
          </div>
        </div>

        <div className="navbar-nav">
          <Link to="/admin" className={isActive('/admin') && location.pathname === '/admin' ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/admin/tests" className={isActive('/admin/tests')}>
            Tests
          </Link>
          <Link to="/admin/question-bank" className={isActive('/admin/question-bank')}>
            Question Bank
          </Link>
          {isSuperAdmin && (
            <Link to="/admin/create-admin" className={isActive('/admin/create-admin')}>
              Manage Admins
            </Link>
          )}

          {/* Avatar-Only Dropdown Trigger (BUG-05) */}
          <div
            ref={dropdownRef}
            style={{
              position: 'relative',
              marginLeft: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#0E7C86',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: dropdownOpen ? '2px solid #2ECC71' : '2px solid rgba(255, 255, 255, 0.65)',
                cursor: 'pointer',
                boxShadow: dropdownOpen ? '0 0 0 3px rgba(46, 204, 113, 0.3)' : '0 2px 5px rgba(0,0,0,0.2)',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
              aria-label="User account menu"
              title={`${user?.name} (${user?.role})`}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </button>

            {/* Profile Dropdown Menu */}
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: 250,
                  background: '#FFFFFF',
                  color: '#1A2B3C',
                  borderRadius: 10,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #E2E8F0',
                  zIndex: 1050,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                {/* Header Block: Avatar, Name, Role, Email */}
                <div style={{ padding: '14px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#0E7C86',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        flexShrink: 0,
                      }}
                    >
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <strong
                        style={{
                          fontSize: '0.88rem',
                          color: '#1A2B3C',
                          display: 'block',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {user?.name}
                      </strong>
                      {user?.email && (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: '#64748B',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            marginTop: 2,
                          }}
                        >
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {user?.role === 'SUPER_ADMIN' ? (
                      <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                        SUPER_ADMIN
                      </span>
                    ) : (
                      <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>

                {/* Menu Items: Profile, Settings, Help, Logout */}
                <div style={{ padding: '6px 0' }}>
                  {/* 1. Profile */}
                  <Link
                    to="/admin/profile"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      color: '#334155',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      fontWeight: 500,
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: '1rem' }}>👤</span>
                    <span>Profile</span>
                  </Link>

                  {/* 2. Settings */}
                  <Link
                    to="/admin/settings"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      color: '#334155',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      fontWeight: 500,
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: '1rem' }}>⚙️</span>
                    <span>Settings</span>
                  </Link>

                  {/* 3. Help */}
                  <Link
                    to="/admin/help"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      color: '#334155',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      fontWeight: 500,
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: '1rem' }}>❓</span>
                    <span>Help</span>
                  </Link>

                  <div style={{ borderTop: '1px solid #F1F5F9', margin: '4px 0' }} />

                  {/* 4. Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: '#DC2626',
                      fontWeight: 500,
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: '1rem' }}>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Confirmation Modal before Logout (BUG-05 Suggested Addition) */}
      {showLogoutConfirm && (
        <div className="modal-backdrop" onClick={() => setShowLogoutConfirm(false)} style={{ zIndex: 1100 }}>
          <div
            className="modal-container"
            style={{ maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #F1F5F9', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>🚪</span>
                <h3 className="modal-title" style={{ fontSize: '1.1rem', color: '#1A2B3C' }}>
                  Sign Out
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px', fontSize: '0.9rem', color: '#4B5563' }}>
              Are you sure you want to sign out of the Admin Panel?
            </div>

            <div
              className="modal-footer"
              style={{
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                borderTop: '1px solid #F1F5F9',
                background: '#F8FAFC',
              }}
            >
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-danger"
                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
