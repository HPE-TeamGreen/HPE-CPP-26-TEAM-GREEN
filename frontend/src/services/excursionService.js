import { telemetryFetch } from './apiClient';

/**
 * Fetch all excursions, optionally filtered by status.
 */
export async function listExcursions(status) {
  const query = status ? `?status_filter=${encodeURIComponent(status)}` : '';
  return telemetryFetch(`/excursions${query}`);
}

/**
 * Resolve an excursion by providing a resolution note.
 */
export async function resolveExcursion(excursionId, note) {
  return telemetryFetch(`/excursions/${encodeURIComponent(excursionId)}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ resolution_note: note }),
  });
}
