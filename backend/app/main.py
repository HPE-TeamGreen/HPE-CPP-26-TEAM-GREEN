import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Column, DateTime, Enum as SAEnum, Float, ForeignKey, String, create_engine
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


Base.metada& "..\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000& "..\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000ta.create_all(bind=engine)


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
