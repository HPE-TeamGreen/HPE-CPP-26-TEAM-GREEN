import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { useApp } from '../../context/AppContext';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge from '../../components/layout/StatusBadge';
import Button from '../../components/layout/Button';
import { sensorTelemetry } from '../../data/mockData';
import { getLatestReadings } from '../telemetryService';
import styles from './Dashboard.module.css';

const getTempStatus = (s) => {
  if (s.currentTemp > s.maxTemp || s.currentTemp < s.minTemp) return 'breach';
  if (s.currentTemp > s.maxTemp - 1) return 'warn';
  return 'ok';
};

const tempColor = { ok: 'var(--accent-green)', warn: 'var(--accent-yellow)', breach: 'var(--accent-red)' };

const ONLINE_SENSORS = ['S-03', 'S-05', 'S-07', 'S-09', 'S-11', 'S-14'];

export default function Dashboard() {
  const { shipments, alerts, excursions, openCount, unacknowledgedAlerts, acknowledgeAlert, can } = useApp();
  const navigate = useNavigate();
  const [selectedSensor, setSelectedSensor] = useState('S-14');
  const [liveTelemetry, setLiveTelemetry] = useState(null);

  // Attempt to fetch live telemetry, fall back to mock
  useEffect(() => {
    let cancelled = false;
    const fetchTelemetry = async () => {
      try {
        const readings = await getLatestReadings(selectedSensor, 10);
        if (!cancelled && Array.isArray(readings) && readings.length > 0) {
          const mockFallback = sensorTelemetry[selectedSensor];
          setLiveTelemetry({
            shipmentId: readings[0].shipment_id || mockFallback?.shipmentId || '',
            minTemp: mockFallback?.minTemp ?? 2,
            maxTemp: mockFallback?.maxTemp ?? 8,
            data: readings.map(r => ({
              time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              temp: r.temperature,
            })),
          });
        }
      } catch {
        if (!cancelled) setLiveTelemetry(null); // fall back to mock
      }
    };
    fetchTelemetry();
    const intervalId = setInterval(fetchTelemetry, 15000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [selectedSensor]);

  const activeShipments = shipments.filter(s => s.status === 'IN_TRANSIT');
  const onlineSensors = 6;
  const complianceRate = 94;

  const telemetry = liveTelemetry || sensorTelemetry[selectedSensor];
  const allTemps = telemetry.data.map(d => d.temp);
  const tempMin = Math.min(...allTemps, telemetry.minTemp);
  const tempMax = Math.max(...allTemps, telemetry.maxTemp);
  const yDomain = [
    parseFloat((tempMin - Math.abs(tempMin * 0.05)).toFixed(1)),
    parseFloat((tempMax + Math.abs(tempMax * 0.05)).toFixed(1)),
  ];

  const isBreaching = telemetry.data.some(d => d.temp > telemetry.maxTemp || d.temp < telemetry.minTemp);
  const lineColor = isBreaching ? 'var(--accent-red)' : 'var(--accent-blue)';

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time TempSafe monitoring"
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/reports')}>Export PDF</Button>
            {can('createShipment') && (
              <Button variant="primary" onClick={() => navigate('/shipments/new')}>+ New Shipment</Button>
            )}
          </>
        }
      />

      <div className={styles.content}>
        <div className={styles.metrics}>
          {[
            { label: 'Active Shipments', value: activeShipments.length, sub: '6 in transit today', color: 'var(--text-primary)' },
            { label: 'Sensors Online', value: onlineSensors, sub: '2 offline', color: 'var(--accent-green)' },
            { label: 'Open Excursions', value: openCount, sub: 'Awaiting QA review', color: 'var(--accent-red)' },
            { label: 'Compliance Rate', value: `${complianceRate}%`, sub: 'Last 30 days', color: 'var(--accent-blue)' },
          ].map(m => (
            <div key={m.label} className={styles.metricCard}>
              <div className={styles.metricLabel}>{m.label}</div>
              <div className={styles.metricValue} style={{ color: m.color }}>{m.value}</div>
              <div className={styles.metricSub}>{m.sub}</div>
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Active Shipments</span>
              <span className={styles.cardLink} onClick={() => navigate('/shipments')}>View all →</span>
            </div>
            {activeShipments.map(s => {
              const status = getTempStatus(s);
              return (
                <div key={s.id} className={styles.shipRow} onClick={() => navigate('/shipments')}>
                  <div className={styles.shipDot} style={{ background: tempColor[status] + '22' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: tempColor[status] }} />
                  </div>
                  <div className={styles.shipInfo}>
                    <div className={styles.shipId}>{s.displayId}</div>
                    <div className={styles.shipRoute}>{s.origin} → {s.destination} · {s.product}</div>
                  </div>
                  <div className={styles.shipTemp}>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: tempColor[status] }}>
                      {s.currentTemp}°C
                    </div>
                    <div className={styles.shipRange}>{s.minTemp}–{s.maxTemp}°C</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Recent Alerts</span>
              {unacknowledgedAlerts > 0 && (
                <span className={styles.alertCount}>{unacknowledgedAlerts} unread</span>
              )}
            </div>
            {alerts.slice(0, 4).map(a => (
              <div key={a.id} className={styles.alertRow}>
                <div className={styles.alertDot} style={{
                  background: a.type === 'CRITICAL' ? 'var(--accent-red)' :
                    a.type === 'WARNING' ? 'var(--accent-yellow)' : 'var(--accent-blue)',
                  opacity: a.acknowledged ? 0.4 : 1
                }} />
                <div className={styles.alertBody}>
                  <div className={styles.alertMsg} style={{ opacity: a.acknowledged ? 0.6 : 1 }}>{a.message}</div>
                  <div className={styles.alertMeta}>{a.time} · {a.shipmentId}</div>
                  {!a.acknowledged && (
                    <span className={styles.ackBtn} onClick={() => acknowledgeAlert(a.id)}>Acknowledge</span>
                  )}
                </div>
              </div>
            ))}
            <div className={styles.cardLink} style={{ marginTop: 8 }} onClick={() => navigate('/alerts')}>View all alerts →</div>
          </div>

          {/* TEMP TREND CARD — sensor switcher */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.cardTitle}>Temp Trend</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                  {telemetry.shipmentId}
                </span>
              </div>
              <select
                value={selectedSensor}
                onChange={e => setSelectedSensor(e.target.value)}
                style={{
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {ONLINE_SENSORS.map(sid => (
                  <option key={sid} value={sid}>{sid}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Range: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {telemetry.minTemp}°C – {telemetry.maxTemp}°C
              </span></span>
              {isBreaching && (
                <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>⚠ Breach detected</span>
              )}
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={telemetry.data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={yDomain} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                  formatter={(v) => [`${v}°C`, 'Temperature']}
                />
                <ReferenceLine y={telemetry.maxTemp} stroke="var(--accent-red)" strokeDasharray="4 2"
                  label={{ value: 'max', position: 'right', fontSize: 10, fill: 'var(--accent-red)' }} />
                <ReferenceLine y={telemetry.minTemp} stroke="var(--accent-blue)" strokeDasharray="4 2"
                  label={{ value: 'min', position: 'right', fontSize: 10, fill: 'var(--accent-blue)' }} />
                <Line type="monotone" dataKey="temp" stroke={lineColor} strokeWidth={2}
                  dot={{ r: 3, fill: lineColor }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Open Excursions</span>
              <span className={styles.cardLink} onClick={() => navigate('/excursions')}>View all →</span>
            </div>
            {excursions.map(e => (
              <div key={e.id} className={styles.excRow}>
                <StatusBadge status={e.status} />
                <div className={styles.excInfo}>
                  <div className={styles.excId}>{e.id} · {e.shipmentId}</div>
                  <div className={styles.excDetail}>
                    {e.recordedTemp}°C · {e.sensorId} · {new Date(e.breachTime).toLocaleTimeString()}
                  </div>
                  {e.status === 'OPEN' && (
                    <span className={styles.cardLink} onClick={() => navigate('/excursions')}>Add resolution note →</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}