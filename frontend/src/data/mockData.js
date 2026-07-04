export const currentUser = {
  id: 'u-001',
  name: 'Sarah Lin',
  email: 'sarah.lin@coldchain.io',
  role: 'QA_OFFICER',
};

export const shipments = [
  { id: 'SHP-2041', origin: 'Mumbai', destination: 'Delhi', product: 'Vaccines', status: 'IN_TRANSIT', sensorId: 'S-14', minTemp: 2, maxTemp: 8, currentTemp: 9.4, lat: 28.6, lng: 77.2 },
  { id: 'SHP-2038', origin: 'Bangalore', destination: 'Chennai', product: 'Insulin', status: 'IN_TRANSIT', sensorId: 'S-09', minTemp: 2, maxTemp: 8, currentTemp: 5.1, lat: 13.08, lng: 80.27 },
  { id: 'SHP-2035', origin: 'Hyderabad', destination: 'Pune', product: 'Blood', status: 'IN_TRANSIT', sensorId: 'S-07', minTemp: 1, maxTemp: 6, currentTemp: 7.8, lat: 18.52, lng: 73.85 },
  { id: 'SHP-2030', origin: 'Delhi', destination: 'Kolkata', product: 'Reagents', status: 'IN_TRANSIT', sensorId: 'S-11', minTemp: 2, maxTemp: 8, currentTemp: 3.2, lat: 22.57, lng: 88.36 },
  { id: 'SHP-2025', origin: 'Chennai', destination: 'Bangalore', product: 'Plasma', status: 'DELIVERED', sensorId: 'S-03', minTemp: -20, maxTemp: -15, currentTemp: -17.5, lat: 12.97, lng: 77.59 },
  { id: 'SHP-2020', origin: 'Kolkata', destination: 'Mumbai', product: 'Eye Drops', status: 'DELIVERED', sensorId: 'S-05', minTemp: 8, maxTemp: 25, currentTemp: 18.2, lat: 19.07, lng: 72.87 },
];

export const sensors = [
  { id: 'S-03', shipmentId: 'SHP-2025', calibrationDate: '2024-12-01', status: 'ONLINE' },
  { id: 'S-05', shipmentId: 'SHP-2020', calibrationDate: '2024-11-15', status: 'ONLINE' },
  { id: 'S-07', shipmentId: 'SHP-2035', calibrationDate: '2025-01-10', status: 'ONLINE' },
  { id: 'S-09', shipmentId: 'SHP-2038', calibrationDate: '2025-02-01', status: 'ONLINE' },
  { id: 'S-11', shipmentId: 'SHP-2030', calibrationDate: '2025-01-20', status: 'ONLINE' },
  { id: 'S-14', shipmentId: 'SHP-2041', calibrationDate: '2025-03-01', status: 'ONLINE' },
  { id: 'S-16', shipmentId: null, calibrationDate: '2025-03-10', status: 'OFFLINE' },
  { id: 'S-18', shipmentId: null, calibrationDate: '2025-02-20', status: 'OFFLINE' },
];

export const alerts = [
  { id: 'ALT-301', shipmentId: 'SHP-2041', sensorId: 'S-14', type: 'CRITICAL', message: 'Temperature breach — recorded 9.4°C (max 8°C)', time: '2 min ago', acknowledged: false },
  { id: 'ALT-300', shipmentId: 'SHP-2035', sensorId: 'S-07', type: 'WARNING', message: 'Approaching upper limit — 7.8°C of 6°C max', time: '18 min ago', acknowledged: false },
  { id: 'ALT-299', shipmentId: 'SHP-2028', sensorId: 'S-16', type: 'CRITICAL', message: 'Sensor S-16 offline — no telemetry for 45 min', time: '47 min ago', acknowledged: false },
  { id: 'ALT-298', shipmentId: 'SHP-2035', sensorId: 'S-07', type: 'WARNING', message: 'Cumulative excursion time exceeded 30 min', time: '1 hr ago', acknowledged: true },
  { id: 'ALT-297', shipmentId: 'SHP-2038', sensorId: 'S-09', type: 'INFO', message: 'Shipment SHP-2038 arrived at Chennai hub', time: '2 hr ago', acknowledged: true },
];

export const excursions = [
  { id: 'EXC-0091', shipmentId: 'SHP-2041', sensorId: 'S-14', breachTime: '2025-04-09T14:02:00', recordedTemp: 9.4, status: 'OPEN', acknowledgedBy: null, resolutionNote: null },
  { id: 'EXC-0089', shipmentId: 'SHP-2035', sensorId: 'S-07', breachTime: '2025-04-09T13:20:00', recordedTemp: 7.8, status: 'OPEN', acknowledgedBy: null, resolutionNote: null },
  { id: 'EXC-0085', shipmentId: 'SHP-2028', sensorId: 'S-03', breachTime: '2025-04-09T10:15:00', recordedTemp: 8.9, status: 'CLOSED', acknowledgedBy: 'Sarah Lin', resolutionNote: 'Unit recalibrated and rerouted through cold facility.' },
  { id: 'EXC-0081', shipmentId: 'SHP-2020', sensorId: 'S-05', breachTime: '2025-04-08T09:00:00', recordedTemp: 27.1, status: 'CLOSED', acknowledgedBy: 'Raj Mehta', resolutionNote: 'Shipment inspected, product deemed safe by QA.' },
];

