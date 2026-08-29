"""Triage decision routes — submit nurse override, get recommendation."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.models import Patient, TriageDecision, AuditLog, TimelineEvent
from app.engine.guardrails import validate_decision
from app.ws import manager

router = APIRouter(prefix="/patients", tags=["decisions"])


@router.get("/{case_id}/decision")
async def get_decision(case_id: str, db: AsyncSession = Depends(get_db)):
    """Get the current ML recommendation for a patient."""
    stmt = select(TriageDecision).where(
        TriageDecision.patient_id == case_id,
        TriageDecision.is_current == True,
    )
    result = await db.execute(stmt)
    decision = result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=404, detail="No decision found")

    return {
        "recommendedESI": decision.recommended_esi,
        "confidence": decision.confidence,
        "riskProfile": decision.risk_profile,
        "flag": decision.flag,
        "explanation": decision.explanation,
    }


@router.post("/{case_id}/triage")
async def submit_triage(case_id: str, payload: dict, db: AsyncSession = Depends(get_db)):
    """Nurse submits their ESI decision (may override the ML recommendation)."""
    now = datetime.now(timezone.utc)
    assigned_esi = payload.get("assignedESI")
    override_reason = payload.get("overrideReason", "")

    if assigned_esi is None or not (1 <= assigned_esi <= 5):
        raise HTTPException(status_code=400, detail="assignedESI must be 1-5")

    # Get patient
    p_result = await db.execute(select(Patient).where(Patient.case_id == case_id))
    patient = p_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Get current decision
    dec_result = await db.execute(
        select(TriageDecision).where(
            TriageDecision.patient_id == case_id,
            TriageDecision.is_current == True,
        )
    )
    decision = dec_result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=404, detail="No active decision for patient")

    # Guardrail: human can set any ESI, but log the override
    validated_esi = validate_decision(assigned_esi, None, is_human=True)

    # Create audit log
    audit = AuditLog(
        patient_id=case_id,
        recommended_esi=decision.recommended_esi,
        assigned_esi=validated_esi,
        flag=decision.flag,
        override_reason=override_reason,
        review_latency_sec=payload.get("reviewLatencySec", 10),
        timestamp=now,
        model_version=decision.model_version,
        capture_consent_state=True,
    )
    db.add(audit)

    # Add timeline event
    timeline = TimelineEvent(
        patient_id=case_id,
        time=now,
        description=f"Nurse assigned ESI {validated_esi}",
        type="triage",
    )
    db.add(timeline)

    await db.commit()

    response = {
        "caseId": case_id,
        "assignedESI": validated_esi,
        "recommendedESI": decision.recommended_esi,
        "overrideReason": override_reason,
    }

    await manager.broadcast("patient:triaged", response)
    return response
