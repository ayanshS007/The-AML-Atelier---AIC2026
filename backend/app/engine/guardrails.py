"""Guardrail enforcement for PatientTriage.ai triage decisions.

Enforces critical clinical safety boundaries, notably THE GOLDEN RULE:
The automated AI system NEVER lowers a human-assigned acuity. Only a human clinician can lower acuity.
"""

from typing import Optional


def validate_decision(new_esi: int, current_esi: Optional[int], is_human: bool) -> int:
    """THE GOLDEN RULE: The system NEVER lowers a human-assigned acuity. Only a human can lower it.
    
    In the Emergency Severity Index (ESI) 1-5 scale:
    - 1 is highest acuity (resuscitation)
    - 5 is lowest acuity (non-urgent)
    
    Therefore:
    - Raising acuity = lower numeric ESI (e.g., 4 -> 2)
    - Lowering acuity = higher numeric ESI (e.g., 2 -> 4)
    
    An automated system recommendation cannot assign a higher numeric ESI (lower acuity)
    than an existing human clinician's assignment. It may only maintain or raise acuity (lower number).
    
    Args:
        new_esi: The candidate ESI level (1-5).
        current_esi: The currently assigned ESI level (if any).
        is_human: True if a human clinician is making/authorizing the decision, False if automated.
        
    Returns:
        Validated ESI level (1-5).
    """
    if current_esi is not None and not is_human:
        return min(new_esi, current_esi)  # Only raise acuity (lower number), never lower
    return new_esi
