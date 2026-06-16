import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { hasRouteAccess } from '../../data/roles';
import styles from './Sidebar.module.css';

const nav = [
  { group: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: '▦' },
    { to: '/shipments', label: 'Shipments', icon: '⬡' },
    { to: '/sensors', label: 'Sensors', icon: '◎' },
  ]},
  { group: 'Compliance', items: [
    { to: '/alerts', label: 'Alerts', icon: '△', badge: 'alerts' },
    { to: '/excursions', label: 'Excursions', icon: '⚠', badge: 'open' },
    { to: '/reports', label: 'Reports', icon: '↗' },
  ]},
  { group: 'Admin', items: [
    { to: '/shipments/new', label: 'Register Shipment', icon: '+' },
    { to: '/sensors/new', label: 'Register Device', icon: '+' },
    { to: '/users', label: 'Users', icon: '◈' },
  ]},
];

const roleColors = {
  QA_OFFICER: '#58a6ff',
  MANAGER: '#3fb950',
  COMPLIANCE_OFFICER: '#d29922',
  ADMIN: '#f85149',
};

export default function Sidebar() {
  const { user, logout, unacknowledgedAlerts, openCount } = useApp();
  const navigate = useNavigate();

  const getBadge = (key) => {
    if (key === 'alerts') return unacknowledgedAlerts;
    if (key === 'open') return openCount;
    return 0;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter nav groups to only show accessible routes
  const visibleNav = nav
    .map(group => ({
      ...group,
      items: group.items.filter(item => hasRouteAccess(user?.role, item.to)),
    }))
    .filter(group => group.items.length > 0);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo} onClick={() => navigate('/')}>
        <div className={styles.logoIcon}>❄</div>
        <div>
          <div className={styles.logoName}>TempSafe</div>
          <div className={styles.logoSub}>IoT Monitor</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {visibleNav.map(group => (
          <div key={group.group} className={styles.navGroup}>
            <div className={styles.groupLabel}>{group.group}</div>
            {group.items.map(item => {
              const count = item.badge ? getBadge(item.badge) : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.active : ''}`
                  }
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {count > 0 && <span className={styles.navBadge}>{count}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userCard}>
          <div
            className={styles.avatar}
            style={{
              background: roleColors[user?.role] + '22',
              color: roleColors[user?.role],
            }}
          >
            {user?.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userRole} style={{ color: roleColors[user?.role] }}>
              {user?.role.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 16, padding: '4px 6px',
            borderRadius: 6, lineHeight: 1,
          }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          ⏻
        </button>
      </div>
    </aside>
  );
}
