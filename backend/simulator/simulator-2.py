import asyncio
import json
import logging
import math
import os
import random
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

import aiohttp
from aiokafka import AIOKafkaProducer


logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s] - %(message)s")
logger = logging.getLogger(__name__)


KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "telemetry-events")
SHIPMENT_API_URL = os.getenv("SHIPMENT_API_URL", "http://localhost:8000/sensors/active")
SHIPMENT_API_BASE_URL = os.getenv("SHIPMENT_API_BASE_URL", "http://localhost:8000")
POLL_INTERVAL_SECONDS = float(os.getenv("SIMULATOR_POLL_INTERVAL_SECONDS", "10"))
REFRESH_INTERVAL_SECONDS = float(os.getenv("SIMULATOR_REFRESH_INTERVAL_SECONDS", "30"))
BUFFER_LIMIT = int(os.getenv("SIMULATOR_BUFFER_LIMIT", "12"))
ENABLE_NO_SIGNAL = os.getenv("SIMULATOR_ENABLE_NO_SIGNAL", "true").lower() == "true"

# --- Geo-navigation settings ---
# How many degrees of lat/lng the sensor moves per simulation tick toward destination.
STEP_DEGREES = float(os.getenv("SIMULATOR_STEP_DEGREES", "1.0"))
# If the sensor is within this many km of the destination, it is considered "arrived".
ARRIVAL_THRESHOLD_KM = float(os.getenv("SIMULATOR_ARRIVAL_THRESHOLD_KM", "5.0"))

CE_TYPE_READING = "com.logistics.telemetry.reading"
CE_TYPE_ALERT_BREACH = "com.logistics.telemetry.alert.temperature_breach"
CE_TYPE_BUFFERED = "com.logistics.telemetry.reading.buffered"

CITY_COORDS = {
    "Mangaluru Warehouse": {"lat": 12.9141, "lng": 74.8560},
    "Bengaluru Hub": {"lat": 12.9716, "lng": 77.5946},
    "Mysuru Distribution": {"lat": 12.2958, "lng": 76.6394},
    "Udupi Port": {"lat": 13.3409, "lng": 74.7421},
    "Hubballi Storage": {"lat": 15.3647, "lng": 75.1240},
    "Chennai Central": {"lat": 13.0827, "lng": 80.2707},
    "Mumbai Docks": {"lat": 19.0760, "lng": 72.8777},
}


@dataclass
class SensorContext:
    sensor_id: str
    shipment_id: str
    origin: str
    destination: str
    min_temp_limit: float
    max_temp_limit: float
    product: str
    lat: float | None
    lng: float | None
    current_temp: float
    dest_lat: float | None = None
    dest_lng: float | None = None


DEFAULT_SENSOR_PROFILES = {
    "S-03": {"product": "Plasma", "current_temp": -17.5, "lat": 12.9716, "lng": 77.5946},
    "S-05": {"product": "Eye Drops", "current_temp": 18.2, "lat": 19.0760, "lng": 72.8777},
    "S-07": {"product": "Blood", "current_temp": 7.8, "lat": 18.5204, "lng": 73.8567},
    "S-09": {"product": "Insulin", "current_temp": 5.1, "lat": 13.0827, "lng": 80.2707},
    "S-11": {"product": "Reagents", "current_temp": 3.2, "lat": 22.5726, "lng": 88.3639},
    "S-14": {"product": "Vaccines", "current_temp": 9.4, "lat": 28.6139, "lng": 77.2090},
}


def build_default_profile(sensor_id: str, origin: str, destination: str, min_temp: float, max_temp: float) -> SensorContext:
    profile = DEFAULT_SENSOR_PROFILES.get(sensor_id, {})
    fallback_temp = round((min_temp + max_temp) / 2, 1)
    origin_coords = CITY_COORDS.get(origin)
    destination_coords = CITY_COORDS.get(destination)

    # Starting position: use origin city coords so the sensor visually departs from the origin.
    # Falls back to profile defaults, then destination coords if origin is unknown.
    start_lat = origin_coords["lat"] if origin_coords else profile.get("lat", destination_coords["lat"] if destination_coords else None)
    start_lng = origin_coords["lng"] if origin_coords else profile.get("lng", destination_coords["lng"] if destination_coords else None)

    # Destination position: used for directional navigation.
    dest_lat = destination_coords["lat"] if destination_coords else None
    dest_lng = destination_coords["lng"] if destination_coords else None

    return SensorContext(
        sensor_id=sensor_id,
        shipment_id="",
        origin=origin,
        destination=destination,
        min_temp_limit=min_temp,
        max_temp_limit=max_temp,
        product=profile.get("product", "Unknown"),
        lat=start_lat,
        lng=start_lng,
        current_temp=float(profile.get("current_temp", fallback_temp)),
        dest_lat=dest_lat,
        dest_lng=dest_lng,
    )


