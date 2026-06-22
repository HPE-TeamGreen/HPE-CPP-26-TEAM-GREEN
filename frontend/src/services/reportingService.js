import { reportingFetch } from './apiClient';

/**
 * Fetch temperature history report.
 */
export async function getTemperatureHistory({ shipmentId, sensorId, startTime, endTime } = {}) {
  const params = new URLSearchParams();
  if (shipmentId) params.set('shipment_id', shipmentId);
  if (sensorId) params.set('sensor_id', sensorId);
  if (startTime) params.set('start_time', startTime);
  if (endTime) params.set('end_time', endTime);
  const query = params.toString();
  return reportingFetch(`/reports/temperature-history${query ? `?${query}` : ''}`);
}

/**
 * Fetch excursion summary report.
 */
export async function getExcursionSummary({ shipmentId, sensorId, page, pageSize } = {}) {
  const params = new URLSearchParams();
  if (shipmentId) params.set('shipment_id', shipmentId);
  if (sensorId) params.set('sensor_id', sensorId);
  if (page) params.set('page', page);
  if (pageSize) params.set('page_size', pageSize);
  const query = params.toString();
  return reportingFetch(`/reports/excursions${query ? `?${query}` : ''}`);
}

/**
 * Fetch compliance report.
 */
export async function getComplianceReport() {
  return reportingFetch(`/reports/compliance-summary`);
}
/**
 * Fetch monthly compliance report.
 */
export async function getMonthlyCompliance() {
  return reportingFetch('/reports/monthly-compliance');
}

/**
 * Fetch product summary report.
 */
export async function getProductSummary() {
  return reportingFetch('/reports/product-summary');
}