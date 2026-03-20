#  Cloud Native Temperature Excursion and Compliance Platform

---

##  Team Members

* Riya Pai
* Shaamak
* Russel
* Ronak
* Pranav

---

##  Objective

To develop a cloud-native platform that monitors temperature data from IoT devices in real-time, detects temperature excursions, and ensures compliance through alerts and reporting.

---

##  System Overview

The system follows a **microservices architecture** with **event-driven communication using Apache Kafka**.

Main components:

* Shipment Service
* Simulation Service
* Telemetry Service
* Excursion Detection Service
* Alert Management Service
* Reporting Service
* Dashboard Service

 The system processes IoT temperature data and provides real-time monitoring, alerts, and reports.

---

##  Architecture & Data Flow

* IoT devices generate temperature data (JSON format)
* Data is sent to API (Telemetry Ingestion)
* Published to Kafka topic (`telemetry-events`)
* Services consume and process data
* Excursions are detected and alerts generated
* Data stored in databases
* Dashboard displays real-time information

 Refer System Flow & Data Flow Diagram 

---

##  Modules

### 1. Shipment Management

* Create shipments
* Assign sensors
* Define temperature limits
* Update shipment status

### 2. Simulation Service

* Generate IoT temperature data
* Simulate real-time behavior
* Publish data to Kafka

### 3. Telemetry Service

* Consume Kafka data
* Validate and store readings
* Optimize DB writes

### 4. Excursion Detection

* Compare temperature with limits
* Detect violations
* Publish excursion events

### 5. Alert Management

* Generate alerts (Warning / Critical)
* Store alerts
* Provide API for dashboard

### 6. Reporting Service

* Generate reports (avg temp, excursions)
* Provide analytics

### 7. Dashboard

* Display real-time data
* Show alerts and reports

---

##  Technologies Used

* Apache Kafka (event streaming)
* FastAPI (API layer)
* Kubernetes
* TimeScaleDB (time-series DB)
* React (frontend dashboard)

---

##  Security

* JWT-based authentication
* Role-based access:

  * Client
  * QA Officer
  * Compliance Officer

---

##  Weekly Progress

### Week 1

* Project idea discussion and problem understanding
* Identified stakeholders and actors (Logistics Manager, QA Officer, etc.) 
* Requirement analysis (functional & non-functional)
* Designed database schema
* Created:

  * Use Case Diagram
  * Activity Diagram
  * Data Flow Diagram

---

### Week 2

* Designed complete microservices architecture
* Defined working of all services 
* Implemented system flow design (end-to-end pipeline)
* Studied Apache Kafka concepts:

  * Producer–Consumer model
  * Event-driven communication
* Studied Kafka topics:

  * telemetry-events
  * excursion-events
* Studied databases:

  * TimeScaleDB
  * PostgreSQL
* Understood authentication flow (JWT, roles)

---

##  Current Status

Project is in **design and architecture phase**.
System flow, modules, and communication are defined.
Implementation has not yet started.

---

##  Work In Progress

* Learning Apache Kafka setup
* Planning IoT simulation
* Preparing backend implementation
* Working with Kubernetes

---

##  Next Steps

* Setup Kafka environment
* Create topics (`telemetry-events`, `excursion-events`)
* Implement simulation service
* Start backend API development
* Integrate services with Kafka

---
