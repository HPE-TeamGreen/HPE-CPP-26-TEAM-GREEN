import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge from '../../components/layout/StatusBadge';
import Button from '../../components/layout/Button';
import styles from './TablePage.module.css';

export default function Alerts() {
  const { alerts, acknowledgeAlert, can } = useApp();
  const [filter, setFilter] = useState('ALL');
  const canAck = can('acknowledgeAlert');

  const filtered = filter === 'ALL' ? alerts : filter === 'UNREAD'
    ? alerts.filter(a => !a.acknowledged)
    : alerts.filter(a => a.type === filter);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Alerts"
        subtitle={`${alerts.filter(a => !a.acknowledged).length} unacknowledged`}
        actions={
          canAck && (
            <Button variant="secondary" onClick={() => alerts.forEach(a => acknowledgeAlert(a.id))}>
              Acknowledge All
            </Button>
          )
        }
      />
      <div className={styles.content}>
        <div className={styles.filters}>
          {['ALL', 'UNREAD', 'CRITICAL', 'WARNING', 'INFO'].map(f => (
            <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alert ID</th><th>Type</th><th>Shipment</th><th>Sensor</th>
                <th>Message</th><th>Time</th>
                {canAck && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className={styles.row} style={{ opacity: a.acknowledged ? 0.6 : 1 }}>
                  <td><span className={styles.mono}>{a.id}</span></td>
                  <td><StatusBadge status={a.type} /></td>
                  <td><span className={styles.mono}>{a.shipmentId}</span></td>
                  <td><span className={styles.mono}>{a.sensorId}</span></td>
                  <td style={{ maxWidth: 320 }}>{a.message}</td>
                  <td><span className={styles.mono}>{a.time}</span></td>
                  {canAck && (
                    <td>
                      {!a.acknowledged
                        ? <Button variant="secondary" onClick={() => acknowledgeAlert(a.id)} style={{ fontSize: 11, padding: '4px 10px' }}>Acknowledge</Button>
                        : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Done</span>
                      }
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
