import { reportingFetch } from './apiClient';

/**
 * REMAPPED: there is no GET /telemetry/latest endpoint anywhere in the
 * deployed backend. The closest real data source is
 * GET /reports/temperature-history on reporting_service_reference.py
 * (port 8002), which reads telemetry_readings (written by telemetry.py
 * via Kafka), paginated and ordered newest-first.
 *
 * To get the "latest N readings" for one sensor, we request page_size=N
 * sorted DESC (the backend's own order), then reverse to oldest→newest
 * for charting.
 *
 * Returns RAW backend field names (recorded_at, temperature, shipment_id,
 * latitude, longitude) rather than a transformed shape — Dashboard.jsx
 * does its own `new Date(r.recorded_at)` / `r.temperature` / `r.shipment_id`
 * conversion, so transforming here would just feed it undefined fields
 * (this was the cause of "Invalid Date" / blank temps on the Temp Trend
 * chart). AppContext.jsx's hydrateTemps() also calls this — see the
 * `.temp`/`.lat`/`.lng` access there, which now reads `.temperature`/
 * `.latitude`/`.longitude` instead (updated alongside this fix).
 */
export async function getLatestReadings(sensorId, limit = 10) {
  const report = await reportingFetch(
    `/reports/temperature-history?sensor_id=${encodeURIComponent(sensorId)}&page=1&page_size=${limit}`
  );

  return report.data.slice().reverse(); // backend returns DESC; chart wants ascending time
}

/**
 * REMAPPED: same backend endpoint as above, but with a time-window filter
 * instead of a fixed page size. start_time / end_time are passed straight
 * through — reporting_service_reference.py already accepts ISO strings.
 */
export async function getTemperatureHistory({ sensorId, shipmentId, startTime, endTime } = {}) {
  const params = new URLSearchParams();
  if (sensorId) params.set('sensor_id', sensorId);
  if (shipmentId) params.set('shipment_id', shipmentId);
  if (startTime) params.set('start_time', startTime);
  if (endTime) params.set('end_time', endTime);
  params.set('page_size', '500'); // backend max page_size

  const report = await reportingFetch(`/reports/temperature-history?${params}`);

  return report.data
    .slice()
    .reverse()
    .map(row => ({
      time: new Date(row.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temp: row.temperature,
      lat: row.latitude,
      lng: row.longitude,
      sensorId: row.sensor_id,
      shipmentId: row.shipment_id,
      isExcursion: row.is_excursion,
      isBuffered: row.is_buffered,
    }));
}