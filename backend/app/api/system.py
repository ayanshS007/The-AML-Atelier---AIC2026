"""System API routes — surge mode, re-score, status KPIs."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.models import Patient, Staff, TriageDecision, VitalsReading, TimelineEvent
from app.engine.scorer import score_patient
from app.ws import manager

router = APIRouter(prefix="/system", tags=["system"])

# In-memory surge state (simple for prototype; could be DB-backed)
_surge_state = {"is_surge": False}


@router.get("/status")
async def system_status(db: AsyncSession = Depends(get_db)):
    """Dashboard KPIs — bed counts, queue depth, staff availability."""
    queue = await db.execute(select(func.count()).select_from(Patient).where(Patient.current_stage == "queue"))
    waiting = await db.execute(select(func.count()).select_from(Patient).where(Patient.current_stage == "waiting"))
    attending = await db.execute(select(func.count()).select_from(Patient).where(Patient.current_stage == "attending"))
    available = await db.execute(select(func.count()).select_from(Staff).where(Staff.status == "available"))

    return {
        "queueCount": queue.scalar() or 0,
        "waitingCount": waiting.scalar() or 0,
        "attendingCount": attending.scalar() or 0,
        "surgeMode": _surge_state["is_surge"],
        "staffAvailable": available.scalar() or 0,
    }


@router.post("/surge")
async def toggle_surge(db: AsyncSession = Depends(get_db)):
    """Toggle surge mode and re-score all patients."""
    _surge_state["is_surge"] = not _surge_state["is_surge"]
    is_surge = _surge_state["is_surge"]

    # Re-score all patients in queue/waiting
    patients = await db.execute(
        select(Patient).where(Patient.current_stage.in_(["queue", "waiting"]))
    )
    rescored = 0
    for p in patients.scalars().all():
        # Get latest vitals
        v_result = await db.execute(
            select(VitalsReading)
            .where(VitalsReading.patient_id == p.case_id)
            .order_by(VitalsReading.recorded_at.desc())
            .limit(1)
        )
        latest_vitals = v_result.scalar_one_or_none()
        vitals_dict = {}
        if latest_vitals:
            vitals_dict = {
                "hr": latest_vitals.hr, "sbp": latest_vitals.sbp,
                "dbp": latest_vitals.dbp, "rr": latest_vitals.rr,
                "spo2": latest_vitals.spo2, "tempC": latest_vitals.temp_c,
                "pain": latest_vitals.pain,
            }

        scorer_input = {
            "age": p.age,
            "vitals": vitals_dict,
            "chiefComplaintVerbatim": p.chief_complaint_verbatim,
            "captureSession": None,
        }
        decision_data = score_patient(scorer_input, is_surge=is_surge)

        # Mark old decisions as not current
        old_decs = await db.execute(
            select(TriageDecision).where(
                TriageDecision.patient_id == p.case_id,
                TriageDecision.is_current == True,
            )
        )
        for old in old_decs.scalars().all():
            old.is_current = False

        new_dec = TriageDecision(
            patient_id=p.case_id,
            recommended_esi=decision_data["recommendedESI"],
            confidence=decision_data["confidence"],
            risk_profile=decision_data["riskProfile"],
            flag=decision_data["flag"],
            explanation=decision_data["explanation"],
            is_current=True,
            model_version="1.0.0",
            scored_at=datetime.now(timezone.utc),
        )
        db.add(new_dec)
        rescored += 1

    await db.commit()

    response = {"surgeMode": is_surge, "rescoredPatients": rescored}
    await manager.broadcast("surge:toggled", response)
    return response


@router.post("/rescore")
async def rescore_all(db: AsyncSession = Depends(get_db)):
    """Manually trigger a global re-score of all active patients."""
    is_surge = _surge_state["is_surge"]
    now = datetime.now(timezone.utc)

    patients = await db.execute(
        select(Patient).where(Patient.current_stage.in_(["queue", "waiting"]))
    )
    rescored = 0
    escalations = []

    for p in patients.scalars().all():
        v_result = await db.execute(
            select(VitalsReading)
            .where(VitalsReading.patient_id == p.case_id)
            .order_by(VitalsReading.recorded_at.desc())
            .limit(1)
        )
        latest_vitals = v_result.scalar_one_or_none()
        vitals_dict = {}
        if latest_vitals:
            vitals_dict = {
                "hr": latest_vitals.hr, "sbp": latest_vitals.sbp,
                "dbp": latest_vitals.dbp, "rr": latest_vitals.rr,
                "spo2": latest_vitals.spo2, "tempC": latest_vitals.temp_c,
                "pain": latest_vitals.pain,
            }

        scorer_input = {
            "age": p.age,
            "vitals": vitals_dict,
            "chiefComplaintVerbatim": p.chief_complaint_verbatim,
            "captureSession": None,
        }
        new_decision = score_patient(scorer_input, is_surge=is_surge)

        # Check for escalation
        old_dec = await db.execute(
            select(TriageDecision).where(
                TriageDecision.patient_id == p.case_id,
                TriageDecision.is_current == True,
            )
        )
        old = old_dec.scalar_one_or_none()
        old_esi = old.recommended_esi if old else 5

        if new_decision["recommendedESI"] < old_esi:
            escalations.append(p.case_id)
            timeline = TimelineEvent(
                patient_id=p.case_id,
                time=now,
                description=f"Deterioration detected: ESI {old_esi} → {new_decision['recommendedESI']}",
                type="deterioration_alert",
            )
            db.add(timeline)

        # Mark old as not current
        if old:
            old.is_current = False

        new_dec = TriageDecision(
            patient_id=p.case_id,
            recommended_esi=new_decision["recommendedESI"],
            confidence=new_decision["confidence"],
            risk_profile=new_decision["riskProfile"],
            flag=new_decision["flag"],
            explanation=new_decision["explanation"],
            is_current=True,
            model_version="1.0.0",
            scored_at=now,
        )
        db.add(new_dec)
        rescored += 1

    await db.commit()

    for case_id in escalations:
        await manager.broadcast("patient:escalated", {"caseId": case_id})

    return {"rescoredPatients": rescored, "escalations": escalations}
