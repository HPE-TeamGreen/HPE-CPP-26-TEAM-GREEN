import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge from '../../components/layout/StatusBadge';
import Button from '../../components/layout/Button';
import styles from './TablePage.module.css';

export default function Sensors() {
  const { sensors, shipments } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  const getShipment = (id) => shipments.find(s => s.sensorId === id);

  const visible = sensors.filter(s => {
    if (!query.trim()) return true;
    const ship = getShipment(s.id);
    const q = query.toLowerCase();
    return [
      s.id,
      s.status,
      s.shipmentId,
      s.calibrationDate,
      ship?.product,
      ship?.origin,
      ship?.destination,
    ].filter(Boolean).some(value => value.toLowerCase().includes(q));
  });

  const showToast = (message) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2000);
  };

  const copyToClipboard = async (value) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const el = document.createElement('textarea');
        el.value = value;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      showToast(`Copied ${value}`);
    } catch (err) {
      showToast('Copy failed');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Sensors"
        subtitle={`${sensors.length} registered devices`}
        actions={<Button variant="primary" onClick={() => navigate('/sensors/new')}>+ Register Device</Button>}
      />
      <div className={styles.content}>
        {toast && <div className={styles.toast}>{toast}</div>}
        <div className={styles.controlsRow}>
          <div className={styles.searchWrap}>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search sensors, shipments, products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {visible.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No sensors match your search.</div>
            <div className={styles.emptySub}>Try a different keyword.</div>
            <Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sensor ID</th><th>Status</th><th>Linked Shipment</th>
                  <th>Product</th><th>Calibration Date</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(s => {
                  const ship = getShipment(s.id);
                  return (
                    <tr key={s.id} className={styles.row}>
                      <td>
                        <div className={styles.rowId}>
                          <span className={styles.mono}>{s.id}</span>
                          <button
                            type="button"
                            className={styles.copyBadge}
                            onClick={() => copyToClipboard(s.id)}
                            title="Copy sensor ID"
                            aria-label="Copy sensor ID"
                          >
                            <svg className={styles.copyIcon} viewBox="0 0 24 24" aria-hidden="true">
                              <rect x="9" y="7" width="10" height="12" rx="2" />
                              <rect x="5" y="3" width="10" height="12" rx="2" />
                            </svg>
                          </button>
                        </div>
                        <span className={styles.rowSub}>{s.shipmentId ? `Shipment ${s.shipmentId}` : 'Unassigned'}</span>
                      </td>
                      <td><StatusBadge status={s.status} /></td>
                      <td><span className={styles.mono}>{s.shipmentId || '—'}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{ship?.product || '—'}</td>
                      <td><span className={styles.mono}>{s.calibrationDate}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
