import React, { useState } from 'react';

/**
 * Reusable Password Input with Show/Hide toggle button
 * - Keyboard-accessible, tabbable
 * - Defaults to 'password' (hidden)
 * - Independent state per instance
 * - Absolute right-aligned eye toggle with muted styling (#64748b / rgba(26, 43, 60, 0.6))
 */
export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  minLength,
  autoComplete = 'current-password',
  className = 'form-input',
  style = {},
  ...props
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        style={{
          ...style,
          paddingRight: '42px', // Ensure text doesn't clash with the toggle button
          width: '100%',
        }}
        {...props}
      />
      <button
        type="button"
        tabIndex={0}
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((prev) => !prev)}
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          padding: '6px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#64748b', // Muted slate/navy at reduced opacity
          borderRadius: '4px',
          outline: 'none',
          transition: 'color 0.15s ease, opacity 0.15s ease',
          lineHeight: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#1A2B3C'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(14, 124, 134, 0.35)'; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        {visible ? (
          /* Eye Off / Slash Icon (Click to Hide) */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
        ) : (
          /* Eye Open Icon (Click to Show) */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
