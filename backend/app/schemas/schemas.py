"""Pydantic v2 schemas for PatientTriage.ai request and response models.

All schemas support population by field name (snake_case) or alias (camelCase)
to maintain compatibility with both Python conventions and JavaScript frontend payloads.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# --- Vitals ---
class VitalsSchema(BaseModel):
    hr: Optional[int] = None
    sbp: Optional[int] = None
    dbp: Optional[int] = None
    rr: Optional[int] = None
    spo2: Optional[int] = None
    temp_c: Optional[float] = Field(None, alias='tempC')
    pain: Optional[int] = None
    model_config = {'populate_by_name': True}


# --- Voice Signal ---
class VoiceSignalSchema(BaseModel):
    type: str  # 'slurred_speech','sentence_dyspnea','confusion','drowsiness','weak','none'
    model_config = {'populate_by_name': True}


# --- Transcript Line ---
class TranscriptLineSchema(BaseModel):
    speaker: str  # 'responder','patient','family'
    text: str
    model_config = {'populate_by_name': True}


# --- Capture Session ---
class CaptureSessionSchema(BaseModel):
    transcript: list[TranscriptLineSchema] = []
    verbatim_complaint: str = Field('', alias='verbatimComplaint')
    history: dict[str, str] = {}
    voice_signals: list[VoiceSignalSchema] = Field([], alias='voiceSignals')
    language: str = 'English'
    asr_confidence: float = Field(1.0, alias='asrConfidence')
    model_config = {'populate_by_name': True}


# --- Prehospital ---
class PrehospitalVitalsSchema(BaseModel):
    time: str
    vitals: VitalsSchema
    model_config = {'populate_by_name': True}


class PrehospitalSchema(BaseModel):
    serial_vitals: list[PrehospitalVitalsSchema] = Field([], alias='serialVitals')
    ecg: Optional[str] = None
    interventions: list[str] = []
    gcs: Optional[int] = None
    mechanism: Optional[str] = None
    pre_notification: Optional[str] = Field(None, alias='preNotification')
    model_config = {'populate_by_name': True}


# --- Timeline Event ---
class TimelineEventSchema(BaseModel):
    time: str
    description: str
    type: str  # 'arrival','triage','vitals_check','deterioration_alert','assigned_bed'
    model_config = {'populate_by_name': True}


# --- Patient Create (from Intake) ---
class PatientCreateSchema(BaseModel):
    case_id: str = Field(..., alias='caseId')
    name: str
    age: int
    sex: str
    arrival_mode: str = Field(..., alias='arrivalMode')
    arrival_time: str = Field(..., alias='arrivalTime')
    chief_complaint_verbatim: str = Field(..., alias='chiefComplaintVerbatim')
    vitals: VitalsSchema
    weight_kg: Optional[float] = Field(None, alias='weightKg')
    prior_history: Optional[str] = Field(None, alias='priorHistory')
    prehospital: Optional[PrehospitalSchema] = None
    capture_session: Optional[CaptureSessionSchema] = Field(None, alias='captureSession')
    model_config = {'populate_by_name': True}


# --- Risk Channel ---
class RiskChannelSchema(BaseModel):
    score: float
    contributions: list[dict] = []
    model_config = {'populate_by_name': True}


# --- Risk Profile ---
class RiskProfileSchema(BaseModel):
    critical_care: RiskChannelSchema = Field(alias='criticalCare')
    admission_likely: RiskChannelSchema = Field(alias='admissionLikely')
    sepsis: RiskChannelSchema
    acs: RiskChannelSchema
    stroke: RiskChannelSchema
    model_config = {'populate_by_name': True}


# --- Triage Flag ---
class TriageFlagSchema(BaseModel):
    type: str  # 'undertriage','uncertainty','none'
    reason_codes: list[str] = Field([], alias='reasonCodes')
    driving_channels: list[str] = Field([], alias='drivingChannels')
    model_config = {'populate_by_name': True}


# --- Explanation ---
class ExplanationSchema(BaseModel):
    top_drivers: list[dict] = Field([], alias='topDrivers')
    why: str = ''
    counterfactual: str = ''
    similar_cases: str = Field('', alias='similarCases')
    model_config = {'populate_by_name': True}


# --- Triage Decision Response ---
class TriageDecisionSchema(BaseModel):
    recommended_esi: int = Field(alias='recommendedESI')
    confidence: float
    risk_profile: RiskProfileSchema = Field(alias='riskProfile')
    flag: TriageFlagSchema
    explanation: ExplanationSchema
    model_config = {'populate_by_name': True}


# --- Submit Decision Request ---
class SubmitDecisionRequest(BaseModel):
    assigned_esi: int = Field(..., alias='assignedESI')
    override_reason: str = Field('', alias='overrideReason')
    model_config = {'populate_by_name': True}


# --- Staff Schema ---
class StaffSchema(BaseModel):
    id: str
    name: str
    specialization: str
    role: str
    status: str
    current_patient_id: Optional[str] = Field(None, alias='currentPatientId')
    model_config = {'populate_by_name': True}


class AssignDoctorRequest(BaseModel):
    patient_id: Optional[str] = Field(None, alias='patientId')
    status: Optional[str] = None
    model_config = {'populate_by_name': True}


# --- Patient Response (full, for API) ---
class PatientResponseSchema(BaseModel):
    case_id: str = Field(alias='caseId')
    name: str
    age: int
    sex: str
    arrival_mode: str = Field(alias='arrivalMode')
    arrival_time: str = Field(alias='arrivalTime')
    chief_complaint_verbatim: str = Field(alias='chiefComplaintVerbatim')
    vitals: VitalsSchema
    weight_kg: Optional[float] = Field(None, alias='weightKg')
    prior_history: Optional[str] = Field(None, alias='priorHistory')
    current_stage: str = Field('queue', alias='currentStage')
    prehospital: Optional[PrehospitalSchema] = None
    capture_session: Optional[CaptureSessionSchema] = Field(None, alias='captureSession')
    timeline: list[TimelineEventSchema] = []
    model_config = {'populate_by_name': True, 'from_attributes': True}


# --- Audit Log Response ---
class AuditLogSchema(BaseModel):
    case_id: str = Field(alias='caseId')
    recommended_esi: int = Field(alias='recommendedESI')
    assigned_esi: int = Field(alias='assignedESI')
    flag: TriageFlagSchema
    override_reason: str = Field('', alias='overrideReason')
    review_latency_sec: int = Field(alias='reviewLatencySec')
    timestamp: str
    model_version: str = Field(alias='modelVersion')
    capture_consent_state: bool = Field(alias='captureConsentState')
    model_config = {'populate_by_name': True, 'from_attributes': True}


# --- System Status ---
class SystemStatusSchema(BaseModel):
    queue_count: int
    waiting_count: int
    attending_count: int
    surge_mode: bool
    staff_available: int
    model_config = {'populate_by_name': True}
