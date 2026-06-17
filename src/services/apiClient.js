/**
 * apiClient.js
 *
 * Two backends actually exist and are deployed:
 *   shipment-1.py                  -> SHIPMENT_API_URL   (default :8000)
 *   reporting_service_reference.py -> REPORTING_API_URL  (default :8002)
 *
 * alert.py and telemetry.py are Kafka consumers ONLY — they expose no HTTP
 * endpoints. All alert/excursion/telemetry data that reaches the frontend
 * comes through reporting_service_reference.py's /reports/* endpoints,
 * which already read the `alerts` and `telemetry_readings` tables those
 * two consumers write to.
 *
 * .env (Vite):
 *   VITE_SHIPMENT_API_URL=http://localhost:8000
 *   VITE_REPORTING_API_URL=http://localhost:8002
 */

const SHIPMENT_URL  = import.meta.env.VITE_SHIPMENT_API_URL  || 'http://localhost:8000';
const REPORTING_URL = import.meta.env.VITE_REPORTING_API_URL || 'http://localhost:8002';

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Used by shipmentService.js — the only frontend service whose paths match
 * an existing backend 1:1 (shipment-1.py).
 */
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${SHIPMENT_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return handleResponse(res);
}

/**
 * Used by reportingService.js, and now also by alertService.js,
 * excursionService.js, telemetryService.js (remapped — see those files).
 */
export async function reportingFetch(path, options = {}) {
  const res = await fetch(`${REPORTING_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return handleResponse(res);
}