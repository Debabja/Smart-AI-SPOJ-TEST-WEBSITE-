// TestStatusBadge.jsx — Shared Test Status Badge with pulsing LIVE indicator (BUG-27)
import React from 'react';

export default function TestStatusBadge({ status, style = {}, className = '' }) {
  const currentStatus = status || 'DRAFT';
  const isLive = currentStatus === 'LIVE';
  const isEnded = currentStatus === 'ENDED';

  const badgeClass = isLive
    ? 'badge-success'
    : isEnded
    ? 'badge-info'
    : 'badge-secondary';

  return (
    <span
      className={`badge ${badgeClass} ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        ...style,
      }}
    >
      {isLive && (
        <span className="live-dot-pulse" aria-hidden="true">
          ●
        </span>
      )}
      <span>{currentStatus}</span>
    </span>
  );
}
