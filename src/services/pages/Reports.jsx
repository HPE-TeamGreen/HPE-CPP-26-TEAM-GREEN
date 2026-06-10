import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/layout/Button';
import { useApp } from '../../context/AppContext';
import styles from './Reports.module.css';

const monthlyData = [
  { month: 'Nov', shipments: 18, excursions: 2, compliance: 89 },
  { month: 'Dec', shipments: 22, excursions: 4, compliance: 82 },
  { month: 'Jan', shipments: 20, excursions: 1, compliance: 95 },
  { month: 'Feb', shipments: 25, excursions: 3, compliance: 88 },
  { month: 'Mar', shipments: 28, excursions: 2, compliance: 93 },
  { month: 'Apr', shipments: 24, excursions: 3, compliance: 94 },
];

const productData = [
  { product: 'Vaccines', avgTemp: 5.2, excursions: 2 },
  { product: 'Insulin', avgTemp: 4.8, excursions: 0 },
  { product: 'Blood', avgTemp: 3.9, excursions: 1 },
  { product: 'Plasma', avgTemp: -17.5, excursions: 0 },
  { product: 'Reagents', avgTemp: 3.2, excursions: 0 },
  { product: 'Eye Drops', avgTemp: 18.2, excursions: 0 },
];

const tooltipStyle = {
  contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--text-secondary)' },
};

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
  const { can } = useApp();
  const canExport = can('exportReport');
  const [productQuery, setProductQuery] = useState('');

  const visibleProducts = productData.filter(p => {
    if (!productQuery.trim()) return true;
    return p.product.toLowerCase().includes(productQuery.toLowerCase());
  });

  const handleExportPdf = () => {
    const createdOn = new Date().toLocaleDateString();
    const totals = monthlyData.reduce((acc, row) => {
      acc.shipments += row.shipments;
      acc.excursions += row.excursions;
      acc.compliance += row.compliance;
      return acc;
    }, { shipments: 0, excursions: 0, compliance: 0 });
    const avgCompliance = monthlyData.length
      ? (totals.compliance / monthlyData.length).toFixed(1)
      : '0.0';

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
            @media print { body { margin: 18mm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>TempSafe Compliance Report</h1>
              <div class="meta">Generated on ${createdOn} · Window: last 6 months</div>
            </div>
            <div class="pill">PDF Export</div>
          </div>

          <div class="summary">
            <div class="card"><div class="label">Total Shipments</div><div class="value">${totals.shipments}</div></div>
            <div class="card"><div class="label">Total Excursions</div><div class="value">${totals.excursions}</div></div>
            <div class="card"><div class="label">Avg Compliance</div><div class="value">${avgCompliance}%</div></div>
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
                    <td>${row.month}</td>
                    <td class="right">${row.shipments}</td>
                    <td class="right">${row.excursions}</td>
                    <td class="right">${row.compliance}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
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

    const printWindow = window.open('', '', 'width=960,height=720');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Reports"
        subtitle="Analytics and compliance reporting"
      />
      <div className={styles.content}>
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
            { label: 'Total Shipments (6 months)', value: '137', color: 'var(--accent-blue)' },
            { label: 'Total Excursions', value: '15', color: 'var(--accent-red)' },
            { label: 'Avg Compliance Rate', value: '90.2%', color: 'var(--accent-green)' },
            { label: 'Avg Breach Duration', value: '22 min', color: 'var(--accent-yellow)' },
          ].map(c => (
            <div key={c.label} className={styles.summaryCard}>
              <div className={styles.summaryLabel}>{c.label}</div>
              <div className={styles.summaryValue} style={{ color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CollapsibleChart title="Monthly Compliance Rate" badge="Line Chart">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[75, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={v => [`${v}%`, 'Compliance']} />
                <Line type="monotone" dataKey="compliance" stroke="var(--accent-green)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-green)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CollapsibleChart>

          <CollapsibleChart title="Excursions per Month" badge="Bar Chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={v => [v, 'Excursions']} />
                <Bar dataKey="excursions" fill="var(--accent-red)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                <div className={styles.emptyState}>
                  <div className={styles.emptyTitle}>No products found.</div>
                  <div className={styles.emptySub}>Try a different search term.</div>
                  <Button variant="ghost" onClick={() => setProductQuery('')}>Clear search</Button>
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
