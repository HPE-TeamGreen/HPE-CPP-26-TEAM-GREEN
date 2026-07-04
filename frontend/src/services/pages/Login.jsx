import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { users } from '../../data/mockData';
import styles from './Login.module.css';

const roleColors = {
  QA_OFFICER: '#58a6ff',
  MANAGER: '#3fb950',
  COMPLIANCE_OFFICER: '#d29922',
  ADMIN: '#f85149',
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!email || !password) { setError('Please enter email and password.'); return; }
    const result = login(email, password);
    if (!result.success) { setError(result.error); return; }
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>❄</span>
          <div>
            <div className={styles.logoName}>TempSafe Monitor</div>
            <div className={styles.logoSub}>IoT Temperature Platform</div>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="email"
            placeholder="you@tempsafe.io"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <input
            className={styles.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <button className={styles.btn} onClick={handleLogin}>Sign In</button>

        <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, textAlign: 'center' }}>
            Demo accounts — click to fill
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => { setEmail(u.email); setPassword('demo'); setError(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                  textAlign: 'left', width: '100%',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: roleColors[u.role] + '22', color: roleColors[u.role],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {u.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: roleColors[u.role], fontFamily: 'var(--font-mono)' }}>
                    {u.role.replace(/_/g, ' ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
