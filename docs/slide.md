# Shipment Service Integration (UI -> API -> DB)

- Shared client + service layer keeps API calls consistent and centralized.
- FastAPI enforces business rules (status transitions, validation) before DB writes.
- UI mapping preserves the existing model so screens did not need a rebuild.

```mermaid
flowchart LR
  UI[React UI\nDashboard / Shipments / New Shipment]
  CTX[AppContext\nLoad + Normalize]
  API[API Client\napiClient.js + shipmentService.js]
  FASTAPI[FastAPI Shipment Service\n/shipments, /shipments/{id}/status]
  DB[(PostgreSQL\nshipments, sensors)]

  UI --> CTX
  CTX --> API
  API --> FASTAPI
  FASTAPI --> DB
  DB --> FASTAPI
  FASTAPI --> API
  API --> CTX
  CTX --> UI
```
