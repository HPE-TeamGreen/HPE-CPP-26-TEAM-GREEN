import { apiFetch } from './apiClient';

/**
 * Fetch all excursions, optionally filtered by status.
 */
export async function listExcursions(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/excursions${query}`);
}

/**
 * Resolve an excursion by providing a resolution note.
 */
export async function resolveExcursion(excursionId, note) {
  return apiFetch(`/excursions/${encodeURIComponent(excursionId)}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ resolution_note: note }),
  });
}