async def fetch_active_sensor_contexts(session: aiohttp.ClientSession) -> list[SensorContext]:
    logger.info("Fetching active sensors from %s", SHIPMENT_API_URL)
    try:
        async with session.get(SHIPMENT_API_URL) as response:
            if response.status != 200:
                logger.error("Failed to fetch sensors: HTTP %s", response.status)
                return []

            payload = await response.json()
            contexts: list[SensorContext] = []
            for item in payload:
                sensor_id = item.get("sensor_id")
                shipment_id = item.get("shipment_id")
                origin = item.get("origin", "")
                destination = item.get("destination", "")
                min_temp = float(item.get("min_temp_limit", 0))
                max_temp = float(item.get("max_temp_limit", 0))
                base = build_default_profile(sensor_id, origin, destination, min_temp, max_temp)
                base.sensor_id = sensor_id
                base.shipment_id = shipment_id
                base.origin = origin
                base.destination = destination
                base.min_temp_limit = min_temp
                base.max_temp_limit = max_temp
                contexts.append(base)

            logger.info("Found %d active sensors: %s", len(contexts), [c.sensor_id for c in contexts])
            return contexts
    except Exception as exc:
        logger.error("Error connecting to Shipment API: %s", exc)
        return []


def build_cloud_event(event_type: str, sensor: SensorContext, data: dict) -> dict:
    return {
        "specversion": "1.0",
        "id": str(uuid.uuid4()),
        "source": f"urn:sensor:{sensor.sensor_id}",
        "type": event_type,
        "datacontenttype": "application/json",
        "time": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }


