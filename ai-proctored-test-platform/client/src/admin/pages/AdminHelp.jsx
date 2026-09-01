// AdminHelp.jsx — Lightweight Help & Support Page (BUG-05)
import React from 'react';
import { Link } from 'react-router-dom';
import AdminNavbar from '../../shared/AdminNavbar';

export default function AdminHelp() {
  return (
    <div className="app-layout">
      <AdminNavbar />
      <main className="main-content">
        {/* Breadcrumbs */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
          <Link to="/admin" style={{ color: '#0E7C86', fontWeight: 500 }}>
            ← Dashboard
          </Link>
          <span style={{ color: '#9ca3af' }}>/</span>
          <span style={{ color: '#4b5563', fontWeight: 600 }}>Help &amp; Support</span>
        </div>

        {/* Header */}
        <div className="card" style={{ marginBottom: 24, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.8rem' }}>💡</span>
            <div>
              <h1 style={{ fontSize: '1.6rem', color: '#1A2B3C', fontWeight: 800 }}>
                Help &amp; Support
              </h1>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: 4 }}>
                Platform documentation, operating guidance, and internal technical support.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Card 1: Organizational Support */}
          <div className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: '1.4rem' }}>👥</span>
              <h3 style={{ fontSize: '1.15rem', color: '#1A2B3C', fontWeight: 700, margin: 0 }}>
                Administrator Roles &amp; Access
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#4B5563', lineHeight: 1.6 }}>
              Need changes to your assigned permissions or need a new administrator account provisioned?
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px 18px', borderRadius: 8, marginTop: 14 }}>
              <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Contact Super Admin
              </div>
              <div style={{ fontSize: '0.9rem', color: '#1A2B3C', fontWeight: 600, marginTop: 4 }}>
                superadmin@globussoft.in
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4 }}>
                Super Admins manage account provisioning, role promotions, and platform configurations.
              </div>
            </div>
          </div>

          {/* Card 2: Test & Proctoring Guidance */}
          <div className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: '1.4rem' }}>📝</span>
              <h3 style={{ fontSize: '1.15rem', color: '#1A2B3C', fontWeight: 700, margin: 0 }}>
                Test Operations &amp; Proctoring
              </h3>
            </div>
            <ul style={{ paddingLeft: 18, color: '#4B5563', fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
              <li><strong>Creating Tests:</strong> Go to the Tests tab to configure title, duration, passing criteria, and question sets.</li>
              <li><strong>Room Passwords:</strong> Room join windows activate automatically when the parent Test transitions to LIVE.</li>
              <li><strong>Late Joins:</strong> Approvals for late-joining candidates can be granted from the Live Monitoring screen.</li>
              <li><strong>Malpractice:</strong> Webcam disconnection, phone detection, and tab switching are logged in real-time.</li>
            </ul>
          </div>

          {/* Card 3: Technical IT Support */}
          <div className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: '1.4rem' }}>🛠️</span>
              <h3 style={{ fontSize: '1.15rem', color: '#1A2B3C', fontWeight: 700, margin: 0 }}>
                Technical &amp; Platform Support
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#4B5563', lineHeight: 1.6 }}>
              Experiencing network disconnects, Judge0 code execution delays, or socket connection issues?
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px 18px', borderRadius: 8, marginTop: 14 }}>
              <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                IT Operations Helpdesk
              </div>
              <div style={{ fontSize: '0.9rem', color: '#1A2B3C', fontWeight: 600, marginTop: 4 }}>
                support@globussoft.in
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4 }}>
                Globussoft Technology — AI Proctored Test Platform Help Desk
              </div>
            </div>
          </div>
        </div>

        {/* Quick Navigation Links */}
        <div className="card" style={{ marginTop: 24, padding: '20px 28px', background: '#F8FAFC' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
              Quick Navigation:
            </span>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem' }}>
              <Link to="/admin" style={{ color: '#0E7C86', fontWeight: 600 }}>Dashboard</Link>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <Link to="/admin/tests" style={{ color: '#0E7C86', fontWeight: 600 }}>Tests</Link>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <Link to="/admin/question-bank" style={{ color: '#0E7C86', fontWeight: 600 }}>Question Bank</Link>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <Link to="/admin/profile" style={{ color: '#0E7C86', fontWeight: 600 }}>My Profile</Link>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <Link to="/admin/settings" style={{ color: '#0E7C86', fontWeight: 600 }}>Settings</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
