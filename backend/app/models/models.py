"""SQLAlchemy ORM models for PatientTriage.ai.

This module defines all relational database schemas mapping emergency department
patient encounters, vitals readings, chronological timeline events, AI-assisted
triage decisions, audit trails, ambient capture sessions, hospital staff, and prehospital EMS telemetry.
"""

from datetime import datetime
from typing import Any, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Patient(Base):
    """Emergency Department patient encounter entity."""

    __tablename__ = "patients"

    case_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    sex: Mapped[str] = mapped_column(String(10), nullable=False)  # 'M', 'F', 'O', 'U'
    arrival_mode: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # 'walk-in', 'ambulance', 'referral', 'police', 'unknown'
    arrival_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    chief_complaint_verbatim: Mapped[str] = mapped_column(Text, nullable=False)
    prior_history: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_stage: Mapped[str] = mapped_column(
        String(32), default="queue", nullable=False
    )  # 'queue', 'waiting', 'attending', 'discharged'
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    vitals_readings: Mapped[List["VitalsReading"]] = relationship(
        "VitalsReading", back_populates="patient", cascade="all, delete-orphan"
    )
    timeline_events: Mapped[List["TimelineEvent"]] = relationship(
        "TimelineEvent",
        back_populates="patient",
        cascade="all, delete-orphan",
        order_by="TimelineEvent.time",
    )
    triage_decisions: Mapped[List["TriageDecision"]] = relationship(
        "TriageDecision", back_populates="patient", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog", back_populates="patient", cascade="all, delete-orphan"
    )
    capture_session: Mapped[Optional["CaptureSession"]] = relationship(
        "CaptureSession",
        back_populates="patient",
        uselist=False,
        cascade="all, delete-orphan",
    )
    prehospital_data: Mapped[Optional["PrehospitalData"]] = relationship(
        "PrehospitalData",
        back_populates="patient",
        uselist=False,
        cascade="all, delete-orphan",
    )
    assigned_staff: Mapped[List["Staff"]] = relationship(
        "Staff",
        back_populates="current_patient",
        foreign_keys="Staff.current_patient_id",
    )


class VitalsReading(Base):
    """Point-in-time clinical vital sign readings for a patient."""

    __tablename__ = "vitals_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("patients.case_id", ondelete="CASCADE"), index=True, nullable=False
    )
    hr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sbp: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dbp: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    spo2: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    temp_c: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pain: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # 'intake', 'rescore', 'nurse_manual'

    # Relationship
    patient: Mapped["Patient"] = relationship("Patient", back_populates="vitals_readings")


class TimelineEvent(Base):
    """Chronological event in the patient's emergency care pathway."""

    __tablename__ = "timeline_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("patients.case_id", ondelete="CASCADE"), index=True, nullable=False
    )
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # 'arrival', 'triage', 'vitals_check', 'deterioration_alert', 'assigned_bed'

    # Relationship
    patient: Mapped["Patient"] = relationship("Patient", back_populates="timeline_events")


class TriageDecision(Base):
    """Decision-support acuity recommendation and explainability output."""

    __tablename__ = "triage_decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("patients.case_id", ondelete="CASCADE"), index=True, nullable=False
    )
    recommended_esi: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    risk_profile: Mapped[Any] = mapped_column(JSON, nullable=False)
    flag: Mapped[Any] = mapped_column(JSON, nullable=False)
    explanation: Mapped[Any] = mapped_column(JSON, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    scored_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationship
    patient: Mapped["Patient"] = relationship("Patient", back_populates="triage_decisions")


class AuditLog(Base):
    """Audit log capturing nurse review actions, overrides, and friction events."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("patients.case_id", ondelete="CASCADE"), index=True, nullable=False
    )
    recommended_esi: Mapped[int] = mapped_column(Integer, nullable=False)
    assigned_esi: Mapped[int] = mapped_column(Integer, nullable=False)
    flag: Mapped[Any] = mapped_column(JSON, nullable=True)
    override_reason: Mapped[str] = mapped_column(Text, nullable=False)
    review_latency_sec: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    capture_consent_state: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # Relationship
    patient: Mapped["Patient"] = relationship("Patient", back_populates="audit_logs")


class CaptureSession(Base):
    """Simulated ambient voice capture session and NLP extracted entities."""

    __tablename__ = "capture_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("patients.case_id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    transcript: Mapped[Any] = mapped_column(JSON, nullable=False)
    verbatim_complaint: Mapped[str] = mapped_column(Text, nullable=False)
    history_extracted: Mapped[Any] = mapped_column(JSON, nullable=False)
    voice_signals: Mapped[Any] = mapped_column(JSON, nullable=False)
    language: Mapped[str] = mapped_column(String(32), nullable=False)
    asr_confidence: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationship
    patient: Mapped["Patient"] = relationship("Patient", back_populates="capture_session")


class Staff(Base):
    """Emergency Department healthcare staff member."""

    __tablename__ = "staff"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialization: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # 'Attending', 'Fellow', 'Resident', 'Intern', 'Charge Nurse'
    status: Mapped[str] = mapped_column(
        String(32), default="available", nullable=False
    )  # 'available', 'busy', 'break'
    current_patient_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        ForeignKey("patients.case_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationship
    current_patient: Mapped[Optional["Patient"]] = relationship(
        "Patient",
        back_populates="assigned_staff",
        foreign_keys=[current_patient_id],
    )


class PrehospitalData(Base):
    """EMS prehospital telemetry, interventions, and pre-arrival notification."""

    __tablename__ = "prehospital_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("patients.case_id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    serial_vitals: Mapped[Any] = mapped_column(JSON, nullable=False)
    ecg: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    interventions: Mapped[Any] = mapped_column(JSON, nullable=False)
    gcs: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mechanism: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pre_notification: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationship
    patient: Mapped["Patient"] = relationship("Patient", back_populates="prehospital_data")
