# TempSafe Architecture

This diagram shows the high-level architecture for TempSafe, including telemetry ingestion, backend services, storage, and the dashboard.

```mermaid
flowchart LR
    subgraph Sources [IoT & Demo Sources]
        S1[IoT Sensors]
        S2[Simulator / Demo Data]
        S3[Analyst Uploads]
    end

    subgraph Platform [TempSafe Platform]
        T["Telemetry Service<br/>validate, normalize, publish"]
        K["Kafka Topics<br/>telemetry-events"]
        D["Shipment Service<br/>manage shipments, sensors"]
        R["Reporting Service<br/>query analytics, alerts"]
        P[(PostgreSQL)]
    end

    subgraph Frontend [React Dashboard]
        F["Dashboard UI<br/>status, alerts, reports"]
    end

    S1 --> T
    S2 --> T
    S3 --> T
    T --> K
    T --> P
    K --> R
    D --> P
    R --> P
    F --> R
    F --> P
    F --> D
```

### Diagram notes

* `Telemetry Service` ingests sensor and demo telemetry data, normalizes it, and publishes it to Kafka.
* `Kafka` acts as the streaming bus for downstream analytics and alerting.
* `Shipment Service` manages shipment state, sensor assignments, and temperature limits.
* `Reporting Service` reads from Kafka/PostgreSQL and provides dashboard APIs.
* `PostgreSQL` stores telemetry, alerts, excursions, and shipment metadata.
* `React Dashboard` visualizes shipment status, excursions, alerts, and analytics.