def build_telemetry_payload(sensor: SensorContext, temperature: float, latitude: float | None, longitude: float | None) -> dict:
    payload = {
        "sensor_id": sensor.sensor_id,
        "shipment_id": sensor.shipment_id,
        "origin": sensor.origin,
        "destination": sensor.destination,
        "product": sensor.product,
        "status": "IN_TRANSIT",
        "min_temp_limit": sensor.min_temp_limit,
        "max_temp_limit": sensor.max_temp_limit,
        "current_temp": round(temperature, 2),
        "temperature": round(temperature, 2),
        "lat": round(latitude, 4) if latitude is not None else None,
        "lng": round(longitude, 4) if longitude is not None else None,
        "gps": {
            "latitude": round(latitude, 4) if latitude is not None else None,
            "longitude": round(longitude, 4) if longitude is not None else None,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return payload


def haversine_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate the great-circle distance (km) between two lat/lng points."""
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def mark_shipment_delivered(session: aiohttp.ClientSession, shipment_id: str) -> bool:
    """Call PATCH /shipments/{id}/status to transition shipment to DELIVERED."""
    url = f"{SHIPMENT_API_BASE_URL}/shipments/{shipment_id}/status"
    try:
        async with session.patch(url, json={"new_status": "DELIVERED"}) as resp:
            if resp.status == 200:
                logger.info("Shipment %s marked as DELIVERED via API.", shipment_id)
                return True
            else:
                body = await resp.text()
                logger.error("Failed to mark shipment %s as DELIVERED: HTTP %s — %s", shipment_id, resp.status, body)
                return False
    except Exception as exc:
        logger.error("Error calling shipment API for %s: %s", shipment_id, exc)
        return False


async def publish(producer: AIOKafkaProducer, event_type: str, sensor: SensorContext, data: dict):
    event = build_cloud_event(event_type, sensor, data)
    await producer.send_and_wait(KAFKA_TOPIC, json.dumps(event).encode("utf-8"))


async def sensor_worker(sensor: SensorContext, producer: AIOKafkaProducer):
    logger.info("[%s] Worker started  %s → %s", sensor.sensor_id, sensor.origin, sensor.destination)

    current_temp = sensor.current_temp
    latitude = sensor.lat
    longitude = sensor.lng
    dest_lat = sensor.dest_lat
    dest_lng = sensor.dest_lng
    local_buffer: list[dict] = []
    offline = False
    has_destination = dest_lat is not None and dest_lng is not None

    if has_destination and latitude is not None and longitude is not None:
        total_km = haversine_distance_km(latitude, longitude, dest_lat, dest_lng)
        logger.info("[%s] Navigating %.1f km from (%.4f, %.4f) → (%.4f, %.4f)",
                    sensor.sensor_id, total_km, latitude, longitude, dest_lat, dest_lng)
    else:
        logger.warning("[%s] No valid destination coords — falling back to random walk", sensor.sensor_id)

    try:
        while True:
            # --- Temperature simulation (unchanged) ---
            state = "NORMAL"
            roll = random.random()
            if ENABLE_NO_SIGNAL and roll < 0.05:
                state = "NO_SIGNAL"
            elif roll < 0.1:
                state = "FRIDGE_BROKE"

            if state == "FRIDGE_BROKE":
                current_temp += random.uniform(1.4, 2.8)
                logger.warning("[%s] Temperature spike to %.2fC", sensor.sensor_id, current_temp)
            else:
                current_temp += random.uniform(-0.15, 0.15)

            # --- GPS movement: directional toward destination ---
            if has_destination and latitude is not None and longitude is not None:
                d_lat = dest_lat - latitude
                d_lng = dest_lng - longitude
                coord_dist = math.sqrt(d_lat ** 2 + d_lng ** 2)

                if coord_dist > 0:
                    # Clamp step so we don't overshoot the destination
                    step = min(STEP_DEGREES, coord_dist)
                    # Unit vector toward destination
                    u_lat = d_lat / coord_dist
                    u_lng = d_lng / coord_dist
                    latitude += u_lat * step + random.uniform(-0.002, 0.002)
                    longitude += u_lng * step + random.uniform(-0.002, 0.002)
            else:
                # Fallback: original random-walk jitter for sensors without destination coords
                if latitude is not None:
                    latitude += random.uniform(-0.0005, 0.0005)
                if longitude is not None:
                    longitude += random.uniform(-0.0005, 0.0005)

            payload = build_telemetry_payload(sensor, current_temp, latitude, longitude)
            event_type = CE_TYPE_ALERT_BREACH if (
                current_temp < sensor.min_temp_limit or current_temp > sensor.max_temp_limit or state == "FRIDGE_BROKE"
            ) else CE_TYPE_READING

            if state == "NO_SIGNAL":
                if not offline:
                    logger.info("[%s] Signal lost, buffering telemetry", sensor.sensor_id)
                offline = True
                local_buffer.append(payload)
                if len(local_buffer) > BUFFER_LIMIT:
                    local_buffer.pop(0)
            else:
                if offline:
                    logger.info("[%s] Signal restored, flushing %d buffered readings", sensor.sensor_id, len(local_buffer))
                    for buffered_payload in local_buffer:
                        await publish(producer, CE_TYPE_BUFFERED, sensor, buffered_payload)
                    local_buffer.clear()
                    offline = False

                await publish(producer, event_type, sensor, payload)

            # --- Arrival detection ---
            if has_destination and latitude is not None and longitude is not None:
                remaining_km = haversine_distance_km(latitude, longitude, dest_lat, dest_lng)
                if remaining_km <= ARRIVAL_THRESHOLD_KM:
                    logger.info(
                        "[%s] ✅ ARRIVED at %s (%.1f km from destination). Marking shipment %s as DELIVERED.",
                        sensor.sensor_id, sensor.destination, remaining_km, sensor.shipment_id,
                    )
                    # Send one final telemetry reading snapped to the exact destination
                    final_payload = build_telemetry_payload(sensor, current_temp, dest_lat, dest_lng)
                    await publish(producer, CE_TYPE_READING, sensor, final_payload)

                    async with aiohttp.ClientSession() as session:
                        await mark_shipment_delivered(session, sensor.shipment_id)
                    # Break the loop — the refresh cycle will also clean up this worker
                    # since the sensor will no longer appear in /sensors/active.
                    break

            await asyncio.sleep(POLL_INTERVAL_SECONDS)
    except asyncio.CancelledError:
        logger.info("[%s] Worker shutting down", sensor.sensor_id)
        if local_buffer:
            for buffered_payload in local_buffer:
                await publish(producer, CE_TYPE_BUFFERED, sensor, buffered_payload)
        raise


async def refresh_sensor_workers(active_tasks: dict[str, asyncio.Task], producer: AIOKafkaProducer):
    # Clean up tasks that finished naturally (e.g. sensor arrived at destination)
    for sensor_id in list(active_tasks):
        if active_tasks[sensor_id].done():
            logger.info("Cleaning up completed worker for sensor %s", sensor_id)
            del active_tasks[sensor_id]

    async with aiohttp.ClientSession() as session:
        active_contexts = await fetch_active_sensor_contexts(session)

    active_ids = {sensor.sensor_id for sensor in active_contexts}

    for sensor_id in list(active_tasks):
        if sensor_id not in active_ids:
            logger.info("Stopping worker for inactive sensor %s", sensor_id)
            active_tasks[sensor_id].cancel()
            del active_tasks[sensor_id]

    for sensor in active_contexts:
        if sensor.sensor_id not in active_tasks:
            active_tasks[sensor.sensor_id] = asyncio.create_task(sensor_worker(sensor, producer))
            logger.info("Started worker for sensor %s (%s -> %s)", sensor.sensor_id, sensor.origin, sensor.destination)


async def main():
    logger.info("Starting telemetry simulator")
    logger.info("Kafka broker: %s", KAFKA_BROKER)
    logger.info("Telemetry topic: %s", KAFKA_TOPIC)

    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BROKER)
    await producer.start()

    active_tasks: dict[str, asyncio.Task] = {}
    try:
        while True:
            await refresh_sensor_workers(active_tasks, producer)
            await asyncio.sleep(REFRESH_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        logger.info("Shutdown requested")
    finally:
        for task in active_tasks.values():
            task.cancel()
        if active_tasks:
            await asyncio.gather(*active_tasks.values(), return_exceptions=True)
        await producer.stop()
        logger.info("Simulator stopped")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass