import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, ReferenceLine } from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/layout/Button';
import { useApp } from '../../context/AppContext';
import styles from './Reports.module.css';



// const monthlyData = [
//   { month: 'Nov', shipments: 18, excursions: 2, compliance: 89 },
//   { month: 'Dec', shipments: 22, excursions: 4, compliance: 82 },
//   { month: 'Jan', shipments: 20, excursions: 1, compliance: 95 },
//   { month: 'Feb', shipments: 25, excursions: 3, compliance: 88 },
//   { month: 'Mar', shipments: 28, excursions: 2, compliance: 93 },
//   { month: 'Apr', shipments: 24, excursions: 3, compliance: 94 },
// ];

// const productData = [
//   { product: 'Vaccines', avgTemp: 5.2, excursions: 2 },
//   { product: 'Insulin', avgTemp: 4.8, excursions: 0 },
//   { product: 'Blood', avgTemp: 3.9, excursions: 1 },
//   { product: 'Plasma', avgTemp: -17.5, excursions: 0 },
//   { product: 'Reagents', avgTemp: 3.2, excursions: 0 },
//   { product: 'Eye Drops', avgTemp: 18.2, excursions: 0 },
// ];

const tooltipStyle = {
  contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--text-secondary)' },
};

const chartTextColor = '#ffffff';
const chartGridColor = 'rgba(255, 255, 255, 0.18)';
const chartAccentColor = '#3B82F6';
const chartLimitColor = '#F59E0B';
const chartExcursionColor = '#EF4444';
const chartComplianceColor = '#22C55E';
const chartMonthlyExcursionColor = '#F59E0B';

function formatMonthLabel(value) {
  if (value == null) return '';
  const normalized = String(value).trim();
  if (!normalized) return '';
  const numeric = Number(normalized);
  if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
    return new Date(2020, numeric - 1, 1).toLocaleString('en-US', { month: 'short' });
  }
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(normalized)) {
    const [year, month] = normalized.split('-');
    return new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
  }
  if (normalized.length <= 3) return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  return normalized.slice(0, 3);
}

function buildChartTicks(maxValue, count = 5) {
  const safeMax = Math.max(1, Math.ceil(maxValue));
  const targetTicks = Math.min(count, Math.max(2, safeMax + 1));
  const interval = Math.max(1, Math.ceil(safeMax / (targetTicks - 1)));
  return Array.from({ length: targetTicks }, (_, index) => index * interval);
}

