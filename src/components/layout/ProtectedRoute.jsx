import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { hasRouteAccess } from '../../data/roles';

export default function ProtectedRoute({ children }) {
  const { user } = useApp();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRouteAccess(user.role, location.pathname)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12,
        color: 'var(--text-secondary)',
      }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Access Denied</div>
        <div style={{ fontSize: 13 }}>
          Your role (<strong>{user.role.replace(/_/g, ' ')}</strong>) does not have permission to view this page.
        </div>
      </div>
    );
  }

  return children;
}
