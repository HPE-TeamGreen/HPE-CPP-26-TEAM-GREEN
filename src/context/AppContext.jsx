/**
 * AppContext.jsx
 *
 * Wired to the TWO backends that are actually deployed and HTTP-reachable:
 *   shipment-1.py                  (port 8000) — shipments, sensors
 *   reporting_service_reference.py (port 8002) — excursions, temperature history
 *
 * alert.py and telemetry.py are Kafka consumers with no HTTP surface.
 * Their data reaches the frontend only via reporting_service_reference.py's
 * /reports/* endpoints (see alertService.js, excursionService.js,
 * telemetryService.js — all remapped to call /reports/*).
 *
 * IMPORTANT LIMITATION: the backend has no acknowledged/resolved columns
 * anywhere, so acknowledgeAlert() and resolveExcursion() below are LOCAL
 * React state only. They will not persist across a refresh, a second
 * browser tab, or another user's session, because there is no backend
 * endpoint to write that state to. If/when the backend adds those columns
 * and endpoints, swap these two functions back to real API calls.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  listShipments,
  createShipment as apiCreateShipment,
  registerSensor as apiRegisterSensor,
  listSensorsForShipment,
  updateShipmentStatus as apiUpdateShipmentStatus,
} from '../services/shipmentService';
import { listAlerts, acknowledgeAllAlerts as apiAcknowledgeAllAlerts } from '../services/alertService';
import { listExcursions } from '../services/excursionService';
import { getLatestReadings } from '../services/telemetryService';
import { users } from '../data/mockData';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Matches the roles shown in Login.jsx's demo accounts.
const ROLE_PERMS = {
  ADMIN:               ['createShipment', 'createSensor', 'viewReports', 'exportReport', 'acknowledgeAlert', 'resolveExcursion', 'advanceShipment'],
  MANAGER:             ['createShipment', 'viewReports', 'exportReport', 'advanceShipment'],
  QA_OFFICER:          ['viewReports', 'exportReport', 'resolveExcursion'],
  COMPLIANCE_OFFICER:  ['viewReports', 'exportReport', 'acknowledgeAlert'],
};

// Mirrors shipment-1.py's VALID_TRANSITIONS — CREATED → IN_TRANSIT → DELIVERED,
// forward-only. Used to compute the next status for the "Advance" button
// and to know when a shipment has no further transition (DELIVERED).
const NEXT_STATUS = {
  CREATED: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
  DELIVERED: null,
};

const SESSION_KEY = 'tempsafe_user';

// ─── Normalisers ────────────────────────────────────────────────────────────

function normalizeShipment(raw) {
  return {
    id: raw.shipment_id,
    // Display-only label (e.g. "SHIP-001"), assigned by assignDisplayIds()
    // below based on created_at order. shipment-1.py's real primary key is
    // a raw UUID (raw.shipment_id) — that's what every API call still uses
    // (advanceShipmentStatus, createSensor, etc). displayId is purely
    // cosmetic and never sent to the backend.
    displayId: null,
    origin: raw.origin,
    destination: raw.destination,
    status: raw.status,
    minTemp: raw.min_temp_limit,
    maxTemp: raw.max_temp_limit,
    createdAt: raw.created_at,
    // product / sensorId are not in shipment-1.py's schema — stay '—'/null
    // until that schema is extended on the backend.
    product: raw.product ?? '—',
    sensorId: raw.sensor_id ?? null,
    currentTemp: null,
    lat: null,
    lng: null,
  };
}

/**
 * Assigns stable "SHIP-001", "SHIP-002", ... labels based on createdAt
 * ascending order, so the numbering doesn't reshuffle on every refresh
 * (a shipment created first always stays SHIP-001, even if newer ones
 * are added or the list is refetched in a different order).
 */
function assignDisplayIds(shipmentList) {
  const sorted = [...shipmentList].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
  const labelById = new Map(
    sorted.map((s, i) => [s.id, `SHIP-${String(i + 1).padStart(3, '0')}`])
  );
  return shipmentList.map(s => ({ ...s, displayId: labelById.get(s.id) }));
}

