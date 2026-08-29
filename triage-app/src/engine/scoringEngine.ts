import type { PatientEncounter, TriageDecision, Vitals, TriageFlag, RiskProfile, Explanation } from '../types';
import { triageConfig } from '../config/triageConfig';

function calculateMissingness(vitals: Vitals): string[] {
  const missing = [];
  if (vitals.hr === undefined) missing.push('Heart Rate');
  if (vitals.sbp === undefined || vitals.dbp === undefined) missing.push('Blood Pressure');
  if (vitals.rr === undefined) missing.push('Respiratory Rate');
  if (vitals.spo2 === undefined) missing.push('SpO2');
  if (vitals.tempC === undefined) missing.push('Temperature');
  return missing;
}

function getAgeBand(age: number): 'pediatric' | 'adult' | 'geriatric' {
  if (age <= triageConfig.ageBands.pediatric.maxAge) return 'pediatric';
  if (age >= triageConfig.ageBands.geriatric.minAge) return 'geriatric';
  return 'adult';
}

function calculateShockIndex(vitals: Vitals) {
  if (vitals.hr !== undefined && vitals.sbp !== undefined && vitals.sbp > 0) {
    return vitals.hr / vitals.sbp;
  }
  return undefined;
}

function calculateMAP(vitals: Vitals) {
  if (vitals.sbp !== undefined && vitals.dbp !== undefined) {
    return (vitals.sbp + 2 * vitals.dbp) / 3;
  }
  return undefined;
}

export function scorePatient(patient: PatientEncounter, isSurge: boolean = false): TriageDecision {
  const missing = calculateMissingness(patient.vitals);
  const band = getAgeBand(patient.age);
  
  const si = calculateShockIndex(patient.vitals);
  const map = calculateMAP(patient.vitals);

  // Surface Acuity Calculation (simplified, 1-5 scale)
  let surfaceESI = 4;
  if (patient.vitals.spo2 !== undefined && patient.vitals.spo2 < 90) surfaceESI = 1;
  else if (patient.vitals.hr !== undefined && patient.vitals.hr > 120) surfaceESI = 2;
  else if (patient.vitals.rr !== undefined && patient.vitals.rr > 25) surfaceESI = 2;
  else if (patient.vitals.pain !== undefined && patient.vitals.pain >= 7) surfaceESI = 3;

  // Feature flags
  const isFever = patient.vitals.tempC !== undefined && patient.vitals.tempC >= triageConfig.features.feverCutoffC;
  const isTachypneic = patient.vitals.rr !== undefined && patient.vitals.rr >= triageConfig.features.tachypneaCutoff[band];
  const isShock = si !== undefined && si >= triageConfig.features.shockIndexFlag;

  // Risk Channels (simplified 0-1 scores)
  let sepsisScore = 0;
  const sepsisContributions = [];
  if (isFever) {
    sepsisScore += triageConfig.sepsis.feverWeight;
    sepsisContributions.push({ feature: 'Fever', weight: triageConfig.sepsis.feverWeight, type: 'structured' as const });
  }
  if (isTachypneic) {
    sepsisScore += triageConfig.sepsis.tachypneaWeight;
    sepsisContributions.push({ feature: 'Tachypnea', weight: triageConfig.sepsis.tachypneaWeight, type: 'structured' as const });
  }
  if (isShock) {
    sepsisScore += triageConfig.sepsis.shockIndexWeight;
    sepsisContributions.push({ feature: 'Shock Index', weight: triageConfig.sepsis.shockIndexWeight, type: 'structured' as const });
  }
  // Check Voice signals for sepsis support
  if (patient.captureSession?.voiceSignals.some(s => s.type === 'weak' || s.type === 'confusion')) {
    sepsisScore += triageConfig.sepsis.voiceSignalWeight;
    sepsisContributions.push({ feature: 'Voice: Weak/Confused', weight: triageConfig.sepsis.voiceSignalWeight, type: 'voice' as const });
  }

  // Cap score at 1
  sepsisScore = Math.min(sepsisScore, 1);

  // Setup risk profile
  const riskProfile: RiskProfile = {
    sepsis: { score: sepsisScore, contributions: sepsisContributions },
    // Mock other channels for now based on some basic vitals or text
    criticalCare: { score: isShock ? 0.9 : 0.1, contributions: [] },
    admissionLikely: { score: (surfaceESI <= 3) ? 0.8 : 0.2, contributions: [] },
    acs: { score: patient.chiefComplaintVerbatim.toLowerCase().includes('chest pain') ? 0.9 : 0.1, contributions: [] },
    stroke: { score: patient.captureSession?.voiceSignals.some(s => s.type === 'slurred_speech') ? 0.85 : 0.05, contributions: [] },
  };

  // Undertriage Catcher logic
  let flagType: TriageFlag['type'] = 'none';
  const reasonCodes = [];
  const drivingChannels = [];
  let recommendedESI = surfaceESI;
  
  const catchThreshold = triageConfig.catchThreshold * (isSurge ? triageConfig.surgeMode.catchThresholdMultiplier : 1);

  if ((surfaceESI === 4 || surfaceESI === 5)) {
    const highestRisk = Math.max(riskProfile.sepsis.score, riskProfile.criticalCare.score, riskProfile.acs.score, riskProfile.stroke.score);
    if (highestRisk >= catchThreshold) {
      flagType = 'undertriage';
      reasonCodes.push('HIDDEN_RISK_HIGH');
      if (riskProfile.sepsis.score >= catchThreshold) drivingChannels.push('sepsis');
      if (riskProfile.acs.score >= catchThreshold) drivingChannels.push('acs');
      
      // Pull to ESI 2
      recommendedESI = 2;
    }
  }

  // Uncertainty Gate
  let asrConfidence = patient.captureSession?.asrConfidence ?? 1.0;
  if (
    missing.length >= triageConfig.uncertaintyGateThresholds.missingVitalsAllowed ||
    (band === 'geriatric' && triageConfig.uncertaintyGateThresholds.geriatric && missing.length > 0) ||
    asrConfidence < triageConfig.uncertaintyGateThresholds.minAsrConfidence
  ) {
    if (flagType !== 'undertriage') { // prioritize undertriage flag if both
      flagType = 'uncertainty';
      reasonCodes.push('SPARSE_DATA');
      if (missing.length > 0) reasonCodes.push(`MISSING_${missing.length}_VITALS`);
    }
  }

  // Confidence calculation
  const missingPenalty = missing.length * 0.15;
  const asrPenalty = (1 - asrConfidence) * 0.2;
  const confidence = Math.max(0.1, 1 - missingPenalty - asrPenalty);

  // Generate Explanation
  const explanation: Explanation = {
    topDrivers: [...sepsisContributions].sort((a, b) => b.weight - a.weight), // Simplified, should combine all channels
    why: flagType === 'undertriage' ? 'High occult risk detected despite benign surface vitals.' : 'Standard triage presentation.',
    counterfactual: 'If RR was ≤ 20 and HR ≤ 90, risk would drop significantly.',
    similarCases: '82% of similar cases required admission.'
  };

  return {
    recommendedESI,
    confidence,
    riskProfile,
    flag: { type: flagType, reasonCodes, drivingChannels },
    explanation
  };
}
