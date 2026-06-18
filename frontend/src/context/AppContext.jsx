import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { users } from '../data/mockData';
import { hasPermission } from '../data/roles';
import { createShipment as createShipmentApi, listShipments, registerSensor as registerSensorApi } from '../services/shipmentService';
import { listAlerts as listAlertsApi, acknowledgeAlert as acknowledgeAlertApi, acknowledgeAllAlerts as acknowledgeAllAlertsApi } from '../services/alertService';
import { listExcursions as listExcursionsApi, resolveExcursion as resolveExcursionApi } from '../services/excursionService';
import { getLatestReadings } from '../services/telemetryService';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [shipments, setShipments] = useState([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [shipmentsError, setShipmentsError] = useState('');
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [excursions, setExcursions] = useState([]);
  const [excursionsLoading, setExcursionsLoading] = useState(false);
  const [user, setUser] = useState(null); // null = not logged in
  const [isLiveAlerts, setIsLiveAlerts] = useState(false);
  const [isLiveExcursions, setIsLiveExcursions] = useState(false);

  // const mockById = useMemo(() => {
  //   const map = new Map();
  //   mockShipments.forEach(s => map.set(s.id, s));
  //   return map;
  // }, []);

  // Keep a ref to latest telemetry so it survives across poll cycles
  const latestTelemetryRef = React.useRef({});

  const mapShipmentFromApi = (apiShipment) => {
    // const fallback = mockById.get(apiShipment.shipment_id);
    const rawMin = apiShipment.min_temp_limit;
    const rawMax = apiShipment.max_temp_limit;
    const minTemp = Number.isFinite(rawMin) ? rawMin : 0;
    const maxTemp = Number.isFinite(rawMax) ? rawMax : 0;
    const defaultTemp = Number.isFinite(minTemp) && Number.isFinite(maxTemp)
      ? Number(((minTemp + maxTemp) / 2).toFixed(1))
      : 0;
    const sensorId = apiShipment.sensor_id || 'UNASSIGNED';

    // Use cached telemetry from last successful fetch if available
    const cached = latestTelemetryRef.current[sensorId];

    return {
      id: apiShipment.shipment_id,
      origin: apiShipment.origin,
      destination: apiShipment.destination,
      product: apiShipment.product || 'Unknown',
      status: apiShipment.status,
      sensorId,
      minTemp,
      maxTemp,
      currentTemp: cached?.temperature ?? defaultTemp,
      lat: cached?.latitude ?? null,
      lng: cached?.longitude ?? null,
      createdAt: apiShipment.created_at,
    };
  };

  const loadShipments = async () => {
    try {
      setShipmentsLoading(true);
      setShipmentsError('');
      const data = await listShipments();
      
      if (!Array.isArray(data)) {
        setShipments([]);
        return;
      }

      // Fetch latest telemetry for all shipments with sensors (not just IN_TRANSIT)
      // so delivered shipments also show their actual last recorded temperature
      const withSensors = data.filter(s => s.sensor_id);
      await Promise.all(withSensors.map(async (s) => {
        try {
          const readings = await getLatestReadings(s.sensor_id, 1);
          if (readings && readings.length > 0) {
            latestTelemetryRef.current[s.sensor_id] = readings[0];
          }
        } catch (e) {
          // Keep previous cached value on failure — don't clear it
        }
      }));

      // Now map — mapShipmentFromApi will use the cached telemetry
      const normalized = data.map(mapShipmentFromApi);
      setShipments(normalized);
    } catch (err) {
      // Only fall back to mock if we have no shipments at all
      setShipments(prev => prev.length > 0 ? prev : []);
      setShipmentsError(err?.message || 'Unable to load shipments');
    } finally {
      setShipmentsLoading(false);
    }
  };

  const createShipment = async (payload) => {
    const response = await createShipmentApi(payload);
    const mapped = mapShipmentFromApi(response);
    setShipments(prev => [mapped, ...prev]);
    return mapped;
  };

  const mapSensorFromApi = (apiSensor) => ({
    id: apiSensor.sensor_id,
    shipmentId: apiSensor.shipment_id,
    calibrationDate: apiSensor.calibration_date ? apiSensor.calibration_date.slice(0, 10) : '—',
    status: apiSensor.shipment_id ? 'ONLINE' : 'OFFLINE',
  });

  const createSensor = async (shipmentId, payload) => {
    const response = await registerSensorApi(shipmentId, payload);
    const mapped = mapSensorFromApi(response);
    setSensors(prev => [mapped, ...prev]);
    setShipments(prev => prev.map(s => (
      s.id === shipmentId
        ? { ...s, sensorId: response.sensor_id }
        : s
    )));
    return mapped;
  };

  // --- Alert mapping ---
  const mapAlertFromApi = (apiAlert) => ({
    id: apiAlert.alert_id,
    shipmentId: apiAlert.shipment_id,
    sensorId: apiAlert.sensor_id,
    type: apiAlert.temperature > apiAlert.max_temp_limit || apiAlert.temperature < apiAlert.min_temp_limit ? 'CRITICAL' : 'WARNING',
    message: `Temperature ${apiAlert.temperature > apiAlert.max_temp_limit ? 'breach' : 'warning'} — recorded ${apiAlert.temperature}°C (limits: ${apiAlert.min_temp_limit}–${apiAlert.max_temp_limit}°C)`,
    time: new Date(apiAlert.recorded_at).toLocaleString(),
    acknowledged: apiAlert.acknowledged,
    rawId: apiAlert.alert_id,
  });

  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      const data = await listAlertsApi();
      if (Array.isArray(data)) {
        setAlerts(data.map(mapAlertFromApi));
        setIsLiveAlerts(true);
      } else {
        setAlerts([]);
        setIsLiveAlerts(false);
      }
    } catch (err) {
      setAlerts([]);
      setIsLiveAlerts(false);
    } finally {
      setAlertsLoading(false);
    }
  };

  // --- Excursion mapping ---
  const mapExcursionFromApi = (apiExcursion) => ({
    id: apiExcursion.excursion_id,
    shipmentId: apiExcursion.shipment_id,
    sensorId: apiExcursion.sensor_id,
    breachTime: apiExcursion.breach_time,
    recordedTemp: apiExcursion.recorded_temp,
    status: apiExcursion.status,
    acknowledgedBy: apiExcursion.acknowledged_by,
    resolutionNote: apiExcursion.resolution_note,
  });

  const loadExcursions = async () => {
    try {
      setExcursionsLoading(true);
      const data = await listExcursionsApi();
      if (Array.isArray(data)) {
        setExcursions(data.map(mapExcursionFromApi));
        setIsLiveExcursions(true);
      } else {
        setExcursions([]);
        setIsLiveExcursions(false);
      }
    } catch (err) {
      setExcursions([]);
      setIsLiveExcursions(false);
    } finally {
      setExcursionsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      if (cancelled) return;
      await loadShipments();
      if (!cancelled) await loadAlerts();
      if (!cancelled) await loadExcursions();
    };
    
    fetchAll();
    const interval = setInterval(fetchAll, 5000); // Poll every 5 seconds for real-time feel
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const login = (email, password) => {
    // Find user by email (mock auth — any password accepted)
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { success: false, error: 'No account found for that email.' };
    setUser(found);
    return { success: true };
  };

  const logout = () => setUser(null);

  const can = (action) => user ? hasPermission(user.role, action) : false;

  const acknowledgeAlert = async (id) => {
    if (!can('acknowledgeAlert')) return;
    // Optimistic update
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    // Try server-side acknowledge
    try {
      await acknowledgeAlertApi(id);
    } catch (err) {
      // Silent fail — optimistic update stays
    }
  };

  const acknowledgeAllAlertsAction = async () => {
    if (!can('acknowledgeAlert')) return;
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
    try {
      await acknowledgeAllAlertsApi();
    } catch (err) {
      // Silent fail
    }
  };

  const resolveExcursion = async (id, note) => {
    if (!can('resolveExcursion')) return;
    // Optimistic update
    setExcursions(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'CLOSED', acknowledgedBy: user.name, resolutionNote: note } : e
    ));
    // Try server-side resolve
    try {
      await resolveExcursionApi(id, note);
    } catch (err) {
      // Silent fail — optimistic update stays
    }
  };

  const openCount = excursions.filter(e => e.status === 'OPEN').length;
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;

  return (
    <AppContext.Provider value={{
      user, login, logout, can,
      shipments, shipmentsLoading, shipmentsError, sensors, alerts, excursions,
      alertsLoading, excursionsLoading,
      isLiveAlerts, isLiveExcursions,
      loadShipments, loadAlerts, loadExcursions,
      createShipment, createSensor,
      acknowledgeAlert, acknowledgeAllAlerts: acknowledgeAllAlertsAction,
      resolveExcursion,
      openCount, unacknowledgedAlerts,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