export const telemetryHistory = [
  { time: '13:30', temp: 6.1 }, { time: '13:40', temp: 6.5 },
  { time: '13:50', temp: 6.9 }, { time: '14:00', temp: 7.4 },
  { time: '14:10', temp: 7.7 }, { time: '14:20', temp: 8.0 },
  { time: '14:30', temp: 8.7 }, { time: '14:40', temp: 9.0 },
  { time: '14:50', temp: 9.4 }, { time: '15:00', temp: 9.1 },
];

export const users = [
  { id: 'u-001', name: 'Sarah Lin', role: 'QA_OFFICER', email: 'sarah.lin@coldchain.io' },
  { id: 'u-002', name: 'Raj Mehta', role: 'MANAGER', email: 'raj.mehta@coldchain.io' },
  { id: 'u-003', name: 'Priya Nair', role: 'COMPLIANCE_OFFICER', email: 'priya.nair@coldchain.io' },
  { id: 'u-004', name: 'Admin User', role: 'ADMIN', email: 'admin@coldchain.io' },
];

// Per-sensor telemetry data for dashboard temp trend selector
export const sensorTelemetry = {
  'S-03': { shipmentId: 'SHP-2025', minTemp: -20, maxTemp: -15, data: [
    { time: '13:30', temp: -17.8 }, { time: '13:40', temp: -17.5 }, { time: '13:50', temp: -17.2 },
    { time: '14:00', temp: -17.5 }, { time: '14:10', temp: -17.9 }, { time: '14:20', temp: -18.1 },
    { time: '14:30', temp: -17.6 }, { time: '14:40', temp: -17.4 }, { time: '14:50', temp: -17.5 }, { time: '15:00', temp: -17.3 },
  ]},
  'S-05': { shipmentId: 'SHP-2020', minTemp: 8, maxTemp: 25, data: [
    { time: '13:30', temp: 17.1 }, { time: '13:40', temp: 17.5 }, { time: '13:50', temp: 18.0 },
    { time: '14:00', temp: 18.2 }, { time: '14:10', temp: 18.5 }, { time: '14:20', temp: 18.9 },
    { time: '14:30', temp: 18.6 }, { time: '14:40', temp: 18.3 }, { time: '14:50', temp: 18.2 }, { time: '15:00', temp: 18.0 },
  ]},
  'S-07': { shipmentId: 'SHP-2035', minTemp: 1, maxTemp: 6, data: [
    { time: '13:30', temp: 4.2 }, { time: '13:40', temp: 5.0 }, { time: '13:50', temp: 5.8 },
    { time: '14:00', temp: 6.2 }, { time: '14:10', temp: 6.9 }, { time: '14:20', temp: 7.2 },
    { time: '14:30', temp: 7.5 }, { time: '14:40', temp: 7.8 }, { time: '14:50', temp: 7.6 }, { time: '15:00', temp: 7.4 },
  ]},
  'S-09': { shipmentId: 'SHP-2038', minTemp: 2, maxTemp: 8, data: [
    { time: '13:30', temp: 4.8 }, { time: '13:40', temp: 5.0 }, { time: '13:50', temp: 5.1 },
    { time: '14:00', temp: 5.0 }, { time: '14:10', temp: 4.9 }, { time: '14:20', temp: 5.2 },
    { time: '14:30', temp: 5.1 }, { time: '14:40', temp: 5.3 }, { time: '14:50', temp: 5.1 }, { time: '15:00', temp: 5.0 },
  ]},
  'S-11': { shipmentId: 'SHP-2030', minTemp: 2, maxTemp: 8, data: [
    { time: '13:30', temp: 3.0 }, { time: '13:40', temp: 3.1 }, { time: '13:50', temp: 3.2 },
    { time: '14:00', temp: 3.3 }, { time: '14:10', temp: 3.2 }, { time: '14:20', temp: 3.1 },
    { time: '14:30', temp: 3.2 }, { time: '14:40', temp: 3.3 }, { time: '14:50', temp: 3.2 }, { time: '15:00', temp: 3.2 },
  ]},
  'S-14': { shipmentId: 'SHP-2041', minTemp: 2, maxTemp: 8, data: [
    { time: '13:30', temp: 6.1 }, { time: '13:40', temp: 6.5 }, { time: '13:50', temp: 6.9 },
    { time: '14:00', temp: 7.4 }, { time: '14:10', temp: 7.7 }, { time: '14:20', temp: 8.0 },
    { time: '14:30', temp: 8.7 }, { time: '14:40', temp: 9.0 }, { time: '14:50', temp: 9.4 }, { time: '15:00', temp: 9.1 },
  ]},
};
