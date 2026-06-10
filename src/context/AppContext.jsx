import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { shipments as mockShipments, sensors as mockSensors, alerts as initialAlerts, excursions as initialExcursions, users } from '../data/mockData';
import { hasPermission } from '../data/roles';
import { createShipment as createShipmentApi, listShipments, registerSensor as registerSensorApi } from '../services/shipmentService';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [shipments, setShipments] = useState(mockShipments);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [shipmentsError, setShipmentsError] = useState('');
  const [sensors, setSensors] = useState(mockSensors);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [excursions, setExcursions] = useState(initialExcursions);
  const [user, setUser] = useState(null); // null = not logged in

  const mockById = useMemo(() => {
    const map = new Map();
    mockShipments.forEach(s => map.set(s.id, s));
    return map;
  }, []);

  const mapShipmentFromApi = (apiShipment) => {
    const fallback = mockById.get(apiShipment.shipment_id);
    const minTemp = apiShipment.min_temp_limit;
    const maxTemp = apiShipment.max_temp_limit;
    const defaultTemp = Number.isFinite(minTemp) && Number.isFinite(maxTemp)
      ? Number(((minTemp + maxTemp) / 2).toFixed(1))
      : 0;

    return {
      id: apiShipment.shipment_id,
      origin: apiShipment.origin,
      destination: apiShipment.destination,
      product: apiShipment.product || fallback?.product || 'Unknown',
      status: apiShipment.status,
      sensorId: apiShipment.sensor_id || fallback?.sensorId || 'UNASSIGNED',
      minTemp,
      maxTemp,
      currentTemp: apiShipment.current_temp ?? fallback?.currentTemp ?? defaultTemp,
      lat: apiShipment.lat ?? fallback?.lat ?? null,
      lng: apiShipment.lng ?? fallback?.lng ?? null,
      createdAt: apiShipment.created_at,
    };
  };

  const loadShipments = async () => {
    try {
      setShipmentsLoading(true);
      setShipmentsError('');
      const data = await listShipments();
      const normalized = Array.isArray(data) ? data.map(mapShipmentFromApi) : [];
      setShipments(normalized.length > 0 ? normalized : mockShipments);
    } catch (err) {
      setShipments(mockShipments);
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

  useEffect(() => {
    loadShipments();
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

  const acknowledgeAlert = (id) => {
    if (!can('acknowledgeAlert')) return;
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const resolveExcursion = (id, note) => {
    if (!can('resolveExcursion')) return;
    setExcursions(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'CLOSED', acknowledgedBy: user.name, resolutionNote: note } : e
    ));
  };

  const openCount = excursions.filter(e => e.status === 'OPEN').length;
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;

  return (
    <AppContext.Provider value={{
      user, login, logout, can,
      shipments, shipmentsLoading, shipmentsError, sensors, alerts, excursions,
      loadShipments, createShipment, createSensor,
      acknowledgeAlert, resolveExcursion,
      openCount, unacknowledgedAlerts,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
