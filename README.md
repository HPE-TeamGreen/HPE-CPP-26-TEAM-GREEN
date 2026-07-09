# TempSafe — Cold Chain Temperature Excursion & Compliance Platform

TempSafe is a cloud-native monitoring solution for refrigerated logistics. It ingests IoT temperature telemetry, identifies shipment-specific excursions, generates alerts, and delivers compliance reporting through a React-based analyst dashboard.

---

## Table of Contents

* [The Problem](#the-problem)
* [What "Good" Means](#what-good-means)
* [System Architecture](#system-architecture)
* [Processing Pipeline](#processing-pipeline)
* [Architecture Diagram](#architecture-diagram)
* [Core Modules](#core-modules)
* [Technology Stack](#technology-stack)
* [Quickstart](#quickstart)
* [Demo Setup](#demo-setup)
* [Current Status](#current-status)
* [Roadmap](#roadmap)
* [Team](#team)

---

## The Problem

Cold-chain logistics generate continuous streams of temperature telemetry from many distributed sensors. Manual monitoring is inefficient and often misses important deviations due to the scale and complexity of the data.

Key challenges include:

* 📈 There is too much data to inspect manually.
* 🔇 Most readings are normal, so real issues can be missed.
* 🧊 Each shipment has its own temperature limits.
* 🔗 Events must be correlated across sensors and shipment timelines.
* 📊 Compliance needs accurate alert history and reports.

---

## What "Good" Means

### Functional Requirements

* Ingest telemetry from IoT sensors or synthetic simulation.
* Detect temperature excursions per shipment profile.
* Publish alerts for warning and critical violations.
* Store telemetry and excursion state in PostgreSQL.
* Expose analytics through a dashboard API.
* Support shipment and sensor registration workflows.

### Non-Functional Requirements

* Event-driven microservices architecture.
* Kafka-backed stream processing.
* Kubernetes deployment manifests.
* Modular services with clear separation of concerns.
* Resilient and extensible for production-style workflows.
* Analyst-facing dashboard with alert and report views.

---

## Architecture

This repository is organized into backend services, a frontend UI, and Kubernetes deployment manifests.

### Backend Services

* `backend/simulator` — synthetic sensor data generation.
* `backend/telemetry` — telemetry ingestion and Kafka publishing.
* `backend/shipment` — shipment lifecycle, sensor registration, and status management.
* `backend/reporting` — reporting API for telemetry history and excursion analytics.

### Frontend

* `frontend` — React dashboard application with routes for shipments, sensors, alerts, excursions, and reports.

### Infrastructure

Kubernetes manifests live under `k8s/`:

* `k8s/infra/kafka.yaml`
* `k8s/infra/postgres.yaml`
* `k8s/backend/shipment.yaml`
* `k8s/backend/reporting.yaml`
* `k8s/backend/telemetry.yaml`
* `k8s/backend/simulator.yaml`
* `k8s/namespaces/namespaces.yaml`

---

## Architecture Diagram

See the system architecture diagram in [`ARCHITECTURE.md`](ARCHITECTURE.md) for a visual overview of TempSafe data flow and service interaction.

---

## Processing Pipeline

1. Synthetic or real sensor data is generated.
2. Telemetry service validates payloads and publishes Kafka events.
3. Downstream consumers detect excursions against configured min/max limits.
4. Alert events are persisted to PostgreSQL.
5. Reporting APIs expose historical telemetry and excursion analytics.
6. Frontend dashboard presents the live state and compliance summary.

---

## Core Modules

### 1. Shipment Management

* Create and manage shipments.
* Assign sensors and temperature profiles.
* Track shipment status and lifecycle.

### 2. Simulation Service

* Generate realistic cold-chain telemetry.
* Publish telemetry for demo and testing.

### 3. Telemetry Ingestion

* Validate sensor payloads.
* Publish telemetry to Kafka for downstream processing.

### 4. Excursion Detection

* Compare readings against shipment limits.
* Detect and flag excursion events.
* Promote alerts to critical when thresholds breach.

### 5. Alert Management

* Persist excursions and alert history.
* Offer alert APIs consumed by the dashboard.

### 6. Reporting

* Query telemetry history.
* Aggregate excursions and compliance metrics.
* Power dashboard analytics and audit reports.

### 7. Dashboard

* React UI for operations and compliance.
* Visualizes shipments, sensors, alerts, excursions, and reports.
* Supports role-aware access for operators and auditors.

---

## Technology Stack

* Apache Kafka — stream processing
* FastAPI — backend services
* PostgreSQL — persistence
* React — dashboard UI
* Kubernetes — deployment
* Docker — containerization

---

## Quickstart

```bash
# 1. Install frontend dependencies
cd frontend
npm install
npm start
```

Open the dashboard at `http://localhost:3000`.

For backend services and infrastructure, deploy the manifests in `k8s/` or run each service locally using the FastAPI apps in `backend/`.

Recommended startup sequence:

1. Start PostgreSQL and Kafka using your local environment or Kubernetes manifests in `k8s/infra`.
2. Launch backend services under `backend/`.
3. Seed demo shipments and sensors with `python scripts/seed_demo_data.py`.
4. Start the frontend UI.

---

## Demo Setup

Use `scripts/seed_demo_data.py` to populate demo shipments, sensors, and status data for the dashboard.

---

## Current Status

* Service design and responsibilities are defined.
* Backend templates exist for telemetry, shipment, simulator, and reporting.
* Frontend dashboard scaffold is complete.
* Kubernetes manifests cover infra and service deployment.

---

## Roadmap

* Complete backend ingestion and alerting flows.
* Wire Kafka topics for telemetry and excursion processing.
* Integrate frontend with live backend APIs.
* Add end-to-end testing and demo data automation.
* Harden deployment for Kubernetes and local development.

---

## Team

* Riya Pai
* Shaamak Madhwaraj Bolar
* Russel Mendes
* Pranav Purushotham Nayak
* Ronak Shetty

---

## Repository Notes

This project is built as a cold-chain monitoring platform with a strong focus on excursion detection, alerting, and compliance reporting. It is designed to grow into richer analytics and sensor correlation over time.

