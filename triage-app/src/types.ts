export type ArrivalMode = 'walk-in' | 'ambulance' | 'referral' | 'police' | 'unknown';
export type Sex = 'M' | 'F' | 'O' | 'U';

export interface Vitals {
  hr?: number;
  sbp?: number;
  dbp?: number;
  rr?: number;
  spo2?: number;
  tempC?: number;
  pain?: number;
}

export interface VoiceSignal {
  type: 'slurred_speech' | 'sentence_dyspnea' | 'confusion' | 'drowsiness' | 'weak' | 'none';
}

export interface TranscriptLine {
  speaker: 'responder' | 'patient' | 'family';
  text: string;
}

export interface CaptureSession {
  transcript: TranscriptLine[];
  verbatimComplaint: string;
  history: Record<string, string>;
  voiceSignals: VoiceSignal[];
  language: string;
  asrConfidence: number; // 0-1
}

export interface Prehospital {
  serialVitals: Array<{ time: string; vitals: Vitals }>;
  ecg?: string;
  interventions: string[];
  gcs?: number;
  mechanism?: string;
  preNotification?: string;
}

export interface TimelineEvent {
  time: string; // ISO 8601
  description: string;
  type: 'arrival' | 'triage' | 'vitals_check' | 'deterioration_alert' | 'assigned_bed';
}

export interface PatientEncounter {
  caseId: string;
  name: string;
  age: number;
  sex: Sex;
  arrivalMode: ArrivalMode;
  arrivalTime: string; // ISO 8601
  chiefComplaintVerbatim: string;
  vitals: Vitals;
  weightKg?: number; // pediatric
  priorHistory?: string | null;
  prehospital?: Prehospital;
  captureSession?: CaptureSession;
  timeline?: TimelineEvent[];
}

export interface RiskChannelScore {
  score: number; // 0-1
  contributions: Array<{ feature: string; weight: number }>;
}

export interface RiskProfile {
  criticalCare: RiskChannelScore;
  admissionLikely: RiskChannelScore;
  sepsis: RiskChannelScore;
  acs: RiskChannelScore;
  stroke: RiskChannelScore;
}

export interface TriageFlag {
  type: 'undertriage' | 'uncertainty' | 'none';
  reasonCodes: string[];
  drivingChannels: string[]; // e.g., 'sepsis', 'stroke'
}

export interface Explanation {
  topDrivers: Array<{ feature: string; weight: number; type: 'structured' | 'text' | 'voice' }>;
  why: string;
  counterfactual: string;
  similarCases: string;
}

export interface TriageDecision {
  recommendedESI: number;
  confidence: number; // 0-1
  riskProfile: RiskProfile;
  flag: TriageFlag;
  explanation: Explanation;
}

export interface AuditRecord {
  caseId: string;
  recommendedESI: number;
  assignedESI: number;
  flag: TriageFlag;
  overrideReason: string;
  reviewLatencySec: number;
  timestamp: string;
  modelVersion: string;
  captureConsentState: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  role: 'Attending' | 'Fellow' | 'Resident' | 'Intern' | 'Charge Nurse';
  status: 'available' | 'busy' | 'break';
  currentPatientId?: string; // caseId of PatientEncounter
}