function buildMonthlyLineSvg(data) {
  const width = 520;
  const height = 220;
  const padding = 28;
  const values = data.map(row => Number(row.compliance) || 0);
  const max = 100;
  const min = 0;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const labels = data.map((row, index) => {
    const x = padding + index * stepX;
    const monthLabel = formatMonthLabel(row.month);
    return `<text x="${x}" y="${height - 8}" text-anchor="middle" font-size="11" fill="${chartTextColor}">${monthLabel}</text>`;
  }).join('');

  const yTicks = [0, 25, 50, 75, 100].map((tick) => {
    const y = height - padding - ((tick - min) / (max - min || 1)) * (height - padding * 2);
    return `<g><line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="${chartGridColor}" stroke-dasharray="4 4"></line><text x="${padding - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="${chartTextColor}">${tick}%</text></g>`;
  }).join('');

  const circles = points.split(' ').map((point) => {
    const [x, y] = point.split(',');
    return `<circle cx="${x}" cy="${y}" r="4.5" fill="${chartComplianceColor}" />`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="#111827" rx="12" />${yTicks}<polyline fill="none" stroke="${chartComplianceColor}" stroke-width="3" points="${points}" />${circles}${labels}</svg>`;
}

function buildTelemetryTimelineSvg(telemetry, minTempLimit, maxTempLimit) {
  const width = 580;
  const height = 260;
  const padding = 38;
  const rows = (telemetry || []).map((entry) => ({
    timestamp: entry.recorded_at,
    value: Number(entry.temperature) || 0,
  }));

  if (!rows.length) {
    return '<div style="color:#9ca3af;font-size:12px;padding:8px 0;">No telemetry data available.</div>';
  }

  const values = rows.map((row) => row.value);
  const minValue = Math.min(...values, minTempLimit, maxTempLimit) - 1;
  const maxValue = Math.max(...values, minTempLimit, maxTempLimit) + 1;
  const stepX = rows.length > 1 ? (width - padding * 2) / (rows.length - 1) : 0;

  const points = rows.map((row, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((row.value - minValue) / (maxValue - minValue || 1)) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const firstDate = new Date(rows[0].timestamp);
  const lastDate = new Date(rows[rows.length - 1].timestamp);
  const sameDay = firstDate.toDateString() === lastDate.toDateString();

  const xLabels = rows.map((row, index) => {
    const x = padding + index * stepX;
    if (rows.length > 10 && index % 2 !== 0) return '';
    const date = new Date(row.timestamp);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let label = time;
    if (!sameDay && (index === 0 || index === rows.length - 1)) {
      label = `${month} ${day} ${time}`;
    }
    return `<text x="${x}" y="${height - 8}" text-anchor="middle" font-size="10" fill="${chartTextColor}">${label}</text>`;
  }).join('');

  const limitLines = [
    { value: minTempLimit, label: 'Min Limit', color: chartLimitColor },
    { value: maxTempLimit, label: 'Max Limit', color: chartLimitColor },
  ].map((line) => {
    const y = height - padding - ((line.value - minValue) / (maxValue - minValue || 1)) * (height - padding * 2);
    return `<g><line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="${line.color}" stroke-dasharray="6 4" stroke-width="1.5" opacity="0.85" /><text x="${padding + 2}" y="${y - 6}" font-size="10" fill="${line.color}">${line.label}</text></g>`;
  }).join('');

  const yTicks = [minValue, (minValue + maxValue) / 2, maxValue].map((tick) => {
    const y = height - padding - ((tick - minValue) / (maxValue - minValue || 1)) * (height - padding * 2);
    return `<g><line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="${chartGridColor}" stroke-dasharray="4 4" /><text x="${padding - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="${chartTextColor}">${tick.toFixed(1)}°C</text></g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="#111827" rx="16" /><rect x="${padding}" y="${padding - 12}" width="${width - padding * 2}" height="${height - padding * 1.5}" fill="transparent" rx="12" />${yTicks}${limitLines}<polyline fill="none" stroke="${chartAccentColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" />${xLabels}</svg>`;
}

function buildMonthlyBarSvg(data) {
  const width = 520;
  const height = 220;
  const padding = 28;
  const values = data.map(row => Number(row.excursions) || 0);
  const maxValue = Math.max(...values, 0);
  const tickValues = buildChartTicks(maxValue, 5);
  const chartMax = Math.max(1, tickValues[tickValues.length - 1]);
  const gap = 12;
  const barWidth = data.length > 0 ? (width - padding * 2 - gap * (data.length - 1)) / data.length : 0;

  const bars = values.map((value, index) => {
    const barHeight = (value / chartMax) * (height - padding * 2);
    const x = padding + index * (barWidth + gap);
    const y = height - padding - barHeight;
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${chartMonthlyExcursionColor}" />`;
  }).join('');

  const labels = data.map((row, index) => {
    const x = padding + index * (barWidth + gap) + barWidth / 2;
    const month = formatMonthLabel(row.month);
    return `<text x="${x}" y="${height - 8}" text-anchor="middle" font-size="11" fill="${chartTextColor}">${month}</text>`;
  }).join('');

  const yTicks = tickValues.map((tick) => {
    const y = height - padding - ((tick / chartMax) * (height - padding * 2));
    return `<g><line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="${chartGridColor}" stroke-dasharray="4 4"></line><text x="${padding - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="${chartTextColor}">${tick}</text></g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="#111827" rx="12" />${yTicks}${bars}${labels}</svg>`;
}

const dispositionRules = {
  noExcursions: {
    verdict: 'Approved for use',
    summary: (productLabel) => `The shipment stayed within the approved temperature range, so ${productLabel} appears suitable for use.`,
    tone: 'good',
    color: 'var(--accent-green)',
  },
  conditional: {
    verdict: 'Conditional release',
    summary: (productLabel, details) => `The shipment recorded ${details.excursions} excursion${details.excursions === 1 ? '' : 's'} and showed ${details.severity}. ${productLabel} may need QA approval before it can be used.`,
    tone: 'warning',
    color: '#f59e0b',
  },
  noNeedToUse: {
    verdict: 'Not suitable for use',
    summary: (productLabel, details) => `The shipment recorded ${details.excursions} excursion${details.excursions === 1 ? '' : 's'} and showed ${details.severity}. ${productLabel} should not be used and may require disposal or requalification.`,
    tone: 'danger',
    color: 'var(--accent-red)',
  },
  doNotUse: {
    verdict: 'Not suitable for use',
    summary: (productLabel, details) => `The shipment recorded ${details.excursions} excursion${details.excursions === 1 ? '' : 's'} and showed ${details.severity}. ${productLabel} should not be released for use without requalification or disposal.`,
    tone: 'danger',
    color: 'var(--accent-red)',
  },
  selectShipment: {
    verdict: 'Select a shipment',
    summary: 'Choose a shipment to see the suitability review.',
    tone: 'neutral',
    color: 'var(--text-secondary)',
  },
};

function buildShipmentDisposition(shipment, sensorReport, excursions = []) {
  if (!shipment) {
    return dispositionRules.selectShipment;
  }

  const shipmentExcursions = (excursions || []).filter((entry) => {
    const shipmentId = entry?.shipmentId || entry?.shipment_id;
    return shipmentId === shipment.id || shipmentId === shipment.shipmentId;
  });

  const excursionCount = shipmentExcursions.length;
  const analyticsExcursions = Number(sensorReport?.analytics?.total_excursions || 0);
  const effectiveExcursions = analyticsExcursions || excursionCount;

  const minAllowed = Number(sensorReport?.min_temp_limit ?? shipment?.minTemp ?? 0);
  const maxAllowed = Number(sensorReport?.max_temp_limit ?? shipment?.maxTemp ?? 0);
  const currentTemp = Number(shipment?.currentTemp ?? 0);
  const tempOutsideRange = minAllowed && maxAllowed ? currentTemp < minAllowed || currentTemp > maxAllowed : false;

  const minRecorded = Number(sensorReport?.analytics?.min_temp ?? shipment?.currentTemp ?? 0);
  const maxRecorded = Number(sensorReport?.analytics?.max_temp ?? shipment?.currentTemp ?? 0);
  const deviationMagnitude = sensorReport
    ? Math.max(Math.abs(minRecorded - minAllowed), Math.abs(maxRecorded - maxAllowed))
    : 0;
  const majorDeviation = sensorReport
    ? (minRecorded < minAllowed - 2 || maxRecorded > maxAllowed + 2)
    : tempOutsideRange;

  const shipmentDuration = shipment?.createdAt ? Math.max(1, Math.round((Date.now() - new Date(shipment.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 1;
  const productSensitivity = String(shipment?.product || '').toLowerCase();
  const sensitiveProduct = ['vaccine', 'insulin', 'blood', 'plasma', 'serum', 'biologic'].some((term) => productSensitivity.includes(term));

  const severity = (() => {
    if (majorDeviation && effectiveExcursions >= 5) return 'severe and repeated temperature breaches';
    if (majorDeviation) return 'major temperature deviation';
    if (effectiveExcursions >= 5) return 'repeated temperature instability';
    if (effectiveExcursions >= 3) return 'multiple temperature excursions';
    if (effectiveExcursions === 1) return 'a single temperature excursion';
    return 'normal temperature performance';
  })();

  const productLabel = shipment.product || 'this product';
  const details = { excursions: effectiveExcursions, severity, deviationMagnitude, shipmentDuration, sensitiveProduct };

  if (effectiveExcursions === 0 && !majorDeviation) {
    return {
      ...dispositionRules.noExcursions,
      summary: dispositionRules.noExcursions.summary(productLabel),
    };
  }

  if (effectiveExcursions >= 5 || (majorDeviation && (deviationMagnitude >= 4 || sensitiveProduct))) {
    return {
      ...dispositionRules.noNeedToUse,
      summary: dispositionRules.noNeedToUse.summary(productLabel, details),
    };
  }

  if (majorDeviation || (effectiveExcursions >= 3 && (deviationMagnitude >= 2 || sensitiveProduct || shipmentDuration > 3))) {
    return {
      ...dispositionRules.doNotUse,
      summary: dispositionRules.doNotUse.summary(productLabel, details),
    };
  }

  if (effectiveExcursions >= 3 || (effectiveExcursions >= 1 && (deviationMagnitude >= 1 || sensitiveProduct))) {
    return {
      ...dispositionRules.conditional,
      summary: dispositionRules.conditional.summary(productLabel, details),
    };
  }

  return {
    ...dispositionRules.conditional,
    summary: dispositionRules.conditional.summary(productLabel, details),
  };
}

function CollapsibleChart({ title, badge, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--bg-card)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
          {badge && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 7px',
              borderRadius: 20, background: 'var(--bg-hover)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}>{badge}</span>
          )}
        </div>
        <span style={{
          fontSize: 12, color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const { shipments, excursions, can } = useApp();

  const canExport = can('exportReport');

  const [selectedShipment, setSelectedShipment] = useState('');
  const [complianceStats, setComplianceStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [productQuery, setProductQuery] = useState('');

  const [sensorReport, setSensorReport] = useState(null);
  const [sensorReportLoading, setSensorReportLoading] = useState(false);
  const [sensorReportError, setSensorReportError] = useState(null);

  const compactMonthlyData = monthlyData.map((row) => ({
    ...row,
    month: String(row.month || '').slice(0, 3),
  }));

  useEffect(() => {
    const shipment = shipments.find(s => s.id === selectedShipment);
    if (shipment && shipment.status === 'DELIVERED' && shipment.sensorId) {
      setSensorReportLoading(true);
      setSensorReportError(null);
      setSensorReport(null);
      import('../../services/reportingService').then(({ getSensorDeliveryReport }) => {
        getSensorDeliveryReport(shipment.sensorId)
          .then(data => {
            setSensorReport(data);
            setSensorReportLoading(false);
          })
          .catch(err => {
            setSensorReportError(err.message || 'Failed to load report');
            setSensorReportLoading(false);
          });
      });
    } else {
      setSensorReport(null);
      setSensorReportError(null);
      setSensorReportLoading(false);
    }
  }, [selectedShipment, shipments]);
  useEffect(() => {
    import('../../services/reportingService').then(
      ({
        getComplianceReport,
        getMonthlyCompliance,
        getProductSummary,
      }) => {

        getComplianceReport()
          .then((res) => {
            if (res?.statistics) {
              setComplianceStats(res.statistics);
            }
          })
          .catch(console.error);

        getMonthlyCompliance()
          .then((res) => {
            if (Array.isArray(res)) {
              setMonthlyData(res);
            }
          })
          .catch(console.error);

        getProductSummary()
          .then((res) => {
            if (Array.isArray(res)) {
              setProductData(res);
            }
          })
          .catch(console.error);
      }
    );
  }, []);
  const visibleProducts = productData.filter(p => {
    if (!productQuery.trim()) return true;
    return p.product.toLowerCase().includes(productQuery.toLowerCase());
  });

  const openPrintableWindow = (html, title) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank', 'width=960,height=720');

    if (!printWindow) {
      URL.revokeObjectURL(url);
      return;
    }

    printWindow.document.write(html);
    printWindow.document.title = title;
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      try {
        printWindow.print();
        printWindow.close();
      } finally {
        URL.revokeObjectURL(url);
      }
    }, 700);
  };

  const handleExportPdf = () => {
    const createdOn = new Date().toLocaleDateString();
    const totals = monthlyData.reduce((acc, row) => {
      acc.shipments += row.shipments;
      acc.excursions += row.excursions;
      acc.compliance += row.compliance;
      return acc;
    }, { shipments: 0, excursions: 0, compliance: 0 });
    const avgCompliance =
      complianceStats?.compliance_percentage?.toFixed?.(2) ??
      complianceStats?.compliance_percentage ??
      '0.0';
    const monthlyLineChartSvg = buildMonthlyLineSvg(monthlyData.length ? monthlyData : [{ month: 'N/A', compliance: 0 }]);
    const monthlyBarChartSvg = buildMonthlyBarSvg(monthlyData.length ? monthlyData : [{ month: 'N/A', excursions: 0 }]);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>TempSafe Report</title>
          <style>
            :root { color-scheme: light; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 28px; background: #ffffff; }
            h1 { font-size: 22px; margin: 0; }
            h2 { font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
            .meta { font-size: 11px; color: #6b7280; margin-top: 6px; }
            .pill { display: inline-block; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid #e5e7eb; padding: 4px 8px; border-radius: 999px; color: #6b7280; }
            .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 16px 0 18px; }
            .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; background: #f9fafb; }
            .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 6px; }
            .value { font-size: 18px; font-weight: 600; color: #111827; }
            .section { margin-top: 18px; }
            .section-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 6px; }
            .section-sub { font-size: 11px; color: #6b7280; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
            th { text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; font-size: 10px; background: #f3f4f6; }
            tbody tr:nth-child(even) td { background: #fafafa; }
            .right { text-align: right; }
            .muted { color: #6b7280; }
            .chart-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #fafafa; margin-top: 10px; }
            .chart-title { font-size: 12px; font-weight: 700; color: #111827; margin-bottom: 6px; }
            .page-break { display: block; page-break-before: always; break-before: page; margin-top: 24px; }
            @media print { body { margin: 18mm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>TempSafe Compliance Report</h1>
              <div class="meta">Generated on ${createdOn} · Window: last 6 months</div>
            </div>
          </div>

          <div class="summary">
            <div class="card">
  <div class="label">Active Shipments</div>
  <div class="value">${complianceStats?.active_shipments ?? 0}</div>
</div>

<div class="card">
  <div class="label">Total Excursions</div>
  <div class="value">${complianceStats?.total_excursions ?? 0}</div>
</div>

<div class="card">
  <div class="label">Avg Compliance</div>
  <div class="value">${avgCompliance}%</div>
</div>
            <div class="card"><div class="label">Reporting Window</div><div class="value">6 months</div></div>
          </div>

          <div class="section">
            <div class="section-title">Monthly Compliance Overview</div>
            <div class="section-sub">Shipments, excursions, and compliance rate by month.</div>
            <table>
              <thead>
                <tr><th>Month</th><th class="right">Shipments</th><th class="right">Excursions</th><th class="right">Compliance</th></tr>
              </thead>
              <tbody>
                ${monthlyData.map(row => `
                  <tr>
                    <td>${formatMonthLabel(row.month)}</td>
                    <td class="right">${row.shipments}</td>
                    <td class="right">${row.excursions}</td>
                    <td class="right">${row.compliance}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Compliance Trend</div>
            <div class="section-sub">A compact visual summary of monthly compliance and excursions.</div>
            <div class="chart-card">
              <div class="chart-title">Compliance Rate</div>
              ${monthlyLineChartSvg}
            </div>
            <div class="chart-card">
              <div class="chart-title">Excursions per Month</div>
              ${monthlyBarChartSvg}
            </div>
          </div>

          <div class="section page-break">
            <div class="section-title">Product Temperature Summary</div>
            <div class="section-sub">Average temperature and excursions by product category.</div>
            <table>
              <thead>
                <tr><th>Product</th><th class="right">Avg Temp (C)</th><th class="right">Excursions</th><th class="right">Compliance</th></tr>
              </thead>
              <tbody>
                ${productData.map(row => `
                  <tr>
                    <td>${row.product}</td>
                    <td class="right">${row.avgTemp}</td>
                    <td class="right">${row.excursions}</td>
                    <td class="right">${row.excursions === 0 ? '100%' : '< 100%'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="meta muted">Compliance shown as percentage of shipments within the defined temperature window.</div>
          </div>
        </body>
      </html>
    `;

    openPrintableWindow(html, 'TempSafe Compliance Report');
  };

  const handleExportSensorPdf = () => {
    if (!sensorReport || !selectedShipment) return;
    const s = shipments.find(sh => sh.id === selectedShipment);
    const createdOn = new Date().toLocaleDateString();
    const disposition = buildShipmentDisposition(s, sensorReport, excursions);
    const shipmentExcursions = (excursions || []).filter((entry) => {
      const shipmentId = entry?.shipmentId || entry?.shipment_id;
      return shipmentId === s?.id || shipmentId === s?.shipmentId;
    });
    const effectiveExcursions = Number(sensorReport?.analytics?.total_excursions || shipmentExcursions.length || 0);
    const minAllowed = Number(sensorReport?.min_temp_limit ?? s?.minTemp ?? 0);
    const maxAllowed = Number(sensorReport?.max_temp_limit ?? s?.maxTemp ?? 0);
    const minRecorded = Number(sensorReport?.analytics?.min_temp ?? s?.currentTemp ?? 0);
    const maxRecorded = Number(sensorReport?.analytics?.max_temp ?? s?.currentTemp ?? 0);
    const majorDeviation = minRecorded < minAllowed - 2 || maxRecorded > maxAllowed + 2;

    const reasoningItems = [];
    if (effectiveExcursions > 0) {
      reasoningItems.push(`Recorded ${effectiveExcursions} excursion${effectiveExcursions === 1 ? '' : 's'} during transit.`);
    } else {
      reasoningItems.push('No excursion was recorded during the shipment window.');
    }

    if (minAllowed && maxAllowed) {
      reasoningItems.push(`Observed temperatures ranged from ${minRecorded}°C to ${maxRecorded}°C, compared with the allowed range of ${minAllowed}°C to ${maxAllowed}°C.`);
    }

    if (majorDeviation) {
      reasoningItems.push('The shipment exceeded the approved temperature limits by a significant margin, which raises release risk.');
    } else if (effectiveExcursions > 0) {
      reasoningItems.push('The excursion pattern was limited, so the shipment may need QA review before release.');
    } else {
      reasoningItems.push('The shipment remained within the expected temperature band throughout transit.');
    }

    if (s?.createdAt) {
      const durationDays = Math.max(1, Math.round((Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
      reasoningItems.push(`The shipment duration was ${durationDays} day${durationDays === 1 ? '' : 's'}, which was considered in the release review.`);
    }

    const productSensitivity = String(s?.product || '').toLowerCase();
    const sensitiveProduct = ['vaccine', 'insulin', 'blood', 'plasma', 'serum', 'biologic'].some((term) => productSensitivity.includes(term));
    if (sensitiveProduct) {
      reasoningItems.push('The product is classified as temperature-sensitive, which increases the review severity.');
    }

    // ── Downsample telemetry to at most 25 rows so the report fits on one page ──
    let logs = (sensorReport.telemetry || []).slice().sort(
      (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
    );
    if (logs.length > 25) {
      const first = logs[0];
      const last = logs[logs.length - 1];
      const inner = logs.slice(1, -1);
      
      const excursions = inner.filter(t => t.temperature < sensorReport.min_temp_limit || t.temperature > sensorReport.max_temp_limit);
      const oks = inner.filter(t => t.temperature >= sensorReport.min_temp_limit && t.temperature <= sensorReport.max_temp_limit);
      
      let sampled = [first];
      
      // Calculate how many OK readings we can fit
      const targetOks = Math.max(0, 23 - excursions.length);
      
      if (targetOks > 0 && oks.length > 0) {
        const step = Math.max(1, Math.ceil(oks.length / targetOks));
        for (let i = 0; i < oks.length; i += step) {
          sampled.push(oks[i]);
        }
      }
      
      // Combine sampled OKs with ALL excursions, then sort chronologically
      sampled = [...sampled, ...excursions];
      sampled.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
      
      // Cap at 24 items (plus 'last' makes 25) in case there were too many excursions
      sampled = sampled.slice(0, 24);
      sampled.push(last);
      logs = sampled;
    }

      const logRows = logs.length > 0
      ? logs.map(t => {
        const exc = t.temperature < sensorReport.min_temp_limit || t.temperature > sensorReport.max_temp_limit;
        return `<tr>
            <td>${new Date(t.recorded_at).toLocaleString()}</td>
            <td class="r">${t.temperature}°C</td>
            <td class="r" style="color:${exc ? '#ef4444' : '#10b981'};font-weight:600">${exc ? 'EXCURSION' : 'OK'}</td>
          </tr>`;
      }).join('')
      : '<tr><td colspan="3" style="color:#6b7280;text-align:center">No telemetry data available.</td></tr>';

    const telemetryChartSvg = buildTelemetryTimelineSvg(logs, sensorReport.min_temp_limit, sensorReport.max_temp_limit);
    const excColor = sensorReport.analytics.total_excursions > 0 ? '#ef4444' : '#10b981';

    const html = `<!doctype html><html><head>
<meta charset="utf-8"/>
<title>Shipment Delivery Report</title>
<style>
  @page { size: A4 portrait; margin: 14mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111827; background: #fff; }
  .hdr  { display: flex; justify-content: space-between; align-items: flex-end;
          padding-bottom: 8px; border-bottom: 2px solid #111827; margin-bottom: 10px; }
  .hdr h1 { font-size: 16px; font-weight: 700; letter-spacing: -.3px; }
  .hdr .sub { font-size: 9px; color: #6b7280; margin-top: 3px; }
  .pill { display: none; }
  .sec  { margin-top: 9px; }
  .sec-title { font-size: 9px; font-weight: 700; text-transform: uppercase;
               letter-spacing: .07em; color: #6b7280; margin-bottom: 5px;
               padding-bottom: 3px; border-bottom: 1px solid #e5e7eb; }
  .grid { display: grid; gap: 5px; margin-bottom: 2px; }
  .g4   { grid-template-columns: repeat(4,1fr); }
  .g5   { grid-template-columns: repeat(5,1fr); }
  .card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 8px; background: #f9fafb; }
  .alert-card { padding: 8px 10px; border-left: 4px solid #3b82f6; background: #f8fbff; }
  .lbl  { font-size: 7.5px; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; margin-bottom: 3px; }
  .val  { font-size: 13px; font-weight: 700; color: #111827; line-height: 1; }
  .verdict { font-size: 12px; font-weight: 700; margin-bottom: 4px; color: ${disposition.color}; }
  .reason { font-size: 9.5px; color: #374151; line-height: 1.45; margin-bottom: 5px; }
  .reason-list { margin: 0; padding-left: 13px; color: #4b5563; font-size: 8.8px; line-height: 1.4; }
  .reason-list li { margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 5px; }
  th    { font-size: 7.5px; text-transform: uppercase; letter-spacing: .06em;
          color: #6b7280; background: #f3f4f6; padding: 4px 7px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  td    { font-size: 9.5px; padding: 3.5px 7px; border-bottom: 1px solid #f3f4f6; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .r    { text-align: right; }
  .chart-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; background: #fafafa; margin-top: 6px; }
</style>
</head><body>

<div class="hdr">
  <div>
    <h1>Shipment Delivery Report</h1>
    <div class="sub">Shipment: ${s.id} &nbsp;|&nbsp; Sensor: ${s.sensorId} &nbsp;|&nbsp; Date: ${createdOn}</div>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Shipment Details</div>
  <div class="grid g4">
    <div class="card"><div class="lbl">Product</div><div class="val" style="font-size:11px">${s.product || 'N/A'}</div></div>
    <div class="card"><div class="lbl">Origin</div><div class="val" style="font-size:11px">${s.origin}</div></div>
    <div class="card"><div class="lbl">Destination</div><div class="val" style="font-size:11px">${s.destination}</div></div>
    <div class="card"><div class="lbl">Status</div><div class="val" style="font-size:11px">${s.status}</div></div>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Suitability Assessment</div>
  <div class="card alert-card">
    <div class="verdict">${disposition.verdict}</div>
    <div class="reason">${disposition.summary}</div>
    <ul class="reason-list">
      ${reasoningItems.map((item) => `<li>${item}</li>`).join('')}
    </ul>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Telemetry Analytics</div>
  <div class="grid g5">
    <div class="card"><div class="lbl">Allowed Range</div><div class="val" style="font-size:10px">${sensorReport.min_temp_limit}°C – ${sensorReport.max_temp_limit}°C</div></div>
    <div class="card"><div class="lbl">Min Recorded</div><div class="val">${sensorReport.analytics.min_temp}°C</div></div>
    <div class="card"><div class="lbl">Max Recorded</div><div class="val">${sensorReport.analytics.max_temp}°C</div></div>
    <div class="card"><div class="lbl">Avg Recorded</div><div class="val">${sensorReport.analytics.avg_temp}°C</div></div>
    <div class="card"><div class="lbl">Excursions</div><div class="val" style="color:${excColor}">${sensorReport.analytics.total_excursions}</div></div>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Temperature Timeline</div>
  <div class="chart-box">${telemetryChartSvg}</div>
</div>

<div class="sec">
  <div class="sec-title">Temperature Log <span style="font-weight:400;color:#9ca3af">(showing ${logs.length} representative readings)</span></div>
  <table>
    <thead><tr><th>Time</th><th class="r">Temperature (°C)</th><th class="r">Status</th></tr></thead>
    <tbody>${logRows}</tbody>
  </table>
</div>

</body></html>`;

    openPrintableWindow(html, `Shipment Delivery Report – ${s.sensorId}`);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Reports"
        subtitle="Analytics and compliance reporting"
      />
      <div className={styles.content}>

        <div
          style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <label>Select Shipment:</label>

          <select
            value={selectedShipment}
            onChange={(e) => setSelectedShipment(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">Choose Shipment</option>

            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}
              </option>
            ))}
          </select>
        </div>

        {selectedShipment && (
          <div
            style={{
              marginBottom: '24px',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            {shipments
              .filter((s) => s.id === selectedShipment)
              .map((s) => (
                <div key={s.id}>
                  <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(to right, rgba(59, 130, 246, 0.05), transparent)'
                  }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Shipment #{s.id}</h3>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Sensor: {s.sensorId}</p>
                    </div>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: s.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      color: s.status === 'DELIVERED' ? '#10b981' : '#3b82f6',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {s.status}
                    </span>
                  </div>

                  <div style={{ padding: '24px' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '20px',
                      marginBottom: '24px'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Product</div>
                        <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>{s.product || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Route</div>
                        <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)' }}>{s.origin} &rarr; {s.destination}</div>
                      </div>
                    </div>

                    {(() => {
                      const disposition = buildShipmentDisposition(s, sensorReport, excursions);
                      const dispositionStyles = {
                        background: disposition.tone === 'good'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : disposition.tone === 'danger'
                            ? 'rgba(239, 68, 68, 0.1)'
                            : disposition.tone === 'warning'
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(59, 130, 246, 0.1)',
                        border: `1px solid ${disposition.tone === 'good'
                          ? 'rgba(16, 185, 129, 0.25)'
                          : disposition.tone === 'danger'
                            ? 'rgba(239, 68, 68, 0.25)'
                            : disposition.tone === 'warning'
                              ? 'rgba(245, 158, 11, 0.25)'
                              : 'rgba(59, 130, 246, 0.25)'}`,
                        borderRadius: '12px',
                        padding: '16px 18px',
                        marginBottom: '24px',
                      };

                      return (
                        <div style={dispositionStyles}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Suitability summary</div>
                              <div style={{ fontSize: '15px', fontWeight: '600', color: disposition.color }}>{disposition.verdict}</div>
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{disposition.summary}</p>
                        </div>
                      );
                    })()}

                    {s.status === 'DELIVERED' && (
                      <div style={{
                        background: 'var(--bg-main)',
                        borderRadius: '10px',
                        padding: '24px',
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Final Delivery Audit</h4>
                          {sensorReport && canExport && (
                            <Button variant="primary" onClick={handleExportSensorPdf} style={{ fontSize: '13px', padding: '8px 16px', margin: 0 }}>
                              Download PDF Report
                            </Button>
                          )}
                        </div>

                        {sensorReportLoading && <p style={{ color: 'var(--text-muted)' }}>Loading sensor report...</p>}
                        {sensorReportError && <p style={{ color: 'var(--accent-red)' }}>{sensorReportError}</p>}

                        {sensorReport && (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 15, marginBottom: 25 }}>
                              <div className={styles.summaryCard}>
                                <div className={styles.summaryLabel}>Allowed Range</div>
                                <div className={styles.summaryValue} style={{ fontSize: '16px' }}>{sensorReport.min_temp_limit}°C to {sensorReport.max_temp_limit}°C</div>
                              </div>
                              <div className={styles.summaryCard}>
                                <div className={styles.summaryLabel}>Min Recorded</div>
                                <div className={styles.summaryValue} style={{ fontSize: '18px' }}>{sensorReport.analytics.min_temp}°C</div>
                              </div>
                              <div className={styles.summaryCard}>
                                <div className={styles.summaryLabel}>Max Recorded</div>
                                <div className={styles.summaryValue} style={{ fontSize: '18px' }}>{sensorReport.analytics.max_temp}°C</div>
                              </div>
                              <div className={styles.summaryCard}>
                                <div className={styles.summaryLabel}>Avg Recorded</div>
                                <div className={styles.summaryValue} style={{ fontSize: '18px' }}>{sensorReport.analytics.avg_temp}°C</div>
                              </div>
                              <div className={styles.summaryCard}>
                                <div className={styles.summaryLabel}>Excursions</div>
                                <div className={styles.summaryValue} style={{ fontSize: '18px', color: sensorReport.analytics.total_excursions > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                  {sensorReport.analytics.total_excursions}
                                </div>
                              </div>
                            </div>

                            {sensorReport.telemetry && sensorReport.telemetry.length > 0 && (
                              <div style={{ height: 300, width: '100%', marginTop: '10px' }}>
                                <h5 style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>Temperature Timeline</h5>
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={sensorReport.telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                                    <XAxis
                                      dataKey="recorded_at"
                                      tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      tick={{ fontSize: 11, fill: chartTextColor }}
                                    />
                                    <YAxis
                                      tick={{ fontSize: 11, fill: chartTextColor }}
                                      domain={['auto', 'auto']}
                                    />
                                    <Tooltip
                                      {...tooltipStyle}
                                      labelFormatter={(t) => new Date(t).toLocaleString()}
                                      formatter={(v) => [`${v}°C`, 'Temperature']}
                                    />
                                    <ReferenceLine y={sensorReport.min_temp_limit} stroke={chartAccentColor} strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Min Limit', fill: chartTextColor, fontSize: 10 }} />
                                    <ReferenceLine y={sensorReport.max_temp_limit} stroke={chartAccentColor} strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: 'Max Limit', fill: chartTextColor, fontSize: 10 }} />
                                    <Line
                                      type="monotone"
                                      dataKey="temperature"
                                      stroke={chartAccentColor}
                                      dot={false}
                                      strokeWidth={2.5}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {s.status !== 'DELIVERED' && <p style={{ color: 'var(--text-muted)', marginTop: '15px' }}>Delivery report will be available once the shipment is delivered.</p>}
                  </div>
                </div>
              ))}
          </div>
        )}
        {canExport && (
          <div className={styles.exportPanel}>
            <div className={styles.exportHeader}>
              <div>
                <div className={styles.exportTitle}>Export report bundle</div>
                <div className={styles.exportSub}>Neatly formatted for compliance and QA review.</div>
              </div>
              <div className={styles.exportBadge}>PDF</div>
            </div>
            <div className={styles.exportMeta}>
              <div>Window: last 6 months</div>
              <div>Includes: compliance, excursions, product summary</div>
            </div>
            <div className={styles.exportActions}>
              <Button variant="primary" onClick={handleExportPdf}>Export PDF Report</Button>
              <Button variant="ghost" onClick={handleExportPdf}>Print Preview</Button>
            </div>
          </div>
        )}
        <div className={styles.summaryCards}>
          {[
            {
              label: 'Active Shipments',
              value: complianceStats?.active_shipments ?? 0,
              color: 'var(--accent-blue)'
            },
            {
              label: 'Total Excursions',
              value: complianceStats?.total_excursions ?? 0,
              color: 'var(--accent-red)'
            },
            {
              label: 'Avg Compliance Rate',
              value: `${complianceStats?.compliance_percentage ?? 0}%`,
              color: 'var(--accent-green)'
            },
            {
              label: 'Total Readings',
              value: complianceStats?.total_readings ?? 0,
              color: 'var(--text-secondary)'
            },
          ].map(c => (
            <div key={c.label} className={styles.summaryCard}>
              <div className={styles.summaryLabel}>{c.label}</div>
              <div
                className={styles.summaryValue}
                style={{ color: c.color }}
              >
                {c.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CollapsibleChart title="Monthly Compliance Rate" badge="Line Chart">
            {compactMonthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={compactMonthlyData}
                  margin={{ top: 12, right: 8, bottom: 0, left: -20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartGridColor}
                  />

                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    tickCount={5}
                    tickFormatter={(value) => `${value}%`}
                  />

                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v) => [`${v}%`, 'Compliance']}
                  />

                  <Line
                    type="monotone"
                    dataKey="compliance"
                    stroke={chartComplianceColor}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: chartComplianceColor }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                No monthly compliance data available
              </div>
            )}
          </CollapsibleChart>

          <CollapsibleChart title="Excursions per Month" badge="Bar Chart">
            {compactMonthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={compactMonthlyData}
                  margin={{ top: 12, right: 8, bottom: 25, left: -20 }}
                >
                <CartesianGrid
  strokeDasharray="3 3"
  stroke={chartGridColor}
/>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    axisLine={false}
                    tickLine={false}
                    tickCount={4}
                  />

                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v) => [v, 'Excursions']}
                  />

                  <Bar
                    dataKey="excursions"
                    fill={chartMonthlyExcursionColor}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                No excursion data available
              </div>
            )}
          </CollapsibleChart>

          <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-card)', overflow: 'hidden' }}>
            <div className={styles.productHeader}>
              <span className={styles.productTitle}>Product Summary</span>
              <input
                className={styles.productSearch}
                type="search"
                placeholder="Search products..."
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
              />
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              {visibleProducts.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  No product summary data available
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Product</th><th>Avg Temp (°C)</th><th>Excursions</th><th>Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map(p => (
                      <tr key={p.product}>
                        <td>{p.product}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{p.avgTemp}°C</td>
                        <td style={{ color: p.excursions > 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>{p.excursions}</td>
                        <td style={{ color: p.excursions === 0 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
                          {p.excursions === 0 ? '100%' : '< 100%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
