import { shipments as seedShipments, sensors as seedSensors } from '../data/mockData';

const DEFAULT_LATENCY_MS = 450;
const MIN_LATENCY_MS = 200;
const MAX_LATENCY_MS = 900;

const CITY_COORDS = {
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
};

let shipments = seedShipments.map((s) => ({
  shipment_id: s.id,
  origin: s.origin,
  destination: s.destination,
  status: s.status,
  min_temp_limit: s.minTemp,
  max_temp_limit: s.maxTemp,
  created_at: new Date().toISOString(),
  product: s.product,
  sensor_id: s.sensorId,
  current_temp: s.currentTemp,
  lat: s.lat,
  lng: s.lng,
}));

let sensors = seedSensors.map((s) => ({
  sensor_id: s.id,
  shipment_id: s.shipmentId,
  calibration_date: s.calibrationDate ? new Date(s.calibrationDate).toISOString() : null,
  registered_at: new Date().toISOString(),
}));

const randomId = () => `SHP-${Math.floor(1000 + Math.random() * 9000)}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withLatency = async (value, latencyMs = DEFAULT_LATENCY_MS) => {
  const jitter = Math.floor(Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS + 1)) + MIN_LATENCY_MS;
  const wait = Number.isFinite(latencyMs) ? latencyMs : jitter;
  await delay(wait);
  return value;
};

const parseQuery = (path) => {
  const [pathname, queryString] = path.split('?');
  const params = new URLSearchParams(queryString || '');
  return { pathname, params };
};

const buildError = (status, detail) => {
  const error = new Error(detail || `Request failed (${status})`);
  error.status = status;
  error.data = { detail };
  throw error;
};

export async function mockApiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const { pathname, params } = parseQuery(path);
  const body = options.body ? JSON.parse(options.body) : null;

  if (pathname === '/shipments' && method === 'GET') {
    const statusFilter = params.get('status_filter');
    const data = statusFilter
      ? shipments.filter((s) => s.status === statusFilter)
      : shipments;
    return withLatency(data);
  }

  if (pathname === '/shipments' && method === 'POST') {
    if (!body?.origin || !body?.destination || body.min_temp_limit == null || body.max_temp_limit == null) {
      return withLatency(buildError(400, 'Missing required fields'));
    }
    if (Number(body.max_temp_limit) <= Number(body.min_temp_limit)) {
      return withLatency(buildError(400, 'max_temp_limit must be greater than min_temp_limit'));
    }

    const minTemp = Number(body.min_temp_limit);
    const maxTemp = Number(body.max_temp_limit);
    const avgTemp = Number.isFinite(minTemp) && Number.isFinite(maxTemp)
      ? Number(((minTemp + maxTemp) / 2).toFixed(1))
      : null;

    const originCoords = CITY_COORDS[body.origin] || null;
    const destinationCoords = CITY_COORDS[body.destination] || null;
    const coords = originCoords || destinationCoords;

    const newShipment = {
      shipment_id: randomId(),
      origin: body.origin,
      destination: body.destination,
      status: 'IN_TRANSIT',
      min_temp_limit: minTemp,
      max_temp_limit: maxTemp,
      created_at: new Date().toISOString(),
      product: body.product || 'Unknown',
      sensor_id: body.sensor_id || 'UNASSIGNED',
      current_temp: avgTemp,
      lat: coords ? coords.lat : null,
      lng: coords ? coords.lng : null,
    };

    shipments = [newShipment, ...shipments];

    if (body.sensor_id) {
      sensors = sensors.map((s) =>
        s.sensor_id === body.sensor_id
          ? { ...s, shipment_id: newShipment.shipment_id }
          : s
      );
    }

    return withLatency(newShipment);
  }

  const shipmentIdMatch = pathname.match(/^\/shipments\/([^/]+)$/);
  if (shipmentIdMatch && method === 'GET') {
    const shipmentId = decodeURIComponent(shipmentIdMatch[1]);
    const shipment = shipments.find((s) => s.shipment_id === shipmentId);
    if (!shipment) {
      return withLatency(buildError(404, `Shipment ${shipmentId} not found`));
    }
    return withLatency(shipment);
  }

  const statusMatch = pathname.match(/^\/shipments\/([^/]+)\/status$/);
  if (statusMatch && method === 'PATCH') {
    const shipmentId = decodeURIComponent(statusMatch[1]);
    const shipment = shipments.find((s) => s.shipment_id === shipmentId);
    if (!shipment) {
      return withLatency(buildError(404, `Shipment ${shipmentId} not found`));
    }
    if (!body?.new_status) {
      return withLatency(buildError(400, 'new_status is required'));
    }
    shipment.status = body.new_status;
    return withLatency({ ...shipment });
  }

  const sensorsMatch = pathname.match(/^\/shipments\/([^/]+)\/sensors$/);
  if (sensorsMatch && method === 'GET') {
    const shipmentId = decodeURIComponent(sensorsMatch[1]);
    const data = sensors.filter((s) => s.shipment_id === shipmentId);
    return withLatency(data);
  }

  if (sensorsMatch && method === 'POST') {
    const shipmentId = decodeURIComponent(sensorsMatch[1]);
    const shipment = shipments.find((s) => s.shipment_id === shipmentId);
    if (!shipment) {
      return withLatency(buildError(404, `Shipment ${shipmentId} not found`));
    }
    if (!body?.sensor_id) {
      return withLatency(buildError(400, 'sensor_id is required'));
    }

    const existing = sensors.find((s) => s.sensor_id === body.sensor_id);
    if (existing) {
      return withLatency(buildError(409, `Sensor ${body.sensor_id} is already registered`));
    }

    const calibrationDate = body.calibration_date ? new Date(body.calibration_date).toISOString() : null;
    const newSensor = {
      sensor_id: body.sensor_id,
      shipment_id: shipmentId,
      calibration_date: calibrationDate,
      registered_at: new Date().toISOString(),
    };

    sensors = [newSensor, ...sensors];
    shipment.sensor_id = body.sensor_id;

    return withLatency(newSensor);
  }

  return withLatency(buildError(404, 'Mock route not implemented'));
}

export function resetMockData() {
  shipments = seedShipments.map((s) => ({
    shipment_id: s.id,
    origin: s.origin,
    destination: s.destination,
    status: s.status,
    min_temp_limit: s.minTemp,
    max_temp_limit: s.maxTemp,
    created_at: new Date().toISOString(),
    product: s.product,
    sensor_id: s.sensorId,
    current_temp: s.currentTemp,
    lat: s.lat,
    lng: s.lng,
  }));

  sensors = seedSensors.map((s) => ({
    sensor_id: s.id,
    shipment_id: s.shipmentId,
    calibration_date: s.calibrationDate ? new Date(s.calibrationDate).toISOString() : null,
    registered_at: new Date().toISOString(),
  }));
}
