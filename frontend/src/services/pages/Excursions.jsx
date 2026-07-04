import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge from '../../components/layout/StatusBadge';
import Button from '../../components/layout/Button';
import styles from './TablePage.module.css';
import modalStyles from './Modal.module.css';

export default function Excursions() {
  const { excursions: contextExcursions, excursionsLoading, isLiveExcursions, resolveExcursion, loadExcursions, can } = useApp();
  const [excursions, setExcursions] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const canResolve = can('resolveExcursion');

  useEffect(() => {
    setExcursions(contextExcursions);
    setLastUpdated(new Date());
  }, [contextExcursions]);

  // Periodic refresh
  useEffect(() => {
    const pollId = setInterval(() => {
      loadExcursions();
    }, 30000);
    return () => clearInterval(pollId);
  }, []);


  const filtered = filter === 'ALL' ? excursions : excursions.filter(e => e.status === filter);

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const handleExportCsv = () => {
    const headers = [
      'Excursion ID',
      'Shipment ID',
      'Sensor ID',
      'Breach Time',
      'Recorded Temp',
      'Status',
      'Resolved By',
      'Resolution Note',
    ];
    const rows = filtered.map(e => [
      e.id,
      e.shipmentId,
      e.sensorId,
      e.breachTime,
      e.recordedTemp,
      e.status,
      e.acknowledgedBy || '',
      e.resolutionNote || '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(escapeCsvValue).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `excursions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResolve = () => {
    if (!note.trim()) return;
    resolveExcursion(selected.id, note);
    setExcursions(prev => prev.map(e =>
      e.id === selected.id ? { ...e, status: 'CLOSED', resolutionNote: note } : e
    ));
    setSelected(null);
    setNote('');
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Excursions"
        subtitle={`${excursions.filter(e => e.status === 'OPEN').length} open incidents`}
        actions={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{
              background: isLiveExcursions ? 'var(--accent-green)' : 'var(--bg-hover)',
              color: isLiveExcursions ? 'var(--bg)' : 'var(--text-muted)',
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase'
            }}>
              {isLiveExcursions ? 'Live' : 'Mock'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Updating...'}
            </span>
          </div>
        }
      />
      <div className={styles.content}>
        <div className={styles.controlsRow}>
          <div className={styles.filters}>
            {['ALL', 'OPEN', 'CLOSED'].map(f => (
              <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={handleExportCsv}
            disabled={excursionsLoading || filtered.length === 0}
            style={{ fontSize: 11, padding: '6px 12px' }}
          >
            Export CSV
          </Button>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Excursion ID</th><th>Shipment</th><th>Sensor</th><th>Breach Time</th>
                <th>Recorded Temp</th><th>Status</th><th>Resolved By</th>
                {canResolve && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {excursionsLoading && (
                <tr className={styles.row}>
                  <td colSpan={canResolve ? 8 : 7} style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    Loading excursions...
                  </td>
                </tr>
              )}
              {!excursionsLoading && filtered.length === 0 && (
                <tr className={styles.row}>
                  <td colSpan={canResolve ? 8 : 7} style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    No excursions found.
                  </td>
                </tr>
              )}
              {!excursionsLoading && filtered.map(e => (
                <tr key={e.id} className={styles.row}>
                  <td><span className={styles.mono}>{e.id}</span></td>
                  <td><span className={styles.mono}>{e.shipmentId}</span></td>
                  <td><span className={styles.mono}>{e.sensorId}</span></td>
                  <td><span className={styles.mono}>{new Date(e.breachTime).toLocaleString()}</span></td>
                  <td>
                    <span style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {e.recordedTemp}°C
                    </span>
                  </td>
                  <td><StatusBadge status={e.status} /></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.acknowledgedBy || '—'}</td>
                  {canResolve && (
                    <td>
                      {e.status === 'OPEN'
                        ? <Button variant="danger" onClick={() => { setSelected(e); setNote(''); }} style={{ fontSize: 11, padding: '4px 10px' }}>Resolve</Button>
                        : <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{e.resolutionNote?.slice(0, 30)}…</span>
                      }
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && canResolve && (
        <div className={modalStyles.overlay}>
          <div className={modalStyles.modal}>
            <div className={modalStyles.header}>
              <div className={modalStyles.title}>Resolve Excursion</div>
              <div className={modalStyles.excId}>{selected.id} · {selected.shipmentId}</div>
            </div>
            <div className={modalStyles.body}>
              <div className={modalStyles.infoGrid}>
                <div><span className={modalStyles.infoLabel}>Breach Temp</span><span className={modalStyles.infoVal} style={{ color: 'var(--accent-red)' }}>{selected.recordedTemp}°C</span></div>
                <div><span className={modalStyles.infoLabel}>Sensor</span><span className={modalStyles.infoVal}>{selected.sensorId}</span></div>
                <div><span className={modalStyles.infoLabel}>Breach Time</span><span className={modalStyles.infoVal}>{new Date(selected.breachTime).toLocaleString()}</span></div>
              </div>
              <label className={modalStyles.label}>Resolution Note</label>
              <textarea
                className={modalStyles.textarea}
                rows={4}
                placeholder="Describe the corrective action taken..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            <div className={modalStyles.footer}>
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleResolve} disabled={!note.trim()}>Mark as Closed</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
