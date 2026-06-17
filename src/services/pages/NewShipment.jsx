import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/layout/Button';
import styles from './TablePage.module.css';

export default function NewShipment() {
  const navigate = useNavigate();
  const { createShipment, createSensor } = useApp();
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    product: '',
    sensorId: '',
    calibrationDate: '',
    minTemp: '',
    maxTemp: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.origin || !form.destination || !form.minTemp || !form.maxTemp) {
      setError('Please complete all required fields.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Step 1 — create the shipment. shipment-1.py's POST /shipments has
      // no sensor field at all (note: product is also not a real field on
      // the backend schema yet, it's accepted but silently dropped).
      const shipment = await createShipment({
        origin: form.origin,
        destination: form.destination,
        product: form.product,
        min_temp_limit: Number(form.minTemp),
        max_temp_limit: Number(form.maxTemp),
      });

      // Step 2 — only if a sensor ID was entered, register a brand-new
      // sensor bound to this shipment. shipment-1.py has no concept of
      // "unassigned" sensors to pick from — every sensor is created
      // already permanently attached to one shipment (shipment_id is
      // NOT NULL on the backend's SensorModel, with no reassignment
      // endpoint). So this always creates a NEW physical sensor record,
      // it never reuses an existing one.
      if (form.sensorId.trim()) {
        try {
          await createSensor(shipment.shipment_id, {
            sensor_id: form.sensorId.trim(),
            calibration_date: form.calibrationDate || null,
          });
        } catch (sensorErr) {
          // The shipment was created successfully even though the sensor
          // failed (e.g. that sensor_id already exists elsewhere → 409).
          // Don't lose the shipment — surface this clearly and let the
          // user retry the sensor separately from the Sensors page.
          setError(
            `Shipment created, but sensor registration failed: ${sensorErr?.message || 'unknown error'}. ` +
            `You can register the sensor separately from the Sensors page using shipment ID ${shipment.shipment_id}.`
          );
          setSaving(false);
          return;
        }
      }

      navigate('/shipments');
    } catch (err) {
      setError(err?.message || 'Unable to register shipment');
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Register Shipment" subtitle="Create a new shipment and assign sensor" />
      <div className={styles.content}>
        {error && <div className={styles.toast}>{error}</div>}
        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Origin City</label>
              <input className={styles.formInput} placeholder="e.g. Mumbai" value={form.origin} onChange={set('origin')} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Destination City</label>
              <input className={styles.formInput} placeholder="e.g. Delhi" value={form.destination} onChange={set('destination')} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Product Type</label>
              <select className={styles.formSelect} value={form.product} onChange={set('product')}>
                <option value="">Select product</option>
                <option>Vaccines</option>
                <option>Insulin</option>
                <option>Blood</option>
                <option>Plasma</option>
                <option>Reagents</option>
                <option>Eye Drops</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Min Temp Limit (°C)</label>
              <input className={styles.formInput} type="number" placeholder="e.g. 2" value={form.minTemp} onChange={set('minTemp')} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Max Temp Limit (°C)</label>
              <input className={styles.formInput} type="number" placeholder="e.g. 8" value={form.maxTemp} onChange={set('maxTemp')} />
            </div>
            <div className={styles.formGroup + ' ' + styles.full}>
              <label className={styles.formLabel}>
                New Sensor ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — registers a new device for this shipment)</span>
              </label>
              <input
                className={styles.formInput}
                placeholder="e.g. S-21"
                value={form.sensorId}
                onChange={set('sensorId')}
              />
            </div>
            {form.sensorId.trim() && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Calibration Date</label>
                <input className={styles.formInput} type="date" value={form.calibrationDate} onChange={set('calibrationDate')} />
              </div>
            )}
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => navigate('/shipments')}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Registering...' : 'Register Shipment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}