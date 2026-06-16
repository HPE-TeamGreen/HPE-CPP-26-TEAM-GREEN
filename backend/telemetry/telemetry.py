import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List

import asyncpg
import httpx
from aiokafka import AIOKafkaConsumer
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s] - %(message)s")
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/tempsafe")
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
SHIPMENT_API_URL = os.getenv("SHIPMENT_API_URL", "http://localhost:8000")

TELEMETRY_TOPIC = "telemetry-events"
CONSUMER_GROUP = "telemetry-db-writer-group"

CE_TYPE_ALERT_BREACH = "com.logistics.telemetry.alert.temperature_breach"
CE_TYPE_BUFFERED = "com.logistics.telemetry.reading.buffered"

_sensor_cache: dict[str, dict] = {}

# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class TelemetryReadingResponse(BaseModel):
    event_id: str
    sensor_id: str
    shipment_id: str
    event_type: str
    recorded_at: datetime
    temperature: float
    latitude: Optional[float]
    longitude: Optional[float]
    is_excursion: bool
    is_buffered: bool

class AlertResponse(BaseModel):
    alert_id: str
    reading_event_id: str
    sensor_id: str
    shipment_id: str
    temperature: float
    min_temp_limit: float
    max_temp_limit: float
    origin: Optional[str]
    destination: Optional[str]
    recorded_at: datetime
    is_buffered: bool
    acknowledged: bool
    created_at: datetime

class ExcursionResponse(BaseModel):
    excursion_id: str
    shipment_id: str
    sensor_id: str
    breach_time: datetime
    recorded_temp: float
    status: str
    acknowledged_by: Optional[str]
    resolution_note: Optional[str]
    created_at: datetime

class ExcursionResolve(BaseModel):
    resolution_note: str

# -----------------------------------------------------------------------------
# Worker Functions
# -----------------------------------------------------------------------------
async def refresh_cache():
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{SHIPMENT_API_URL}/sensors/active", timeout=5.0)
            resp.raise_for_status()
            _sensor_cache.clear()
            for s in resp.json():
                _sensor_cache[s["sensor_id"]] = s
            logger.info(f"Sensor cache refreshed — {len(_sensor_cache)} active sensors.")
        except Exception as exc:
            logger.error(f"Cache refresh failed: {exc}")

