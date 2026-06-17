import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '../../context/AppContext';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge from '../../components/layout/StatusBadge';
import Button from '../../components/layout/Button';
import { updateShipmentStatus } from '../../services/shipmentService';
import styles from './TablePage.module.css';

const DEFAULT_CENTER = [22.9734, 78.6569];
const DEFAULT_ZOOM = 5.2;
const INDIA_BOUNDS = [
  [6.5, 68.0],
  [37.5, 97.5],
];

const CITY_COORDS = {
  Mumbai: [19.0760, 72.8777],
  Delhi: [28.6139, 77.2090],
  Bangalore: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Hyderabad: [17.3850, 78.4867],
  Pune: [18.5204, 73.8567],
  Kolkata: [22.5726, 88.3639],
  // Full location names used by the seed/demo script
  'Mangaluru Warehouse': [12.9141, 74.8560],
  'Bengaluru Hub': [12.9716, 77.5946],
  'Mysuru Distribution': [12.2958, 76.6394],
  'Udupi Port': [13.3409, 74.7421],
  'Hubballi Storage': [15.3647, 75.1240],
  'Chennai Central': [13.0827, 80.2707],
  'Mumbai Docks': [19.0760, 72.8777],
};

function MapOverlays({ activeShipments }) {
  const map = useMap();
  const [scrollEnabled, setScrollEnabled] = useState(false);

  useEffect(() => {
    map.scrollWheelZoom.disable();
  }, [map]);

  useEffect(() => {
    if (activeShipments.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = L.latLngBounds(activeShipments.map(s => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [activeShipments, map]);

  const handleToggleScroll = () => {
    const next = !scrollEnabled;
    setScrollEnabled(next);
    if (next) {
      map.scrollWheelZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
    }
  };

  const handleFitActive = () => {
    if (activeShipments.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = L.latLngBounds(activeShipments.map(s => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  };

  return (
    <>
      <div className={styles.mapControls}>
        <button className={styles.mapControlBtn} type="button" onClick={handleFitActive}>Fit Active</button>
        <button className={styles.mapControlBtn} type="button" onClick={handleToggleScroll}>
          {scrollEnabled ? 'Lock Scroll' : 'Enable Scroll'}
        </button>
      </div>
      <div className={styles.mapMeta}>Active: {activeShipments.length}</div>
    </>
  );
}

export default function Shipments() {
  const { shipments, loadShipments } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const [transitioning, setTransitioning] = useState(false);

  const filtered = filter === 'ALL' ? shipments : shipments.filter(s => s.status === filter);
  const visible = filtered.filter(s => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [
      s.id,
      s.origin,
      s.destination,
      s.product,
      s.sensorId,
      s.status,
    ].some(value => value.toLowerCase().includes(q));
  });
  const activeShipments = shipments.filter(s => s.status === 'IN_TRANSIT');
  const mapShipments = activeShipments.filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lng));

  const getTempStatus = (s) => {
    if (s.currentTemp > s.maxTemp || s.currentTemp < s.minTemp) return 'BREACH';
    if (s.currentTemp > s.maxTemp - 1) return 'WARN';
    return 'SAFE';
  };

  const tempColor = { SAFE: 'var(--accent-green)', WARN: 'var(--accent-yellow)', BREACH: 'var(--accent-red)' };

  const routeLines = useMemo(() => mapShipments.map(s => {
    const origin = CITY_COORDS[s.origin];
    const destination = CITY_COORDS[s.destination];
    if (!origin || !destination) return null;
    return { id: s.id, origin, destination, status: getTempStatus(s) };
  }).filter(Boolean), [mapShipments]);

  const markerIcons = useMemo(() => ({
    SAFE: L.divIcon({
      className: styles.marker,
      html: `<span class="${styles.markerDot} ${styles.markerSafe}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    }),
    WARN: L.divIcon({
      className: styles.marker,
      html: `<span class="${styles.markerDot} ${styles.markerWarn}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    }),
    BREACH: L.divIcon({
      className: styles.marker,
      html: `<span class="${styles.markerDot} ${styles.markerBreach}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    }),
  }), []);

  const showToast = (message) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2000);
  };

  const copyToClipboard = async (value) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const el = document.createElement('textarea');
        el.value = value;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      showToast(`Copied ${value}`);
    } catch (err) {
      showToast('Copy failed');
    }
  };

  const handleStartTransit = async (shipment) => {
  if (
    !shipment.sensorId ||
    shipment.sensorId === 'UNASSIGNED'
  ) {
    showToast('Please assign a sensor before starting transit');
    return;
  }

  try {
    setTransitioning(true);

    await updateShipmentStatus(
      shipment.id,
      'IN_TRANSIT'
    );

    showToast(
      `Shipment ${shipment.id} is now in transit!`
    );

    await loadShipments();
  } catch (err) {
    showToast(err?.message || 'Failed to start transit');
  } finally {
    setTransitioning(false);
  }
};

  return (
    <div className={styles.page}>
      <PageHeader
        title="Shipments"
        subtitle={`${shipments.length} total shipments`}
        actions={<Button variant="primary" onClick={() => navigate('/shipments/new')}>+ Register Shipment</Button>}
      />
      <div className={styles.content}>
        {toast && <div className={styles.toast}>{toast}</div>}
        <div className={styles.mapWrap}>
          <div className={styles.mapHeader}>
            <div className={styles.mapTitle}>Active Shipments Map</div>
            <div className={styles.mapLegend}>
              <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.legendSafe}`} />Safe</span>
              <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.legendWarn}`} />Warning</span>
              <span className={styles.legendItem}><span className={`${styles.legendDot} ${styles.legendBreach}`} />Breach</span>
            </div>
          </div>
          <MapContainer
            className={styles.map}
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={false}
            maxBounds={INDIA_BOUNDS}
            maxBoundsViscosity={0.9}
            minZoom={4.5}
            maxZoom={8}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapOverlays activeShipments={mapShipments} />
            {routeLines.map(route => (
              <Polyline
                key={`route-${route.id}`}
                positions={[route.origin, route.destination]}
                pathOptions={{
                  color: tempColor[route.status],
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '6 6',
                }}
              />
            ))}
            {mapShipments.map(s => {
              const ts = getTempStatus(s);
              return (
                <Marker key={s.id} position={[s.lat, s.lng]} icon={markerIcons[ts]}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                    {s.id}
                  </Tooltip>
                  <Popup>
                    <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.id}</div>
                      <div>{s.origin} → {s.destination}</div>
                      <div>Product: {s.product}</div>
                      <div>Sensor: {s.sensorId}</div>
                      <div>Temp: {s.currentTemp}°C ({s.minTemp}–{s.maxTemp}°C)</div>
                      <div>Status: {s.status.replace('_', ' ')}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
        <div className={styles.controlsRow}>
          <div className={styles.filters}>
            {['ALL', 'IN_TRANSIT', 'DELIVERED'].map(f => (
              <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`} onClick={() => setFilter(f)}>
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className={styles.searchWrap}>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search shipments, routes, sensors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {visible.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No shipments match your filters.</div>
            <div className={styles.emptySub}>Try clearing the search or switching status.</div>
            <Button variant="ghost" onClick={() => { setQuery(''); setFilter('ALL'); }}>Reset filters</Button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Shipment ID</th><th>Route</th><th>Product</th><th>Sensor</th>
                  <th>Current Temp</th><th>Limits</th><th>Status</th><th>Temp Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(s => {
                  const ts = getTempStatus(s);
                  return (
                    <tr key={s.id} className={styles.row}>
                      <td>
                        <div className={styles.rowId}>
                          <span className={styles.mono}>{s.id}</span>
                          <button
                            type="button"
                            className={styles.copyBadge}
                            onClick={() => copyToClipboard(s.id)}
                            title="Copy shipment ID"
                            aria-label="Copy shipment ID"
                          >
                            <svg className={styles.copyIcon} viewBox="0 0 24 24" aria-hidden="true">
                              <rect x="9" y="7" width="10" height="12" rx="2" />
                              <rect x="5" y="3" width="10" height="12" rx="2" />
                            </svg>
                          </button>
                        </div>
                        <span className={styles.rowSub}>Sensor {s.sensorId} • {s.status.replace('_', ' ')}</span>
                      </td>
                      <td>{s.origin} → {s.destination}</td>
                      <td>{s.product}</td>
                      <td><span className={styles.mono}>{s.sensorId}</span></td>
                      <td>
                        <span style={{ color: tempColor[ts], fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {s.currentTemp}°C
                        </span>
                      </td>
                      <td><span className={styles.mono}>{s.minTemp}–{s.maxTemp}°C</span></td>
                      <td><StatusBadge status={s.status} /></td>
                      <td><StatusBadge status={ts} /></td>
                      <td>
                        {s.status === 'CREATED' ? (
                          <Button
                            variant="primary"
                            onClick={() => {handleStartTransit(s)}}
                            disabled={transitioning}
                            style={{ padding: '4px 10px', fontSize: '11px', minHeight: 'auto' }}
                          >
                            Start Transit
                          </Button>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
