"""Patient API routes — intake, listing, chart retrieval."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import (
    Patient, VitalsReading, TimelineEvent, TriageDecision,
    CaptureSession, PrehospitalData, AuditLog, Staff,
)
from app.engine.scorer import score_patient
from app.ws import manager

router = APIRouter(prefix="/patients", tags=["patients"])


def _vitals_dict(v: VitalsReading | None) -> dict:
    if not v:
        return {}
    return {
        "hr": v.hr, "sbp": v.sbp, "dbp": v.dbp,
        "rr": v.rr, "spo2": v.spo2, "tempC": v.temp_c, "pain": v.pain,
    }


def _patient_to_dict(p: Patient, vitals: dict | None = None, decision: dict | None = None) -> dict:
    """Convert ORM patient to frontend-compatible dict."""
    # Get latest vitals
    if vitals is None:
        latest = sorted(p.vitals_readings, key=lambda v: v.recorded_at)[-1] if p.vitals_readings else None
        vitals = _vitals_dict(latest)

    timeline = [
        {"time": e.time.isoformat(), "description": e.description, "type": e.type}
        for e in sorted(p.timeline_events, key=lambda e: e.time)
    ]

    capture = None
    if p.capture_session:
        cs = p.capture_session
        capture = {
            "transcript": cs.transcript or [],
            "verbatimComplaint": cs.verbatim_complaint,
            "history": cs.history_extracted or {},
            "voiceSignals": cs.voice_signals or [],
            "language": cs.language,
            "asrConfidence": cs.asr_confidence,
        }

    prehospital = None
    if p.prehospital_data:
        ph = p.prehospital_data
        prehospital = {
            "serialVitals": ph.serial_vitals or [],
            "ecg": ph.ecg,
            "interventions": ph.interventions or [],
            "gcs": ph.gcs,
            "mechanism": ph.mechanism,
            "preNotification": ph.pre_notification,
        }

    result = {
        "caseId": p.case_id,
        "name": p.name,
        "age": p.age,
        "sex": p.sex,
        "arrivalMode": p.arrival_mode,
        "arrivalTime": p.arrival_time.isoformat(),
        "chiefComplaintVerbatim": p.chief_complaint_verbatim,
        "vitals": vitals,
        "weightKg": p.weight_kg,
        "priorHistory": p.prior_history,
        "currentStage": p.current_stage,
        "prehospital": prehospital,
        "captureSession": capture,
        "timeline": timeline,
    }

    if decision:
        result["decision"] = decision

    return result


def _decision_to_dict(d: TriageDecision) -> dict:
    return {
        "recommendedESI": d.recommended_esi,
        "confidence": d.confidence,
        "riskProfile": d.risk_profile,
        "flag": d.flag,
        "explanation": d.explanation,
    }


@router.get("")
async def list_patients(stage: str | None = None, db: AsyncSession = Depends(get_db)):
    """List patients, optionally filtered by pipeline stage."""
    stmt = (
        select(Patient)
        .options(
            selectinload(Patient.vitals_readings),
            selectinload(Patient.timeline_events),
            selectinload(Patient.capture_session),
            selectinload(Patient.prehospital_data),
        )
        .order_by(Patient.arrival_time.desc())
    )
    if stage:
        stmt = stmt.where(Patient.current_stage == stage)

    result = await db.execute(stmt)
    patients = result.scalars().all()

    # Also fetch current decisions
    dec_stmt = select(TriageDecision).where(TriageDecision.is_current == True)
    dec_result = await db.execute(dec_stmt)
    decisions = {d.patient_id: d for d in dec_result.scalars().all()}

    return [
        _patient_to_dict(p, decision=_decision_to_dict(decisions[p.case_id]) if p.case_id in decisions else None)
        for p in patients
    ]


@router.get("/{case_id}")
async def get_patient(case_id: str, db: AsyncSession = Depends(get_db)):
    """Get full patient chart including timeline, vitals history, and current decision."""
    stmt = (
        select(Patient)
        .options(
            selectinload(Patient.vitals_readings),
            selectinload(Patient.timeline_events),
            selectinload(Patient.capture_session),
            selectinload(Patient.prehospital_data),
        )
        .where(Patient.case_id == case_id)
    )
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Get current decision
    dec_stmt = select(TriageDecision).where(
        TriageDecision.patient_id == case_id,
        TriageDecision.is_current == True,
    )
    dec_result = await db.execute(dec_stmt)
    decision = dec_result.scalar_one_or_none()

    return _patient_to_dict(
        patient,
        decision=_decision_to_dict(decision) if decision else None,
    )


@router.post("", status_code=201)
async def create_patient(payload: dict, db: AsyncSession = Depends(get_db)):
    """Create a new patient from intake. Scores and broadcasts."""
    now = datetime.now(timezone.utc)
    case_id = payload.get("caseId", f"PT-{int(now.timestamp())}")

    # Check duplicate
    existing = await db.execute(select(Patient).where(Patient.case_id == case_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Patient already exists")

    # Create patient
    patient = Patient(
        case_id=case_id,
        name=payload["name"],
        age=payload["age"],
        sex=payload["sex"],
        arrival_mode=payload.get("arrivalMode", "walk-in"),
        arrival_time=datetime.fromisoformat(payload.get("arrivalTime", now.isoformat())),
        chief_complaint_verbatim=payload.get("chiefComplaintVerbatim", ""),
        prior_history=payload.get("priorHistory"),
        weight_kg=payload.get("weightKg"),
        current_stage="queue",
    )
    db.add(patient)

    # Create vitals
    vitals_data = payload.get("vitals", {})
    vitals = VitalsReading(
        patient_id=case_id,
        hr=vitals_data.get("hr"),
        sbp=vitals_data.get("sbp"),
        dbp=vitals_data.get("dbp"),
        rr=vitals_data.get("rr"),
        spo2=vitals_data.get("spo2"),
        temp_c=vitals_data.get("tempC"),
        pain=vitals_data.get("pain"),
        recorded_at=now,
        source="intake",
    )
    db.add(vitals)

    # Create timeline event
    timeline = TimelineEvent(
        patient_id=case_id,
        time=now,
        description="Patient arrived at ED",
        type="arrival",
    )
    db.add(timeline)

    # Create capture session if present
    cs_data = payload.get("captureSession")
    if cs_data:
        cs = CaptureSession(
            patient_id=case_id,
            transcript=cs_data.get("transcript", []),
            verbatim_complaint=cs_data.get("verbatimComplaint", ""),
            history_extracted=cs_data.get("history", {}),
            voice_signals=cs_data.get("voiceSignals", []),
            language=cs_data.get("language", "English"),
            asr_confidence=cs_data.get("asrConfidence", 1.0),
        )
        db.add(cs)

    # Create prehospital if present
    ph_data = payload.get("prehospital")
    if ph_data:
        ph = PrehospitalData(
            patient_id=case_id,
            serial_vitals=ph_data.get("serialVitals", []),
            ecg=ph_data.get("ecg"),
            interventions=ph_data.get("interventions", []),
            gcs=ph_data.get("gcs"),
            mechanism=ph_data.get("mechanism"),
            pre_notification=ph_data.get("preNotification"),
        )
        db.add(ph)

    # Score the patient
    scorer_input = {
        "age": payload["age"],
        "vitals": vitals_data,
        "chiefComplaintVerbatim": payload.get("chiefComplaintVerbatim", ""),
        "captureSession": cs_data,
    }
    decision_data = score_patient(scorer_input, is_surge=False)

    decision = TriageDecision(
        patient_id=case_id,
        recommended_esi=decision_data["recommendedESI"],
        confidence=decision_data["confidence"],
        risk_profile=decision_data["riskProfile"],
        flag=decision_data["flag"],
        explanation=decision_data["explanation"],
        is_current=True,
        model_version="1.0.0",
        scored_at=now,
    )
    db.add(decision)

    await db.commit()

    # Build response
    response = {
        "caseId": case_id,
        "name": payload["name"],
        "age": payload["age"],
        "sex": payload["sex"],
        "arrivalMode": payload.get("arrivalMode", "walk-in"),
        "arrivalTime": patient.arrival_time.isoformat(),
        "chiefComplaintVerbatim": payload.get("chiefComplaintVerbatim", ""),
        "vitals": vitals_data,
        "priorHistory": payload.get("priorHistory"),
        "currentStage": "queue",
        "captureSession": cs_data,
        "prehospital": ph_data,
        "timeline": [{"time": now.isoformat(), "description": "Patient arrived at ED", "type": "arrival"}],
        "decision": decision_data,
    }

    await manager.broadcast("patient:new", response)
    return response
