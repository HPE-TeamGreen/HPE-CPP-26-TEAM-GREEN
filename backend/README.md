# Minimal FastAPI Shipment Service

This is a minimal FastAPI backend that matches the React UI integration.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Configure

Copy the example env file and update values as needed:

```bash
copy .env.example .env
```

If you already have a .env, ensure DATABASE_URL uses the psycopg driver:

```text
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/tempsafe
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

If you want the telemetry simulator running alongside the API, start it from a second terminal:

```bash
python simulator.py
```

The simulator fetches active sensors from `GET /sensors/active` and publishes CloudEvents-style telemetry to Kafka so downstream services can stay in sync with the frontend route and temperature cards.

## Endpoints

- `GET /health`
- `GET /shipments`
- `POST /shipments`
- `PATCH /shipments/{shipment_id}/status`
- `GET /shipments/{shipment_id}/sensors`
- `POST /shipments/{shipment_id}/sensors`
- `GET /sensors/active`
