import { reportingFetch } from './apiClient';

/**
 * REMAPPED: there is no GET /excursions endpoint anywhere in the deployed
 * backend. The closest real data source is GET /reports/excursions on
 * reporting_service_reference.py (port 8002), which reads the `alerts`
 * table (written by alert.py via Kafka).
 *
 * Reshapes that response into { id, shipmentId, sensorId, recordedTemp,
 * breachTime, status } to match what Dashboard.jsx / excursions UI expects.
 */
export async function listExcursions(status) {
  const report = await reportingFetch('/reports/excursions');

  const excursions = report.data.map(row => ({
    id: row.alert_id,
    shipmentId: row.shipment_id,
    sensorId: row.sensor_id,
    recordedTemp: row.temperature,
    minTemp: row.allowed_range.min,
    maxTemp: row.allowed_range.max,
    deviation: row.deviation,
    severity: row.severity,
    breachTime: row.recorded_at,
    // NOTE: the backend has no resolution/status concept at all — every
    // row in `alerts` represents a breach event with no open/resolved
    // lifecycle. We default everything to OPEN. Filtering by "RESOLVED"
    // will always return an empty list because there is no way to mark
    // something resolved on the backend (see resolveExcursion below).
    status: 'OPEN',
  }));

  return status ? excursions.filter(e => e.status === status) : excursions;
}

/**
 * REMAPPED — there is no PATCH /excursions/:id/resolve endpoint, and the
 * `alerts` table has no resolution_note or status column. This call cannot
 * be persisted anywhere on the backend as currently deployed.
 * AppContext.jsx tracks resolution as LOCAL-ONLY React state so the UI
 * still responds, but a refresh will revert it to OPEN.
 */
export async function resolveExcursion(excursionId, note) {
  return Promise.resolve({ id: excursionId, status: 'RESOLVED', resolutionNote: note, persisted: false });
}