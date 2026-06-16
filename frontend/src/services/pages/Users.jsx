import React from 'react';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge from '../../components/layout/StatusBadge';
import { users } from '../../data/mockData';
import styles from './TablePage.module.css';

const roleColors = {
  QA_OFFICER: '#58a6ff',
  MANAGER: '#3fb950',
  COMPLIANCE_OFFICER: '#d29922',
  ADMIN: '#f85149',
};

export default function Users() {
  return (
    <div className={styles.page}>
      <PageHeader title="Users" subtitle={`${users.length} registered users`} />
      <div className={styles.content}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>User</th><th>Email</th><th>Role</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={styles.row}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: roleColors[u.role] + '22',
                        color: roleColors[u.role],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600, flexShrink: 0,
                      }}>
                        {u.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td><span className={styles.mono}>{u.email}</span></td>
                  <td>
                    <span style={{
                      background: roleColors[u.role] + '22',
                      color: roleColors[u.role],
                      fontSize: 11, fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      padding: '3px 8px', borderRadius: 20,
                    }}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
