"""Deterministic clinical scoring engine for PatientTriage.ai.

Ports the TypeScript scoring logic with complete parity, calculating surface ESI,
occult risk channels (sepsis, ACS, stroke, critical care, admission),
undertriage detection, and uncertainty gating.
"""

from typing import Any, Dict, List, Optional
from app.config.triage_config import TRIAGE_CONFIG


def calculate_missingness(vitals: Dict[str, Any]) -> List[str]:
    """Identify missing vital signs for uncertainty tracking.
    
    Args:
        vitals: Dictionary containing patient vital signs.
        
    Returns:
        List of missing vital sign names.
    """
    missing: List[str] = []
    if vitals.get("hr") is None:
        missing.append("Heart Rate")
    if vitals.get("sbp") is None or vitals.get("dbp") is None:
        missing.append("Blood Pressure")
    if vitals.get("rr") is None:
        missing.append("Respiratory Rate")
    if vitals.get("spo2") is None:
        missing.append("SpO2")
    if vitals.get("tempC") is None:
        missing.append("Temperature")
    return missing


def get_age_band(age: int) -> str:
    """Determine age band classification.
    
    Args:
        age: Patient age in years.
        
    Returns:
        'pediatric', 'adult', or 'geriatric'.
    """
    if age <= TRIAGE_CONFIG["ageBands"]["pediatric"]["maxAge"]:
        return "pediatric"
    if age >= TRIAGE_CONFIG["ageBands"]["geriatric"]["minAge"]:
        return "geriatric"
    return "adult"


def calculate_shock_index(vitals: Dict[str, Any]) -> Optional[float]:
    """Calculate shock index (HR / SBP).
    
    Args:
        vitals: Dictionary containing patient vital signs.
        
    Returns:
        Shock index as a float, or None if HR or SBP are missing/invalid.
    """
    hr = vitals.get("hr")
    sbp = vitals.get("sbp")
    if hr is not None and sbp is not None and sbp > 0:
        return hr / sbp
    return None


def calculate_map(vitals: Dict[str, Any]) -> Optional[float]:
    """Calculate Mean Arterial Pressure (MAP = (SBP + 2*DBP) / 3).
    
    Args:
        vitals: Dictionary containing patient vital signs.
        
    Returns:
        MAP as a float, or None if SBP or DBP are missing.
    """
    sbp = vitals.get("sbp")
    dbp = vitals.get("dbp")
    if sbp is not None and dbp is not None:
        return (sbp + 2 * dbp) / 3.0
    return None


