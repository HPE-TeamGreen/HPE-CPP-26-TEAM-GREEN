import { apiFetch } from './apiClient';

/**
 * Fetch latest telemetry readings for a sensor.
 * Returns an array of { time, temp, lat, lng } objects.
 */
export async function getLatestReadings(sensorId, limit = 10) {
  const query = new URLSearchParams({ sensor_id: sensorId, limit: String(limit) });
  return apiFetch(`/telemetry/latest?${query}`);
}

/**
 * Fetch temperature history for a sensor/shipment within a time window.
 */
export async function getTemperatureHistory({ sensorId, shipmentId, startTime, endTime } = {}) {
  const params = new URLSearchParams();
  if (sensorId) params.set('sensor_id', sensorId);
  if (shipmentId) params.set('shipment_id', shipmentId);
  if (startTime) params.set('start_time', startTime);
  if (endTime) params.set('end_time', endTime);
  return apiFetch(`/telemetry/history?${params}`);
}