async def setup_db(pool: asyncpg.Pool):
    async with pool.acquire() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_readings (
                event_id     UUID         NOT NULL,
                sensor_id    VARCHAR(50)  NOT NULL,
                shipment_id  VARCHAR(100) NOT NULL,
                event_type   VARCHAR(100) NOT NULL,
                recorded_at  TIMESTAMPTZ  NOT NULL,
                temperature  FLOAT        NOT NULL,
                latitude     FLOAT,
                longitude    FLOAT,
                is_excursion BOOLEAN      NOT NULL DEFAULT FALSE,
                is_buffered  BOOLEAN      NOT NULL DEFAULT FALSE,
                ingested_at  TIMESTAMPTZ  DEFAULT NOW(),
                PRIMARY KEY (event_id, ingested_at)
            );
        """)
        
        await conn.execute("""
            SELECT create_hypertable('telemetry_readings', 'ingested_at', if_not_exists => TRUE);
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                alert_id         UUID         PRIMARY KEY,
                reading_event_id UUID         NOT NULL,
                sensor_id        VARCHAR(50)  NOT NULL,
                shipment_id      VARCHAR(100) NOT NULL,
                temperature      FLOAT        NOT NULL,
                min_temp_limit   FLOAT        NOT NULL,
                max_temp_limit   FLOAT        NOT NULL,
                origin           VARCHAR(100),
                destination      VARCHAR(100),
                recorded_at      TIMESTAMPTZ  NOT NULL,
                is_buffered      BOOLEAN      NOT NULL DEFAULT FALSE,
                acknowledged     BOOLEAN      NOT NULL DEFAULT FALSE,
                created_at       TIMESTAMPTZ  DEFAULT NOW()
            );
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS excursion_events (
                excursion_id    UUID         PRIMARY KEY,
                shipment_id     VARCHAR(100) NOT NULL,
                sensor_id       VARCHAR(50)  NOT NULL,
                breach_time     TIMESTAMPTZ  NOT NULL,
                recorded_temp   FLOAT        NOT NULL,
                status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
                acknowledged_by VARCHAR(100),
                resolution_note TEXT,
                created_at      TIMESTAMPTZ  DEFAULT NOW()
            );
        """)
    logger.info("DB schema ready.")

async def process_batch(batch, pool: asyncpg.Pool, consumer: AIOKafkaConsumer):
    readings = []
    alerts = []
    excursions = []

    for msg in batch:
        try:
            ce        = json.loads(msg.value.decode("utf-8"))
            sensor_id = ce["source"].removeprefix("urn:sensor:")
            data      = ce["data"]
            temp      = data["temperature"]
            gps       = data.get("gps", {})
        except Exception as exc:
            logger.error(f"Bad message offset {msg.offset}: {exc}")
            continue

        info = _sensor_cache.get(sensor_id)
        if info is None:
            await refresh_cache()
            info = _sensor_cache.get(sensor_id)
        if info is None:
            logger.warning(f"Unknown sensor {sensor_id} — skipping.")
            continue

        is_excursion = (
            ce["type"] == CE_TYPE_ALERT_BREACH
            or temp < info["min_temp_limit"]
            or temp > info["max_temp_limit"]
        )
        is_buffered = ce["type"] == CE_TYPE_BUFFERED
        
        event_id = uuid.UUID(ce["id"])
        recorded_at = datetime.fromisoformat(ce["time"])

        readings.append((
            event_id, sensor_id, info["shipment_id"], ce["type"],
            recorded_at, temp, gps.get("latitude"), gps.get("longitude"),
            is_excursion, is_buffered,
        ))
        
        if is_excursion:
            alert_id = uuid.uuid4()
            alerts.append((
                alert_id, event_id, sensor_id, info["shipment_id"],
                temp, info["min_temp_limit"], info["max_temp_limit"],
                info["origin"], info["destination"], recorded_at, is_buffered
            ))
            
            excursion_id = uuid.uuid4()
            excursions.append((
                excursion_id, info["shipment_id"], sensor_id,
                recorded_at, temp, 'OPEN'
            ))

    if not readings:
        return

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.executemany("""
                    INSERT INTO telemetry_readings
                        (event_id, sensor_id, shipment_id, event_type,
                         recorded_at, temperature, latitude, longitude,
                         is_excursion, is_buffered)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                    ON CONFLICT (event_id, ingested_at) DO NOTHING;
                """, readings)
                
                if alerts:
                    await conn.executemany("""
                        INSERT INTO alerts
                            (alert_id, reading_event_id, sensor_id, shipment_id,
                             temperature, min_temp_limit, max_temp_limit,
                             origin, destination, recorded_at, is_buffered)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                        ON CONFLICT DO NOTHING;
                    """, alerts)
                    
                if excursions:
                    await conn.executemany("""
                        INSERT INTO excursion_events
                            (excursion_id, shipment_id, sensor_id, breach_time,
                             recorded_temp, status)
                        VALUES ($1,$2,$3,$4,$5,$6)
                        ON CONFLICT DO NOTHING;
                    """, excursions)
                    
        await consumer.commit()
        logger.info(f"✅ Stored {len(readings)} records, {len(alerts)} alerts, {len(excursions)} excursions.")
    except Exception as exc:
        logger.error(f"DB write failed — offset not committed, Kafka will re-deliver. {exc}")

async def consume_kafka(app_state):
    consumer = AIOKafkaConsumer(
        TELEMETRY_TOPIC,
        bootstrap_servers=KAFKA_BROKER,
        group_id=CONSUMER_GROUP,
        enable_auto_commit=False,
        auto_offset_reset="earliest",
    )
    await consumer.start()
    logger.info(f"Listening on '{TELEMETRY_TOPIC}'...")
    try:
        while True:
            raw = await consumer.getmany(timeout_ms=1000, max_records=500)
            for _tp, messages in raw.items():
                if messages:
                    await process_batch(messages, app_state["pool"], consumer)
    except asyncio.CancelledError:
        pass
    except Exception as exc:
        logger.error(f"Consumer error: {exc}")
    finally:
        await consumer.stop()

# -----------------------------------------------------------------------------
# FastAPI App
# -----------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    app.state.pool = pool
    await setup_db(pool)
    await refresh_cache()

    async def cache_loop():
        while True:
            await asyncio.sleep(60)
            await refresh_cache()

    cache_task = asyncio.create_task(cache_loop())
    kafka_task = asyncio.create_task(consume_kafka({"pool": pool}))
    
    yield
    
    cache_task.cancel()
    kafka_task.cancel()
    await asyncio.gather(cache_task, kafka_task, return_exceptions=True)
    await pool.close()
    logger.info("Shutdown complete.")

app = FastAPI(title="TempSafe Telemetry Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "telemetry-microservice"}

@app.get("/telemetry/latest", response_model=List[TelemetryReadingResponse], tags=["Telemetry"])
async def get_latest_telemetry(sensor_id: str, limit: int = 10):
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT event_id, sensor_id, shipment_id, event_type, recorded_at,
                   temperature, latitude, longitude, is_excursion, is_buffered
            FROM telemetry_readings
            WHERE sensor_id = $1
            ORDER BY recorded_at DESC
            LIMIT $2
        """, sensor_id, limit)
        return [dict(r) for r in rows][::-1]

