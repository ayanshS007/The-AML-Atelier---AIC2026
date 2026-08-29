"""Staff API routes — list doctors, assign patients, update status."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.models import Staff, Patient, TimelineEvent
from app.ws import manager

router = APIRouter(prefix="/staff", tags=["staff"])


def _staff_to_dict(s: Staff) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "specialization": s.specialization,
        "role": s.role,
        "status": s.status,
        "currentPatientId": s.current_patient_id,
    }


@router.get("")
async def list_staff(db: AsyncSession = Depends(get_db)):
    """List all clinical staff."""
    result = await db.execute(select(Staff).order_by(Staff.role, Staff.name))
    return [_staff_to_dict(s) for s in result.scalars().all()]


@router.patch("/{staff_id}")
async def update_staff(staff_id: str, payload: dict, db: AsyncSession = Depends(get_db)):
    """Update staff status or assign a patient."""
    now = datetime.now(timezone.utc)

    result = await db.execute(select(Staff).where(Staff.id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    new_patient_id = payload.get("patientId")  # can be null to unassign
    new_status = payload.get("status")

    # If assigning a patient
    if "patientId" in payload:
        if new_patient_id:
            # Verify patient exists
            p_result = await db.execute(select(Patient).where(Patient.case_id == new_patient_id))
            patient = p_result.scalar_one_or_none()
            if not patient:
                raise HTTPException(status_code=404, detail="Patient not found")

            staff.current_patient_id = new_patient_id
            staff.status = "busy"

            # Add timeline event
            timeline = TimelineEvent(
                patient_id=new_patient_id,
                time=now,
                description=f"Assigned to {staff.name}",
                type="assigned_bed",
            )
            db.add(timeline)
        else:
            # Unassigning
            staff.current_patient_id = None
            staff.status = "available"

    # If just updating status
    if new_status and "patientId" not in payload:
        staff.status = new_status
        if new_status == "available":
            staff.current_patient_id = None

    await db.commit()
    await db.refresh(staff)

    response = _staff_to_dict(staff)
    await manager.broadcast("staff:updated", response)
    return response
