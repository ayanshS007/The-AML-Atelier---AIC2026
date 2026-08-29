"""Database seeder populating synthetic patient encounters and clinical staff.

This module initializes the SQLite database with 7 queue patients, their vital sign
readings, arrival timeline events, initial triage decisions scored by the rule engine,
ambient capture sessions, and 16 emergency department staff members.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal, create_tables
from app.engine.scorer import score_patient
from app.models.models import (
    CaptureSession,
    Patient,
    Staff,
    TimelineEvent,
    TriageDecision,
    VitalsReading,
)

# Base reference timestamp for synthetic relative time calculation
NOW = datetime.now(timezone.utc)


def subtract_minutes(minutes: int) -> datetime:
    """Calculate a past datetime offset by a specified number of minutes."""
    return NOW - timedelta(minutes=minutes)


# Synthetic patient encounters matching frontend queuePatients
SEED_PATIENTS: List[Dict[str, Any]] = [
    {
        "case_id": "PT-1004",
        "name": "R. Silva",
        "age": 61,
        "sex": "M",
        "arrival_mode": "walk-in",
        "minutes_ago": 85,
        "chief_complaint_verbatim": "short of breath, worse lying flat",
        "vitals": {"hr": 98, "sbp": 140, "dbp": 85, "rr": 20, "spo2": 95},
        "prior_history": "CHF, HTN",
        "capture_session": {
            "transcript": [
                {
                    "speaker": "patient",
                    "text": "I am so short of breath, it gets worse when I lie flat.",
                }
            ],
            "verbatimComplaint": "short of breath, worse lying flat",
            "history": {},
            "voiceSignals": [{"type": "sentence_dyspnea"}],
            "language": "English",
            "asrConfidence": 0.92,
        },
    },
    {
        "case_id": "PT-1005",
        "name": "T. Adeyemi",
        "age": 29,
        "sex": "F",
        "arrival_mode": "walk-in",
        "minutes_ago": 60,
        "chief_complaint_verbatim": "lower abdominal pain 6/10",
        "vitals": {"hr": 90, "sbp": 120, "dbp": 75, "rr": 16, "tempC": 37.2, "pain": 6},
        "prior_history": "None",
        "capture_session": {
            "transcript": [
                {
                    "speaker": "patient",
                    "text": "I have this sharp lower abdominal pain, about a 6 out of 10.",
                }
            ],
            "verbatimComplaint": "lower abdominal pain 6/10",
            "history": {"Pain Scale": "6/10", "Location": "Lower abdomen"},
            "voiceSignals": [{"type": "none"}],
            "language": "English",
            "asrConfidence": 0.95,
        },
    },
    {
        "case_id": "PT-1008",
        "name": "M. Garcia",
        "age": 45,
        "sex": "F",
        "arrival_mode": "walk-in",
        "minutes_ago": 120,
        "chief_complaint_verbatim": "dolor de cabeza fuerte",
        "vitals": {"hr": 85, "sbp": 140, "dbp": 90, "rr": 16, "pain": 8},
        "prior_history": "Migraines",
        "capture_session": {
            "transcript": [
                {
                    "speaker": "patient",
                    "text": "Tengo un dolor de cabeza muy fuerte.",
                }
            ],
            "verbatimComplaint": "dolor de cabeza fuerte",
            "history": {"Symptom": "Headache"},
            "voiceSignals": [{"type": "none"}],
            "language": "Spanish",
            "asrConfidence": 0.85,
        },
    },
    {
        "case_id": "PT-2004",
        "name": "O. Martinez",
        "age": 19,
        "sex": "M",
        "arrival_mode": "walk-in",
        "minutes_ago": 65,
        "chief_complaint_verbatim": "burning when I pee for 3 days",
        "vitals": {"hr": 82, "sbp": 118, "dbp": 76, "rr": 14, "tempC": 37.8, "pain": 4},
        "prior_history": "None",
        "capture_session": {
            "transcript": [{"speaker": "patient", "text": "Burns when I pee."}],
            "verbatimComplaint": "burning when I pee",
            "history": {},
            "voiceSignals": [{"type": "none"}],
            "language": "English",
            "asrConfidence": 0.99,
        },
    },
    {
        "case_id": "PT-2005",
        "name": "D. Kim",
        "age": 75,
        "sex": "M",
        "arrival_mode": "walk-in",
        "minutes_ago": 95,
        "chief_complaint_verbatim": "fell at home, hit my head, on blood thinners",
        "vitals": {"hr": 72, "sbp": 160, "dbp": 85, "rr": 16, "tempC": 36.6, "pain": 3},
        "prior_history": "AFib (on Eliquis)",
        "capture_session": {
            "transcript": [{"speaker": "patient", "text": "I tripped on a rug."}],
            "verbatimComplaint": "fell at home, hit my head",
            "history": {},
            "voiceSignals": [{"type": "none"}],
            "language": "English",
            "asrConfidence": 0.94,
        },
    },
    {
        "case_id": "PT-2006",
        "name": "A. Becker",
        "age": 26,
        "sex": "F",
        "arrival_mode": "walk-in",
        "minutes_ago": 115,
        "chief_complaint_verbatim": "anxiety attack, chest feels tight",
        "vitals": {"hr": 125, "sbp": 135, "dbp": 88, "rr": 28, "tempC": 36.7, "pain": 2},
        "prior_history": "GAD",
        "capture_session": {
            "transcript": [
                {
                    "speaker": "patient",
                    "text": "I cant catch my breath, I am panicking.",
                }
            ],
            "verbatimComplaint": "anxiety attack, chest feels tight",
            "history": {},
            "voiceSignals": [{"type": "sentence_dyspnea"}],
            "language": "English",
            "asrConfidence": 0.85,
        },
    },
    {
        "case_id": "PT-2007",
        "name": "W. Jackson",
        "age": 60,
        "sex": "M",
        "arrival_mode": "walk-in",
        "minutes_ago": 145,
        "chief_complaint_verbatim": "coughing up green stuff, sweating",
        "vitals": {"hr": 108, "sbp": 102, "dbp": 62, "rr": 24, "tempC": 38.9, "pain": 5},
        "prior_history": "COPD",
        "capture_session": {
            "transcript": [{"speaker": "patient", "text": "Been coughing for days."}],
            "verbatimComplaint": "coughing up green stuff",
            "history": {},
            "voiceSignals": [{"type": "weak"}],
            "language": "English",
            "asrConfidence": 0.91,
        },
    },
]

# Clinical staff directory matching seedDoctors
SEED_STAFF: List[Dict[str, Any]] = [
    # Attendings
    {
        "id": "DOC-01",
        "name": "Dr. Sarah Jenkins",
        "specialization": "Emergency Medicine",
        "role": "Attending",
        "status": "available",
        "currentPatientId": None,
    },
    {
        "id": "DOC-02",
        "name": "Dr. Marcus Webb",
        "specialization": "Trauma Surgery",
        "role": "Attending",
        "status": "available",
        "currentPatientId": None,
    },
    {
        "id": "DOC-03",
        "name": "Dr. Elena Rostova",
        "specialization": "Cardiology (On Call)",
        "role": "Attending",
        "status": "available",
        "currentPatientId": None,
    },
    {
        "id": "DOC-04",
        "name": "Dr. Aisha Patel",
        "specialization": "Pediatric Emergency",
        "role": "Attending",
        "status": "break",
        "currentPatientId": None,
    },
    {
        "id": "DOC-05",
        "name": "Dr. Kenji Tanaka",
        "specialization": "Neurology (Stroke Team)",
        "role": "Attending",
        "status": "available",
        "currentPatientId": None,
    },
    # Fellows
    {
        "id": "FEL-01",
        "name": "Dr. David Cho",
        "specialization": "Critical Care Fellow",
        "role": "Fellow",
        "status": "available",
        "currentPatientId": None,
    },
    {
        "id": "FEL-02",
        "name": "Dr. Rachel Green",
        "specialization": "Pediatric Fellow",
        "role": "Fellow",
        "status": "available",
        "currentPatientId": None,
    },
    # Residents
    {
        "id": "RES-01",
        "name": "Dr. James Chen",
        "specialization": "Emergency Med PGY-3",
        "role": "Resident",
        "status": "available",
        "currentPatientId": None,
    },
    {
        "id": "RES-02",
        "name": "Dr. Maria Garcia",
        "specialization": "Emergency Med PGY-2",
        "role": "Resident",
        "status": "available",
        "currentPatientId": None,
    },
    {
        "id": "RES-03",
        "name": "Dr. Liam O'Connor",
        "specialization": "General Surgery PGY-2",
        "role": "Resident",
        "status": "available",
        "currentPatientId": None,
    },
    {
        "id": "RES-04",
        "name": "Dr. Chloe Smith",
        "specialization": "Emergency Med PGY-3",
        "role": "Resident",
        "status": "available",
        "currentPatientId": None,
    },
    # Interns
    {
        "id": "INT-01",
        "name": "Dr. Sam Wilson",
        "specialization": "Intern PGY-1",
        "role": "Intern",
        "status": "available",
        "currentPatientId": None,
    },
    {
        "id": "INT-02",
        "name": "Dr. Taylor Swift",
        "specialization": "Intern PGY-1",
        "role": "Intern",
        "status": "break",
        "currentPatientId": None,
    },
    {
        "id": "INT-03",
        "name": "Dr. Ben Wyatt",
        "specialization": "Intern PGY-1",
        "role": "Intern",
        "status": "available",
        "currentPatientId": None,
    },
    # Nursing Leadership
    {
        "id": "NUR-01",
        "name": "RN Jessica Okafor",
        "specialization": "Charge Nurse",
        "role": "Charge Nurse",
        "status": "available",
        "currentPatientId": None,
    },
    {
        "id": "NUR-02",
        "name": "RN David Rose",
        "specialization": "Triage Lead",
        "role": "Charge Nurse",
        "status": "available",
        "currentPatientId": None,
    },
]


async def seed_database(session: Optional[AsyncSession] = None) -> None:
    """Populate database with synthetic patients, vitals, timeline events, decisions, and staff.
    
    Args:
        session: Optional async session. If not provided, a new session is created.
    """
    await create_tables()

    if session is not None:
        await _seed_with_session(session)
    else:
        async with AsyncSessionLocal() as new_session:
            await _seed_with_session(new_session)


async def _seed_with_session(session: AsyncSession) -> None:
    """Internal helper to seed records within an active async session."""
    # 1. Seed Staff Members
    for staff_data in SEED_STAFF:
        existing_staff = await session.get(Staff, staff_data["id"])
        if not existing_staff:
            staff_member = Staff(
                id=staff_data["id"],
                name=staff_data["name"],
                specialization=staff_data["specialization"],
                role=staff_data["role"],
                status=staff_data["status"],
                current_patient_id=staff_data.get("currentPatientId"),
            )
            session.add(staff_member)

    # 2. Seed Patients with Vitals, Timeline, CaptureSession, and Scored Decision
    for p_data in SEED_PATIENTS:
        case_id = p_data["case_id"]
        existing_patient = await session.get(Patient, case_id)
        if existing_patient:
            continue

        arrival_dt = subtract_minutes(p_data["minutes_ago"])

        # Patient Entity
        patient = Patient(
            case_id=case_id,
            name=p_data["name"],
            age=p_data["age"],
            sex=p_data["sex"],
            arrival_mode=p_data["arrival_mode"],
            arrival_time=arrival_dt,
            chief_complaint_verbatim=p_data["chief_complaint_verbatim"],
            prior_history=p_data.get("prior_history"),
            current_stage="queue",
        )
        session.add(patient)

        # Initial Vitals Reading
        vitals_dict = p_data["vitals"]
        vitals_reading = VitalsReading(
            patient_id=case_id,
            hr=vitals_dict.get("hr"),
            sbp=vitals_dict.get("sbp"),
            dbp=vitals_dict.get("dbp"),
            rr=vitals_dict.get("rr"),
            spo2=vitals_dict.get("spo2"),
            temp_c=vitals_dict.get("tempC"),
            pain=vitals_dict.get("pain"),
            recorded_at=arrival_dt,
            source="intake",
        )
        session.add(vitals_reading)

        # Arrival Timeline Event
        timeline_event = TimelineEvent(
            patient_id=case_id,
            time=arrival_dt,
            description=f"Patient arrived via {p_data['arrival_mode']}. Chief complaint: {p_data['chief_complaint_verbatim']}.",
            type="arrival",
        )
        session.add(timeline_event)

        # Capture Session
        cs_data = p_data.get("capture_session")
        if cs_data:
            capture_session = CaptureSession(
                patient_id=case_id,
                transcript=cs_data.get("transcript", []),
                verbatim_complaint=cs_data.get("verbatimComplaint", p_data["chief_complaint_verbatim"]),
                history_extracted=cs_data.get("history", {}),
                voice_signals=cs_data.get("voiceSignals", []),
                language=cs_data.get("language", "English"),
                asr_confidence=cs_data.get("asrConfidence", 1.0),
            )
            session.add(capture_session)

        # Initial Triage Decision (scored via engine)
        scorer_payload = {
            "caseId": case_id,
            "name": p_data["name"],
            "age": p_data["age"],
            "sex": p_data["sex"],
            "arrivalMode": p_data["arrival_mode"],
            "arrivalTime": arrival_dt.isoformat(),
            "chiefComplaintVerbatim": p_data["chief_complaint_verbatim"],
            "vitals": vitals_dict,
            "priorHistory": p_data.get("prior_history"),
            "captureSession": cs_data,
        }
        decision_result = score_patient(scorer_payload, is_surge=False)

        decision = TriageDecision(
            patient_id=case_id,
            recommended_esi=decision_result["recommendedESI"],
            confidence=decision_result["confidence"],
            risk_profile=decision_result["riskProfile"],
            flag=decision_result["flag"],
            explanation=decision_result["explanation"],
            is_current=True,
            model_version="1.0.0",
            scored_at=arrival_dt,
        )
        session.add(decision)

    await session.commit()


if __name__ == "__main__":
    asyncio.run(seed_database())