@app.get("/telemetry/history", response_model=List[TelemetryReadingResponse], tags=["Telemetry"])
async def get_telemetry_history(sensor_id: str = None, shipment_id: str = None, start_time: str = None, end_time: str = None):
    query = "SELECT * FROM telemetry_readings WHERE 1=1"
    params = []
    idx = 1
    if sensor_id:
        query += f" AND sensor_id = ${idx}"; params.append(sensor_id); idx += 1
    if shipment_id:
        query += f" AND shipment_id = ${idx}"; params.append(shipment_id); idx += 1
    if start_time:
        query += f" AND recorded_at >= ${idx}"; params.append(datetime.fromisoformat(start_time)); idx += 1
    if end_time:
        query += f" AND recorded_at <= ${idx}"; params.append(datetime.fromisoformat(end_time)); idx += 1
    
    query += " ORDER BY recorded_at ASC LIMIT 500"
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]

@app.get("/alerts", response_model=List[AlertResponse], tags=["Alerts"])
async def list_alerts(acknowledged: bool = None):
    query = "SELECT * FROM alerts"
    params = []
    if acknowledged is not None:
        query += " WHERE acknowledged = $1"
        params.append(acknowledged)
    query += " ORDER BY created_at DESC"
    
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]

@app.patch("/alerts/{alert_id}/acknowledge", response_model=AlertResponse, tags=["Alerts"])
async def acknowledge_alert(alert_id: str):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE alerts SET acknowledged = TRUE WHERE alert_id = $1 RETURNING *
        """, uuid.UUID(alert_id))
        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")
        return dict(row)

@app.patch("/alerts/acknowledge-all", tags=["Alerts"])
async def acknowledge_all_alerts():
    async with app.state.pool.acquire() as conn:
        await conn.execute("UPDATE alerts SET acknowledged = TRUE WHERE acknowledged = FALSE")
        return {"status": "ok"}

@app.get("/excursions", response_model=List[ExcursionResponse], tags=["Excursions"])
async def list_excursions(status_filter: str = None):
    query = "SELECT * FROM excursion_events"
    params = []
    if status_filter:
        query += " WHERE status = $1"
        params.append(status_filter)
    query += " ORDER BY created_at DESC"
    
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]

@app.patch("/excursions/{excursion_id}/resolve", response_model=ExcursionResponse, tags=["Excursions"])
async def resolve_excursion(excursion_id: str, payload: ExcursionResolve):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE excursion_events SET status = 'CLOSED', resolution_note = $2
            WHERE excursion_id = $1 RETURNING *
        """, uuid.UUID(excursion_id), payload.resolution_note)
        if not row:
            raise HTTPException(status_code=404, detail="Excursion not found")
        return dict(row)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)