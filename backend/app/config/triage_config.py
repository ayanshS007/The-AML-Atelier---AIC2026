"""Triage configuration parameters and thresholds for PatientTriage.ai."""

from typing import Any, Dict
from pydantic import BaseModel, Field


class PediatricAgeBand(BaseModel):
    maxAge: int = 12


class AdultAgeBand(BaseModel):
    minAge: int = 13
    maxAge: int = 64


class GeriatricAgeBand(BaseModel):
    minAge: int = 65


class AgeBandsConfig(BaseModel):
    pediatric: PediatricAgeBand = Field(default_factory=PediatricAgeBand)
    adult: AdultAgeBand = Field(default_factory=AdultAgeBand)
    geriatric: GeriatricAgeBand = Field(default_factory=GeriatricAgeBand)


class UncertaintyGateConfig(BaseModel):
    missingVitalsAllowed: int = 2
    geriatric: bool = True
    minAsrConfidence: float = 0.6


class TachypneaCutoffConfig(BaseModel):
    pediatric: int = 30
    adult: int = 22
    geriatric: int = 22


class FeaturesConfig(BaseModel):
    shockIndexFlag: float = 0.9
    feverCutoffC: float = 38.0
    tachypneaCutoff: TachypneaCutoffConfig = Field(default_factory=TachypneaCutoffConfig)
    pulsePressureLow: int = 30
    pulsePressureHigh: int = 60


class SepsisConfig(BaseModel):
    feverWeight: float = 0.3
    tachypneaWeight: float = 0.4
    shockIndexWeight: float = 0.4
    voiceSignalWeight: float = 0.2


class SurgeModeConfig(BaseModel):
    catchThresholdMultiplier: float = 0.8
    reScoreIntervalMinutes: int = 5


class TriageConfig(BaseModel):
    catchThreshold: float = 0.75
    ageBands: AgeBandsConfig = Field(default_factory=AgeBandsConfig)
    uncertaintyGateThresholds: UncertaintyGateConfig = Field(default_factory=UncertaintyGateConfig)
    features: FeaturesConfig = Field(default_factory=FeaturesConfig)
    sepsis: SepsisConfig = Field(default_factory=SepsisConfig)
    waitTargets: Dict[int, int] = Field(
        default_factory=lambda: {1: 0, 2: 15, 3: 60, 4: 120, 5: 240}
    )
    surgeMode: SurgeModeConfig = Field(default_factory=SurgeModeConfig)


# Canonical configuration dictionary for runtime scoring
TRIAGE_CONFIG: Dict[str, Any] = {
    "catchThreshold": 0.75,
    "ageBands": {
        "pediatric": {"maxAge": 12},
        "adult": {"minAge": 13, "maxAge": 64},
        "geriatric": {"minAge": 65},
    },
    "uncertaintyGateThresholds": {
        "missingVitalsAllowed": 2,
        "geriatric": True,
        "minAsrConfidence": 0.6,
    },
    "features": {
        "shockIndexFlag": 0.9,
        "feverCutoffC": 38.0,
        "tachypneaCutoff": {"pediatric": 30, "adult": 22, "geriatric": 22},
        "pulsePressureLow": 30,
        "pulsePressureHigh": 60,
    },
    "sepsis": {
        "feverWeight": 0.3,
        "tachypneaWeight": 0.4,
        "shockIndexWeight": 0.4,
        "voiceSignalWeight": 0.2,
    },
    "waitTargets": {1: 0, 2: 15, 3: 60, 4: 120, 5: 240},
    "surgeMode": {
        "catchThresholdMultiplier": 0.8,
        "reScoreIntervalMinutes": 5,
    },
}
