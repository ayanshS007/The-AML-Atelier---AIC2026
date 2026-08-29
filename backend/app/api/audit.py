"""Audit log API routes — CQI reporting."""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.models import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
async def list_audit_logs(db: AsyncSession = Depends(get_db)):
    """Return all audit records for the CQI dashboard."""
    result = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()))
    logs = result.scalars().all()

    return [
        {
            "caseId": log.patient_id,
            "recommendedESI": log.recommended_esi,
            "assignedESI": log.assigned_esi,
            "flag": log.flag,
            "overrideReason": log.override_reason,
            "reviewLatencySec": log.review_latency_sec,
            "timestamp": log.timestamp.isoformat(),
            "modelVersion": log.model_version,
            "captureConsentState": log.capture_consent_state,
        }
        for log in logs
    ]


@router.get("/stats")
async def audit_stats(db: AsyncSession = Depends(get_db)):
    """Aggregate override statistics for CQI oversight."""
    result = await db.execute(select(AuditLog))
    logs = result.scalars().all()

    total = len(logs)
    if total == 0:
        return {
            "totalDecisions": 0,
            "agreements": 0,
            "overrides": 0,
            "overrideRate": 0.0,
            "avgReviewLatencySec": 0,
        }

    agreements = sum(1 for l in logs if l.recommended_esi == l.assigned_esi)
    overrides = total - agreements
    avg_latency = sum(l.review_latency_sec for l in logs) / total

    return {
        "totalDecisions": total,
        "agreements": agreements,
        "overrides": overrides,
        "overrideRate": round(overrides / total, 3) if total else 0.0,
        "avgReviewLatencySec": round(avg_latency, 1),
    }
