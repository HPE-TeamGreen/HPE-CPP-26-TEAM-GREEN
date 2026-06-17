import { reportingFetch } from './apiClient';

/**
 * REMAPPED: alert.py has no HTTP server — it only writes to the `alerts`
 * table via Kafka. The only HTTP route that reads that table is
 * GET /reports/excursions on reporting_service_reference.py (port 8002).
 *
 * This function calls that real endpoint and reshapes its response into
 * the { id, type, message, shipmentId, time, acknowledged } shape the
 * Dashboard and Alerts page expect from listAlerts().
 *
 * Severity mapping: the backend reports MINOR | MAJOR | CRITICAL
 * (reporting_service_reference.py's own deviation-based scale). The UI
 * (Alerts.jsx filter buttons, Dashboard.jsx color logic) expects
 * CRITICAL | WARNING | INFO. We map MINOR→INFO, MAJOR→WARNING,
 * CRITICAL→CRITICAL so the existing filter buttons actually match rows.
 */
const SEVERITY_MAP = { MINOR: 'INFO', MAJOR: 'WARNING', CRITICAL: 'CRITICAL' };

export async function listAlerts({ type, acknowledged } = {}) {
  const report = await reportingFetch('/reports/excursions');

  let alerts = report.data.map(row => ({
    id: row.alert_id,
    type: SEVERITY_MAP[row.severity] ?? row.severity,
    message: `Sensor ${row.sensor_id} recorded ${row.temperature}°C (limit ${row.allowed_range.min}–${row.allowed_range.max}°C)`,
    shipmentId: row.shipment_id,
    sensorId: row.sensor_id,
    time: new Date(row.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    recordedAt: row.recorded_at,
    // NOTE: the backend has no acknowledged column at all. There is nowhere
    // to persist this. We default everything to unacknowledged; see
    // acknowledgeAlert() below for what this means in practice.
    acknowledged: false,
  }));

  if (type) alerts = alerts.filter(a => a.type === type);
  if (acknowledged !== undefined) alerts = alerts.filter(a => a.acknowledged === acknowledged);

  return alerts;
}

/**
 * REMAPPED — there is no PATCH /alerts/:id/acknowledge anywhere in the
 * deployed backend, and the `alerts` table has no acknowledged column.
 * Acknowledging here is LOCAL-ONLY UI state: it will not survive a refresh
 * or be visible to other users/sessions. AppContext.jsx keeps this in
 * React state rather than calling the backend, since there is no real
 * endpoint to call.
 */
export async function acknowledgeAlert(alertId) {
  return Promise.resolve({ id: alertId, acknowledged: true, persisted: false });
}

export async function acknowledgeAllAlerts() {
  return Promise.resolve({ acknowledged: true, persisted: false });
}