import { telemetryFetch } from './apiClient';

/**
 * Fetch all alerts, optionally filtered by type or acknowledgment status.
 */
export async function listAlerts({ type, acknowledged } = {}) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (acknowledged !== undefined) params.set('acknowledged', String(acknowledged));
  const query = params.toString();
  return telemetryFetch(`/alerts${query ? `?${query}` : ''}`);
}

/**
 * Acknowledge an alert by ID.
 */
export async function acknowledgeAlert(alertId) {
  return telemetryFetch(`/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: 'PATCH',
  });
}

/**
 * Acknowledge all unacknowledged alerts.
 */
export async function acknowledgeAllAlerts() {
  return telemetryFetch('/alerts/acknowledge-all', {
    method: 'PATCH',
  });
}
