# ColdChain Monitor — React UI

IoT temperature monitoring dashboard for cold chain compliance.

## Quick Start

```bash
# 1. Navigate into the project
cd coldchain

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
```

The app opens at **http://localhost:3000**

## Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Overview: metrics, shipments, alerts, excursions, temp chart |
| `/shipments` | Shipments | All shipments with live temp status |
| `/shipments/new` | Register Shipment | Form to create a new shipment |
| `/sensors` | Sensors | All registered IoT devices |
| `/sensors/new` | Register Device | Form to register a new sensor |
| `/alerts` | Alerts | All alerts with acknowledge actions |
| `/excursions` | Excursions | Open/closed incidents with resolution modal |
| `/reports` | Reports | Charts: compliance rate, excursions, product summary |
| `/users` | Users | Registered users by role |
| `/login` | Login | Auth screen (demo only) |

## Project Structure

```
src/
├── components/
│   └── layout/
│       ├── Layout.jsx          # App shell wrapper
│       ├── Sidebar.jsx         # Navigation sidebar
│       ├── PageHeader.jsx      # Reusable page header
│       ├── StatusBadge.jsx     # Color-coded status pill
│       └── Button.jsx          # Reusable button
├── context/
│   └── AppContext.jsx          # Global state (alerts, excursions)
├── data/
│   └── mockData.js             # Mock shipments, sensors, alerts
├── pages/
│   ├── Dashboard.jsx
│   ├── Shipments.jsx
│   ├── NewShipment.jsx
│   ├── Sensors.jsx
│   ├── NewSensor.jsx
│   ├── Alerts.jsx
│   ├── Excursions.jsx
│   ├── Reports.jsx
│   ├── Users.jsx
│   └── Login.jsx
└── styles/
    └── global.css              # Design tokens + global reset
```

## Roles
- `ADMIN` — Register shipments and devices
- `QA_OFFICER` — Acknowledge alerts, resolve excursions
- `COMPLIANCE_OFFICER` — View reports, history
- `MANAGER` — Monitor shipments, view alerts
