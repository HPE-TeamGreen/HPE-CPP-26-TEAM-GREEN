import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/layout/Button';
import styles from './TablePage.module.css';

export default function NewShipment() {
  const navigate = useNavigate();
  const { createShipment } = useApp();

  const [form, setForm] = useState({
    origin: '',
    destination: '',
    product: '',
    sensorId: '',
    minTemp: '',
    maxTemp: '',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
    }));

  const handleSubmit = async () => {
    if (
      !form.origin ||
      !form.destination ||
      !form.minTemp ||
      !form.maxTemp
    ) {
      setError('Please complete all required fields.');
      return;
    }

    const minTempNum = Number(form.minTemp);
    const maxTempNum = Number(form.maxTemp);

    if (isNaN(minTempNum) || isNaN(maxTempNum)) {
      setError('Temperature limits must be valid numbers.');
      return;
    }

    if (minTempNum < -100 || minTempNum > 100 || maxTempNum < -100 || maxTempNum > 100) {
      setError('Temperature limits must be between -100°C and 100°C.');
      return;
    }

    if (maxTempNum <= minTempNum) {
      setError('Max temperature limit must be greater than min temperature limit.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await createShipment({
        origin: form.origin,
        destination: form.destination,
        product: form.product,
        min_temp_limit: minTempNum,
        max_temp_limit: maxTempNum,
      });

      navigate('/shipments');
    } catch (err) {
      setError(err?.message || 'Unable to register shipment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Register Shipment"
        subtitle="Create a new shipment"
      />

      <div className={styles.content}>
        {error && <div className={styles.toast}>{error}</div>}

        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Origin City</label>
              <input
                className={styles.formInput}
                placeholder="e.g. Mumbai"
                value={form.origin}
                onChange={set('origin')}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Destination City</label>
              <input
                className={styles.formInput}
                placeholder="e.g. Delhi"
                value={form.destination}
                onChange={set('destination')}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Product Type</label>
              <select
                className={styles.formSelect}
                value={form.product}
                onChange={set('product')}
              >
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
              <label className={styles.formLabel}>
                Min Temp Limit (°C)
              </label>
              <input
                className={styles.formInput}
                type="number"
                placeholder="e.g. 2"
                value={form.minTemp}
                onChange={set('minTemp')}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Max Temp Limit (°C)
              </label>
              <input
                className={styles.formInput}
                type="number"
                placeholder="e.g. 8"
                value={form.maxTemp}
                onChange={set('maxTemp')}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <Button
              variant="ghost"
              onClick={() => navigate('/shipments')}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Registering...' : 'Register Shipment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}