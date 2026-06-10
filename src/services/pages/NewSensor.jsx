import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/layout/Button';
import styles from './TablePage.module.css';

export default function NewSensor() {
  const navigate = useNavigate();
  const { createSensor } = useApp();
  const [form, setForm] = useState({ sensorId: '', calibrationDate: '', shipmentId: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.sensorId.trim() || !form.shipmentId.trim()) {
      setError('Sensor ID and Shipment ID are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await createSensor(form.shipmentId.trim(), {
        sensor_id: form.sensorId.trim(),
        calibration_date: form.calibrationDate || null,
      });
      navigate('/sensors');
    } catch (err) {
      setError(err?.message || 'Unable to register device');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Register Device" subtitle="Add a new IoT sensor to the platform" />
      <div className={styles.content}>
        {error && <div className={styles.toast}>{error}</div>}
        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Sensor ID</label>
              <input className={styles.formInput} placeholder="e.g. S-20" value={form.sensorId} onChange={set('sensorId')} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Calibration Date</label>
              <input className={styles.formInput} type="date" value={form.calibrationDate} onChange={set('calibrationDate')} />
            </div>
            <div className={styles.formGroup + ' ' + styles.full}>
              <label className={styles.formLabel}>Assign to Shipment</label>
              <input className={styles.formInput} placeholder="e.g. SHP-2041" value={form.shipmentId} onChange={set('shipmentId')} />
            </div>
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => navigate('/sensors')}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Registering...' : 'Register Device'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
