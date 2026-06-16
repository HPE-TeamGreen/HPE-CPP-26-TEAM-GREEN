import React from 'react';

const configs = {
  OPEN:       { bg: 'var(--accent-red-bg)',    color: 'var(--accent-red)' },
  CLOSED:     { bg: 'var(--accent-green-bg)',  color: 'var(--accent-green)' },
  CRITICAL:   { bg: 'var(--accent-red-bg)',    color: 'var(--accent-red)' },
  WARNING:    { bg: 'var(--accent-yellow-bg)', color: 'var(--accent-yellow)' },
  INFO:       { bg: 'var(--accent-blue-bg)',   color: 'var(--accent-blue)' },
  BREACH:     { bg: 'var(--accent-red-bg)',    color: 'var(--accent-red)' },
  SAFE:       { bg: 'var(--accent-green-bg)',  color: 'var(--accent-green)' },
  WARN:       { bg: 'var(--accent-yellow-bg)', color: 'var(--accent-yellow)' },
  IN_TRANSIT: { bg: 'var(--accent-blue-bg)',   color: 'var(--accent-blue)' },
  DELIVERED:  { bg: 'var(--accent-green-bg)',  color: 'var(--accent-green)' },
  ONLINE:     { bg: 'var(--accent-green-bg)',  color: 'var(--accent-green)' },
  OFFLINE:    { bg: 'var(--accent-red-bg)',    color: 'var(--accent-red)' },
};

export default function StatusBadge({ status }) {
  const cfg = configs[status] || { bg: 'var(--bg-hover)', color: 'var(--text-secondary)' };
  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      fontSize: '11px',
      fontWeight: 600,
      fontFamily: 'var(--font-mono)',
      padding: '3px 8px',
      borderRadius: '20px',
      letterSpacing: '.02em',
      whiteSpace: 'nowrap',
    }}>
      {status.replace('_', ' ')}
    </span>
  );
}
