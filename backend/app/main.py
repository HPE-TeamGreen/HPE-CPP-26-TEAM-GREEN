import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Boolean, Column, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text, create_engine, desc
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:password@localhost:5432/tempsafe",
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ShipmentStatus(str, Enum):
    CREATED = "CREATED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"


VALID_TRANSITIONS = {
    ShipmentStatus.CREATED: [ShipmentStatus.IN_TRANSIT],
    ShipmentStatus.IN_TRANSIT: [ShipmentStatus.DELIVERED],
    ShipmentStatus.DELIVERED: [],
}


class ShipmentModel(Base):
    __tablename__ = "shipments"

    shipment_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    status = Column(SAEnum(ShipmentStatus), nullable=False, default=ShipmentStatus.CREATED)
    min_temp_limit = Column(Float, nullable=False)
    max_temp_limit = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    sensors = relationship("SensorModel", back_populates="shipment")


class SensorModel(Base):
    __tablename__ = "sensors"

    sensor_id = Column(String, primary_key=True)
    shipment_id = Column(String, ForeignKey("shipments.shipment_id"), nullable=False)
    calibration_date = Column(DateTime(timezone=True), nullable=True)
    registered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    shipment = relationship("ShipmentModel", back_populates="sensors")


class TelemetryReadingModel(Base):
    """Mirrors the table created by the Telemetry Kafka consumer."""
    __tablename__ = "telemetry_readings"
    __table_args__ = {"extend_existing": True}

    event_id = Column(String, primary_key=True)
    sensor_id = Column(String(50), nullable=False)
    shipment_id = Column(String(100), nullable=False)
    event_type = Column(String(100), nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    temperature = Column(Float, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_excursion = Column(Boolean, nullable=False, default=False)
    is_buffered = Column(Boolean, nullable=False, default=False)


class AlertModel(Base):
    """Mirrors the table created by the Alert Kafka consumer."""
    __tablename__ = "alerts"
    __table_args__ = {"extend_existing": True}

    alert_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    reading_event_id = Column(String, nullable=False)
    sensor_id = Column(String(50), nullable=False)
    shipment_id = Column(String(100), nullable=False)
    temperature = Column(Float, nullable=False)
    min_temp_limit = Column(Float, nullable=False)
    max_temp_limit = Column(Float, nullable=False)
    origin = Column(String(100), nullable=True)
    destination = Column(String(100), nullable=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    is_buffered = Column(Boolean, nullable=False, default=False)
    acknowledged = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ExcursionModel(Base):
    """Tracks temperature excursion events."""
    __tablename__ = "excursion_events"
    __table_args__ = {"extend_existing": True}

    excursion_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    shipment_id = Column(String(100), nullable=False)
    sensor_id = Column(String(50), nullable=False)
    breach_time = Column(DateTime(timezone=True), nullable=False)
    recorded_temp = Column(Float, nullable=False)
    status = Column(String(20), nullable=False, default="OPEN")
    acknowledged_by = Column(String(100), nullable=True)
    resolution_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


Base.metadata.create_all(bind=engine)


class ShipmentCreate(BaseModel):
    origin: str = Field(..., example="Mangaluru Warehouse")
    destination: str = Field(..., example="Bengaluru Hub")
    min_temp_limit: float = Field(..., example=2.0)
    max_temp_limit: float = Field(..., example=8.0)

    @field_validator("max_temp_limit")
    @classmethod
    def max_must_exceed_min(cls, v, info):
        if "min_temp_limit" in info.data and v <= info.data["min_temp_limit"]:
            raise ValueError("max_temp_limit must be greater than min_temp_limit")
        return v


class ShipmentStatusUpdate(BaseModel):
    new_status: ShipmentStatus


class ShipmentResponse(BaseModel):
    shipment_id: str
    origin: str
    destination: str
    status: ShipmentStatus
    min_temp_limit: float
    max_temp_limit: float
    created_at: datetime

    model_config = {"from_attributes": True}


class SensorRegister(BaseModel):
    sensor_id: str = Field(..., example="SEN_001")
    calibration_date: Optional[datetime] = Field(None, example="2026-04-01T00:00:00Z")


class SensorResponse(BaseModel):
    sensor_id: str
    shipment_id: str
    calibration_date: Optional[datetime]
    registered_at: datetime

    model_config = {"from_attributes": True}


class ActiveSensorInfo(BaseModel):
    sensor_id: str
    shipment_id: str
    min_temp_limit: float
    max_temp_limit: float
    origin: str
    destination: str


# --- Telemetry Schemas ---

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

    model_config = {"from_attributes": True}


# --- Alert Schemas ---

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

    model_config = {"from_attributes": True}


# --- Excursion Schemas ---

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

    model_config = {"from_attributes": True}


class ExcursionResolve(BaseModel):
    resolution_note: str



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app = FastAPI(
    title="TempSafe Shipment Service",
    description="Minimal shipment microservice for the React UI.",
    version="1.0.0",
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "shipment-microservice"}


@app.post(
    "/shipments",
    response_model=ShipmentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Shipments"],
)
def create_shipment(payload: ShipmentCreate, db: Session = Depends(get_db)):
    shipment = ShipmentModel(
        shipment_id=str(uuid.uuid4()),
        origin=payload.origin,
        destination=payload.destination,
        min_temp_limit=payload.min_temp_limit,
        max_temp_limit=payload.max_temp_limit,
        status=ShipmentStatus.CREATED,
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment


@app.get(
    "/shipments",
    response_model=list[ShipmentResponse],
    tags=["Shipments"],
)
def list_shipments(status_filter: Optional[ShipmentStatus] = None, db: Session = Depends(get_db)):
    query = db.query(ShipmentModel)
    if status_filter:
        query = query.filter(ShipmentModel.status == status_filter)
    return query.all()


@app.get(
    "/shipments/{shipment_id}",
    response_model=ShipmentResponse,
    tags=["Shipments"],
)
def get_shipment(shipment_id: str, db: Session = Depends(get_db)):
    shipment = db.query(ShipmentModel).filter(ShipmentModel.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
    return shipment


@app.patch(
    "/shipments/{shipment_id}/status",
    response_model=ShipmentResponse,
    tags=["Shipments"],
)
def update_shipment_status(
    shipment_id: str,
    payload: ShipmentStatusUpdate,
    db: Session = Depends(get_db),
):
    shipment = db.query(ShipmentModel).filter(ShipmentModel.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")

    allowed_next_states = VALID_TRANSITIONS.get(shipment.status, [])
    if payload.new_status not in allowed_next_states:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid transition: {shipment.status} -> {payload.new_status}. "
                f"Allowed next states: {[s.value for s in allowed_next_states]}"
            ),
        )

    shipment.status = payload.new_status
    db.commit()
    db.refresh(shipment)
    return shipment


@app.post(
    "/shipments/{shipment_id}/sensors",
    response_model=SensorResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Sensors"],
)
def register_sensor(shipment_id: str, payload: SensorRegister, db: Session = Depends(get_db)):
    shipment = db.query(ShipmentModel).filter(ShipmentModel.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")

    existing = db.query(SensorModel).filter(SensorModel.sensor_id == payload.sensor_id).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Sensor {payload.sensor_id} is already registered to shipment {existing.shipment_id}"
            ),
        )

    sensor = SensorModel(
        sensor_id=payload.sensor_id,
        shipment_id=shipment_id,
        calibration_date=payload.calibration_date,
    )
    db.add(sensor)
    db.commit()
    db.refresh(sensor)
    return sensor


@app.get(
    "/shipments/{shipment_id}/sensors",
    response_model=list[SensorResponse],
    tags=["Sensors"],
)
def list_sensors_for_shipment(shipment_id: str, db: Session = Depends(get_db)):
    shipment = db.query(ShipmentModel).filter(ShipmentModel.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
    return shipment.sensors


@app.get(
    "/sensors/active",
    response_model=list[ActiveSensorInfo],
    tags=["Simulator Contract"],
)
def get_active_sensors(db: Session = Depends(get_db)):
    results = (
        db.query(SensorModel, ShipmentModel)
        .join(ShipmentModel, SensorModel.shipment_id == ShipmentModel.shipment_id)
        .filter(ShipmentModel.status == ShipmentStatus.IN_TRANSIT)
        .all()
    )

    return [
        ActiveSensorInfo(
            sensor_id=sensor.sensor_id,
            shipment_id=sensor.shipment_id,
            min_temp_limit=shipment.min_temp_limit,
            max_temp_limit=shipment.max_temp_limit,
            origin=shipment.origin,
            destination=shipment.destination,
        )
        for sensor, shipment in results
    ]


# ─── Telemetry Endpoints ───────────────────────────────────────────────

@app.get(
    "/telemetry/latest",
    response_model=list[TelemetryReadingResponse],
    tags=["Telemetry"],
)
def get_latest_telemetry(
    sensor_id: str,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """Return the most recent telemetry readings for a given sensor."""
    readings = (
        db.query(TelemetryReadingModel)
        .filter(TelemetryReadingModel.sensor_id == sensor_id)
        .order_by(desc(TelemetryReadingModel.recorded_at))
        .limit(limit)
        .all()
    )
    return list(reversed(readings))


@app.get(
    "/telemetry/history",
    response_model=list[TelemetryReadingResponse],
    tags=["Telemetry"],
)
def get_telemetry_history(
    sensor_id: Optional[str] = None,
    shipment_id: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Return telemetry readings filtered by sensor, shipment, or time range."""
    query = db.query(TelemetryReadingModel)
    if sensor_id:
        query = query.filter(TelemetryReadingModel.sensor_id == sensor_id)
    if shipment_id:
        query = query.filter(TelemetryReadingModel.shipment_id == shipment_id)
    if start_time:
        query = query.filter(TelemetryReadingModel.recorded_at >= start_time)
    if end_time:
        query = query.filter(TelemetryReadingModel.recorded_at <= end_time)
    return query.order_by(TelemetryReadingModel.recorded_at).limit(500).all()


# ─── Alert Endpoints ──────────────────────────────────────────────────

@app.get(
    "/alerts",
    response_model=list[AlertResponse],
    tags=["Alerts"],
)
def list_alerts(
    type: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """Return all alerts, optionally filtered."""
    query = db.query(AlertModel)
    if acknowledged is not None:
        query = query.filter(AlertModel.acknowledged == acknowledged)
    return query.order_by(desc(AlertModel.created_at)).all()


@app.patch(
    "/alerts/{alert_id}/acknowledge",
    response_model=AlertResponse,
    tags=["Alerts"],
)
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(AlertModel).filter(AlertModel.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    alert.acknowledged = True
    db.commit()
    db.refresh(alert)
    return alert


@app.patch(
    "/alerts/acknowledge-all",
    tags=["Alerts"],
)
def acknowledge_all_alerts(db: Session = Depends(get_db)):
    db.query(AlertModel).filter(AlertModel.acknowledged == False).update({"acknowledged": True})
    db.commit()
    return {"status": "ok"}


# ─── Excursion Endpoints ──────────────────────────────────────────────

@app.get(
    "/excursions",
    response_model=list[ExcursionResponse],
    tags=["Excursions"],
)
def list_excursions(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Return all excursion events, optionally filtered by status."""
    query = db.query(ExcursionModel)
    if status_filter:
        query = query.filter(ExcursionModel.status == status_filter)
    return query.order_by(desc(ExcursionModel.created_at)).all()


@app.patch(
    "/excursions/{excursion_id}/resolve",
    response_model=ExcursionResponse,
    tags=["Excursions"],
)
def resolve_excursion(
    excursion_id: str,
    payload: ExcursionResolve,
    db: Session = Depends(get_db),
):
    excursion = db.query(ExcursionModel).filter(ExcursionModel.excursion_id == excursion_id).first()
    if not excursion:
        raise HTTPException(status_code=404, detail=f"Excursion {excursion_id} not found")
    excursion.status = "CLOSED"
    excursion.resolution_note = payload.resolution_note
    db.commit()
    db.refresh(excursion)
    return excursion
