import { apiFetch } from './apiClient';

export function listShipments(status) {
  const query = status ? `?status_filter=${encodeURIComponent(status)}` : '';
  return apiFetch(`/shipments${query}`);
}

export function getShipment(shipmentId) {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentId)}`);
}

export function createShipment(payload) {
  return apiFetch('/shipments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateShipmentStatus(shipmentId, newStatus) {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ new_status: newStatus }),
  });
}

export function listSensorsForShipment(shipmentId) {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentId)}/sensors`);
}

export function registerSensor(shipmentId, payload) {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentId)}/sensors`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