// shipment-1.py's SensorResponse shape: { sensor_id, shipment_id, calibration_date, registered_at }
function normalizeSensor(raw) {
  return {
    id: raw.sensor_id,
    shipmentId: raw.shipment_id,
    // The backend has no online/offline heartbeat concept — every
    // registered sensor is shown as ONLINE since there's nothing to
    // distinguish status with yet.
    status: 'ONLINE',
    calibrationDate: raw.calibration_date
      ? new Date(raw.calibration_date).toLocaleDateString()
      : '—',
  };
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [shipments, setShipments] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [excursions, setExcursions] = useState([]);
  const [excursionsLoading, setExcursionsLoading] = useState(true);
  const [isLiveExcursions, setIsLiveExcursions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;
  const openCount = excursions.filter(e => e.status === 'OPEN').length;

  const can = useCallback(
    (action) => (ROLE_PERMS[user?.role] ?? []).includes(action),
    [user]
  );

  // ── Auth ─────────────────────────────────────────────────────────────────
  // Mock-data login: matches against data/mockData.users by email.
  // Demo accounts in Login.jsx all use password "demo".
  const login = useCallback((email, password) => {
    const match = (users ?? []).find(
      u => u.email.toLowerCase() === String(email).toLowerCase()
    );

    if (!match) {
      return { success: false, error: 'No account found with that email.' };
    }
    if (password !== 'demo') {
      return { success: false, error: 'Incorrect password.' };
    }

    setUser(match);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(match));
    } catch {
      // sessionStorage unavailable — auth still works for this session
    }
    return { success: true, user: match };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }, []);

  // ── For shipments with a sensorId, pull latest reading from
  //    /reports/temperature-history (via telemetryService.getLatestReadings)
  //    to patch currentTemp / lat / lng for the map + metric cards.
  // getLatestReadings now returns RAW backend rows (temperature, latitude,
  // longitude — see telemetryService.js), not a pre-transformed shape.
  const hydrateTemps = useCallback(async (shipmentList) => {
    return Promise.all(
      shipmentList.map(async (s) => {
        if (!s.sensorId) return s;
        try {
          const readings = await getLatestReadings(s.sensorId, 1);
          const latest = readings[readings.length - 1];
          if (!latest) return s;
          return {
            ...s,
            currentTemp: latest.temperature,
            lat: latest.latitude,
            lng: latest.longitude,
          };
        } catch {
          return s; // no readings yet for this sensor
        }
      })
    );
  }, []);

  // ── Standalone excursions loader.
  // Excursions.jsx polls this directly (every 30s) independent of the
  // global refresh(), and uses excursionsLoading / isLiveExcursions to
  // show a loading row and a Live/Mock badge.
  const loadExcursions = useCallback(async () => {
    try {
      setExcursionsLoading(true);
      const rawExcursions = await listExcursions();
      setExcursions(prevExc => mergeLocalFlag(rawExcursions, prevExc, 'status', 'CLOSED', 'OPEN'));
      setIsLiveExcursions(true);
    } catch (err) {
      console.error('[AppContext] loadExcursions failed:', err);
      setIsLiveExcursions(false);
      // Keep whatever excursions are already in state (don't wipe the list
      // on a transient failure) rather than throwing — Excursions.jsx has
      // no error boundary for this.
    } finally {
      setExcursionsLoading(false);
    }
  }, []);

  // ── Sensors — shipment-1.py only exposes GET /shipments/:id/sensors
  // (per-shipment), there's no global "list all sensors" endpoint. So we
  // fetch sensors for every shipment in parallel and flatten the result.
  // Returns the flat list (also sets state) so refresh() can derive a
  // shipmentId → sensorId map from it for hydrateTemps below.
  const loadSensors = useCallback(async (shipmentList) => {
    try {
      const perShipment = await Promise.all(
        shipmentList.map(s =>
          listSensorsForShipment(s.id).catch(() => []) // skip shipments with none / 404
        )
      );
      const flat = perShipment.flat().map(normalizeSensor);
      setSensors(flat);
      return flat;
    } catch (err) {
      console.error('[AppContext] loadSensors failed:', err);
      return [];
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [rawShipments, rawAlerts] = await Promise.all([
        listShipments(),
        listAlerts(),
      ]);

      const normalized = assignDisplayIds(rawShipments.map(normalizeShipment));

      // Sensors must be fetched FIRST: shipment-1.py's ShipmentResponse has
      // no sensor_id field (only SensorResponse has shipment_id, pointing
      // the other way). We build the shipmentId → sensorId map from the
      // sensors we already fetch for Sensors.jsx, and patch it onto each
      // shipment so hydrateTemps() has something to look up.
      const sensorList = await loadSensors(normalized);
      const sensorByShipment = Object.fromEntries(
        sensorList.map(sn => [sn.shipmentId, sn.id])
      );
      const withSensorIds = normalized.map(s => ({
        ...s,
        sensorId: s.sensorId ?? sensorByShipment[s.id] ?? null,
      }));

      const withTemps = await hydrateTemps(withSensorIds);
      setShipments(withTemps);

      // Preserve any LOCAL acknowledged flags across a refresh by
      // re-applying them onto the freshly fetched rows (same id = same row).
      setAlerts(prevAlerts => mergeLocalFlag(rawAlerts, prevAlerts, 'acknowledged'));

      await loadExcursions();
    } catch (err) {
      console.error('[AppContext] Bootstrap failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hydrateTemps, loadExcursions, loadSensors]);

  useEffect(() => {
    if (user) refresh();
    else setLoading(false);
  }, [user, refresh]);

  // ── Poll every 30s so dashboard stays roughly live without WebSockets
  useEffect(() => {
    if (!user) return;
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [user, refresh]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const createShipment = useCallback(async (formData) => {
    const created = await apiCreateShipment(formData);
    setShipments(prev => assignDisplayIds([normalizeShipment(created), ...prev]));
    return created;
  }, []);

  const createSensor = useCallback(async (shipmentId, payload) => {
    const created = await apiRegisterSensor(shipmentId, payload);
    setSensors(prev => [normalizeSensor(created), ...prev]);
    return created;
  }, []);

  // Advances a shipment to its next valid status (CREATED → IN_TRANSIT →
  // DELIVERED), calling the real PATCH /shipments/:id/status endpoint.
  // Returns the updated shipment, or throws if the backend rejects the
  // transition (e.g. already DELIVERED).
  const advanceShipmentStatus = useCallback(async (shipmentId) => {
    const current = shipments.find(s => s.id === shipmentId);
    const next = current ? NEXT_STATUS[current.status] : null;
    if (!next) {
      throw new Error('This shipment has no further status to advance to.');
    }

    const updated = await apiUpdateShipmentStatus(shipmentId, next);
    setShipments(prev => prev.map(s =>
      s.id === shipmentId ? { ...s, status: updated.status } : s
    ));
    return updated;
  }, [shipments]);

  // LOCAL ONLY — see file header note. Nothing is sent to the backend
  // because no endpoint exists to receive it.
  const acknowledgeAlert = useCallback((alertId) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  }, []);

  // LOCAL ONLY — alertService.acknowledgeAllAlerts() is a stub (no real
  // backend endpoint exists), kept for symmetry / future wiring.
  const acknowledgeAllAlerts = useCallback(async () => {
    await apiAcknowledgeAllAlerts();
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
  }, []);

  // LOCAL ONLY — see file header note.
  const resolveExcursion = useCallback((excursionId, note) => {
    setExcursions(prev => prev.map(e =>
      e.id === excursionId ? { ...e, status: 'CLOSED', resolutionNote: note } : e
    ));
  }, []);

  // Exposes the same forward-only transition map so Shipments.jsx can
  // label/disable the Advance button without duplicating the rule.
  const getNextStatus = useCallback((status) => NEXT_STATUS[status] ?? null, []);

  return (
    <AppContext.Provider value={{
      user, login, logout,
      shipments, sensors, alerts, excursions,
      excursionsLoading, isLiveExcursions, loadExcursions,
      openCount, unacknowledgedAlerts,
      createShipment, createSensor, advanceShipmentStatus, getNextStatus,
      acknowledgeAlert, acknowledgeAllAlerts, resolveExcursion,
      can, loading, error, refresh,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Helper: keep locally-set flags alive across a refetch ────────────────────
function mergeLocalFlag(freshRows, prevRows, flagKey, trueValue = true, falseValue = false) {
  const prevById = Object.fromEntries(prevRows.map(r => [r.id, r]));
  return freshRows.map(row => {
    const prev = prevById[row.id];
    if (prev && prev[flagKey] === trueValue) {
      return { ...row, [flagKey]: trueValue };
    }
    return { ...row, [flagKey]: row[flagKey] ?? falseValue };
  });
}