def score_patient(patient: Dict[str, Any], is_surge: bool = False) -> Dict[str, Any]:
    """Score a patient encounter and compute triage recommendations, risk profiles, and flags.
    
    Args:
        patient: Patient encounter data matching PatientEncounter schema.
        is_surge: Whether the ED is currently in surge mode (lowering catch threshold).
        
    Returns:
        Dictionary matching TriageDecision schema.
    """
    vitals = patient.get("vitals") or {}
    age = patient.get("age", 0)
    capture_session = patient.get("captureSession") or {}
    chief_complaint = str(patient.get("chiefComplaintVerbatim") or "")
    
    missing = calculate_missingness(vitals)
    band = get_age_band(age)
    si = calculate_shock_index(vitals)
    
    # Surface Acuity Calculation (simplified, 1-5 scale)
    surface_esi = 4
    spo2 = vitals.get("spo2")
    hr = vitals.get("hr")
    rr = vitals.get("rr")
    pain = vitals.get("pain")
    
    if spo2 is not None and spo2 < 90:
        surface_esi = 1
    elif hr is not None and hr > 120:
        surface_esi = 2
    elif rr is not None and rr > 25:
        surface_esi = 2
    elif pain is not None and pain >= 7:
        surface_esi = 3
        
    # Feature flags
    temp_c = vitals.get("tempC")
    is_fever = temp_c is not None and temp_c >= TRIAGE_CONFIG["features"]["feverCutoffC"]
    
    tachypnea_cutoff = TRIAGE_CONFIG["features"]["tachypneaCutoff"][band]
    is_tachypneic = rr is not None and rr >= tachypnea_cutoff
    
    shock_flag = TRIAGE_CONFIG["features"]["shockIndexFlag"]
    is_shock = si is not None and si >= shock_flag
    
    # Risk Channels (0-1 scores)
    sepsis_score = 0.0
    sepsis_contributions: List[Dict[str, Any]] = []
    
    if is_fever:
        fever_weight = TRIAGE_CONFIG["sepsis"]["feverWeight"]
        sepsis_score += fever_weight
        sepsis_contributions.append({
            "feature": "Fever",
            "weight": fever_weight,
            "type": "structured",
        })
        
    if is_tachypneic:
        tachypnea_weight = TRIAGE_CONFIG["sepsis"]["tachypneaWeight"]
        sepsis_score += tachypnea_weight
        sepsis_contributions.append({
            "feature": "Tachypnea",
            "weight": tachypnea_weight,
            "type": "structured",
        })
        
    if is_shock:
        shock_weight = TRIAGE_CONFIG["sepsis"]["shockIndexWeight"]
        sepsis_score += shock_weight
        sepsis_contributions.append({
            "feature": "Shock Index",
            "weight": shock_weight,
            "type": "structured",
        })
        
    # Check Voice signals for sepsis support
    voice_signals = capture_session.get("voiceSignals") or []
    has_weak_or_confusion = any(
        (s.get("type") if isinstance(s, dict) else getattr(s, "type", None)) in ("weak", "confusion")
        for s in voice_signals
    )
    if has_weak_or_confusion:
        voice_weight = TRIAGE_CONFIG["sepsis"]["voiceSignalWeight"]
        sepsis_score += voice_weight
        sepsis_contributions.append({
            "feature": "Voice: Weak/Confused",
            "weight": voice_weight,
            "type": "voice",
        })
        
    # Cap sepsis score at 1.0
    sepsis_score = min(sepsis_score, 1.0)
    
    # Other risk channels
    has_chest_pain = "chest pain" in chief_complaint.lower()
    has_slurred_speech = any(
        (s.get("type") if isinstance(s, dict) else getattr(s, "type", None)) == "slurred_speech"
        for s in voice_signals
    )
    
    risk_profile: Dict[str, Any] = {
        "sepsis": {"score": round(sepsis_score, 4), "contributions": sepsis_contributions},
        "criticalCare": {"score": 0.9 if is_shock else 0.1, "contributions": []},
        "admissionLikely": {"score": 0.8 if surface_esi <= 3 else 0.2, "contributions": []},
        "acs": {"score": 0.9 if has_chest_pain else 0.1, "contributions": []},
        "stroke": {"score": 0.85 if has_slurred_speech else 0.05, "contributions": []},
    }
    
    # Undertriage Catcher logic
    flag_type = "none"
    reason_codes: List[str] = []
    driving_channels: List[str] = []
    recommended_esi = surface_esi
    
    catch_multiplier = (
        TRIAGE_CONFIG["surgeMode"]["catchThresholdMultiplier"] if is_surge else 1.0
    )
    catch_threshold = TRIAGE_CONFIG["catchThreshold"] * catch_multiplier
    
    if surface_esi in (4, 5):
        highest_risk = max(
            risk_profile["sepsis"]["score"],
            risk_profile["criticalCare"]["score"],
            risk_profile["acs"]["score"],
            risk_profile["stroke"]["score"],
        )
        if highest_risk >= catch_threshold:
            flag_type = "undertriage"
            reason_codes.append("HIDDEN_RISK_HIGH")
            if risk_profile["sepsis"]["score"] >= catch_threshold:
                driving_channels.append("sepsis")
            if risk_profile["acs"]["score"] >= catch_threshold:
                driving_channels.append("acs")
            recommended_esi = 2
            
    # Uncertainty Gate
    asr_confidence = capture_session.get("asrConfidence")
    if asr_confidence is None:
        asr_confidence = 1.0
        
    missing_allowed = TRIAGE_CONFIG["uncertaintyGateThresholds"]["missingVitalsAllowed"]
    geriatric_uncertainty = TRIAGE_CONFIG["uncertaintyGateThresholds"]["geriatric"]
    min_asr_conf = TRIAGE_CONFIG["uncertaintyGateThresholds"]["minAsrConfidence"]
    
    if (
        len(missing) >= missing_allowed
        or (band == "geriatric" and geriatric_uncertainty and len(missing) > 0)
        or asr_confidence < min_asr_conf
    ):
        if flag_type != "undertriage":  # prioritize undertriage flag if both
            flag_type = "uncertainty"
            reason_codes.append("SPARSE_DATA")
            if len(missing) > 0:
                reason_codes.append(f"MISSING_{len(missing)}_VITALS")
                
    # Confidence calculation
    missing_penalty = len(missing) * 0.15
    asr_penalty = (1.0 - asr_confidence) * 0.2
    confidence = max(0.1, 1.0 - missing_penalty - asr_penalty)
    
    # Generate Explanation
    top_drivers = sorted(sepsis_contributions, key=lambda x: x["weight"], reverse=True)
    explanation: Dict[str, Any] = {
        "topDrivers": top_drivers,
        "why": (
            "High occult risk detected despite benign surface vitals."
            if flag_type == "undertriage"
            else "Standard triage presentation."
        ),
        "counterfactual": "If RR was \u2264 20 and HR \u2264 90, risk would drop significantly.",
        "similarCases": "82% of similar cases required admission.",
    }
    
    return {
        "recommendedESI": recommended_esi,
        "confidence": round(confidence, 4),
        "riskProfile": risk_profile,
        "flag": {
            "type": flag_type,
            "reasonCodes": reason_codes,
            "drivingChannels": driving_channels,
        },
        "explanation": explanation,
    }
