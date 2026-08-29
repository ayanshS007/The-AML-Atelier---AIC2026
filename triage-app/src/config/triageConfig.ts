// Knobs and tunable constants for the deterministic triage scoring engine.

export const triageConfig = {
  // Catching / Escalation
  catchThreshold: 0.75, // The max risk channel score required to trigger the undertriage flag for surface ESI 4/5

  // Age Bands
  ageBands: {
    pediatric: { maxAge: 12 },
    adult: { minAge: 13, maxAge: 64 },
    geriatric: { minAge: 65 },
  },

  // Missing data uncertainty gate threshold
  uncertaintyGateThresholds: {
    missingVitalsAllowed: 2, // If more than this number of vital signs are missing, increase uncertainty.
    geriatric: true, // Whether to bias towards uncertainty for geriatric patients.
    minAsrConfidence: 0.6, // Low ASR confidence increases uncertainty.
  },

  // Feature Engineering cutoffs
  features: {
    shockIndexFlag: 0.9, // HR / SBP
    feverCutoffC: 38.0,
    tachypneaCutoff: {
      pediatric: 30, // example higher cutoff for kids
      adult: 22,
      geriatric: 22,
    },
    pulsePressureLow: 30,
    pulsePressureHigh: 60,
  },

  // Sepsis risk weights
  sepsis: {
    feverWeight: 0.3,
    tachypneaWeight: 0.4,
    shockIndexWeight: 0.4,
    voiceSignalWeight: 0.2, // e.g., 'weak', 'confusion'
  },
  
  // Wait time targets by ESI
  waitTargets: {
    1: 0,
    2: 15,
    3: 60,
    4: 120,
    5: 240,
  },

  // Surge mode multipliers
  surgeMode: {
    catchThresholdMultiplier: 0.8, // Lowers threshold, increasing sensitivity
    reScoreIntervalMinutes: 5,
  }
};
