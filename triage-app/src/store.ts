import { create } from 'zustand';
import type { PatientEncounter, TriageDecision, AuditRecord, Doctor } from './types';
import { api } from './api/client';
import { scorePatient } from './engine/scoringEngine';
import { queuePatients } from './data/patients';
import { seedDoctors } from './data/doctors';

interface PatientState {
  patients: PatientEncounter[];
  decisions: Record<string, TriageDecision>;
  auditLogs: AuditRecord[];
  doctors: Doctor[];
  isSurgeMode: boolean;
  currentTime: Date;
  escalatedCaseId: string | null;
  backendOnline: boolean;

  // Actions
  loadFromBackend: () => Promise<void>;
  addPatient: (patient: PatientEncounter) => void;
  assignDoctor: (doctorId: string, patientId: string | null) => void;
  setDoctorStatus: (doctorId: string, status: 'available' | 'busy' | 'break') => void;
  toggleSurgeMode: () => void;
  advanceTime: (minutes: number) => void;
  submitDecision: (caseId: string, assignedESI: number, overrideReason?: string) => void;
  reScoreAll: () => void;
  dismissEscalation: (reason: string) => void;
}

// ── Fallback: compute local initial state in case backend is down ──
const fallbackPatients = queuePatients.map(p => ({
  ...p,
  timeline: [{ time: p.arrivalTime, description: 'Patient arrived at ED', type: 'arrival' as const }]
}));
const fallbackDecisions = fallbackPatients.reduce((acc, p) => {
  acc[p.caseId] = scorePatient(p, false);
  return acc;
}, {} as Record<string, TriageDecision>);

export const useStore = create<PatientState>((set, get) => ({
  patients: fallbackPatients,
  decisions: fallbackDecisions,
  auditLogs: [],
  doctors: seedDoctors,
  isSurgeMode: false,
  currentTime: new Date(),
  escalatedCaseId: null,
  backendOnline: false,

  // ── Load all data from backend API ──────────────────────────────────
  loadFromBackend: async () => {
    try {
      const [patientsRaw, staffRaw] = await Promise.all([
        api.listPatients(),
        api.listStaff(),
      ]);

      const patients: PatientEncounter[] = patientsRaw.map((p: any) => ({
        caseId: p.caseId,
        name: p.name,
        age: p.age,
        sex: p.sex,
        arrivalMode: p.arrivalMode,
        arrivalTime: p.arrivalTime,
        chiefComplaintVerbatim: p.chiefComplaintVerbatim,
        vitals: {
          hr: p.vitals?.hr,
          sbp: p.vitals?.sbp,
          dbp: p.vitals?.dbp,
          rr: p.vitals?.rr,
          spo2: p.vitals?.spo2,
          tempC: p.vitals?.tempC,
          pain: p.vitals?.pain,
        },
        weightKg: p.weightKg,
        priorHistory: p.priorHistory,
        prehospital: p.prehospital,
        captureSession: p.captureSession,
        timeline: p.timeline || [],
      }));

      const decisions: Record<string, TriageDecision> = {};
      for (const p of patientsRaw) {
        if (p.decision) {
          decisions[p.caseId] = p.decision;
        }
      }

      const doctors: Doctor[] = staffRaw.map((s: any) => ({
        id: s.id,
        name: s.name,
        specialization: s.specialization,
        role: s.role,
        status: s.status,
        currentPatientId: s.currentPatientId,
      }));

      set({ patients, decisions, doctors, backendOnline: true });
      console.log('✅ Loaded from backend:', patients.length, 'patients,', doctors.length, 'staff');
    } catch (err) {
      console.warn('⚠️ Backend unavailable, using local fallback data:', err);
      set({ backendOnline: false });
    }
  },

  // ── Add patient (from Intake) ───────────────────────────────────────
  addPatient: (patient) => {
    const state = get();
    if (state.patients.some(p => p.caseId === patient.caseId)) return;

    // Optimistic local update
    const pWithTimeline = {
      ...patient,
      timeline: [{ time: new Date().toISOString(), description: 'Patient arrived at ED', type: 'arrival' as const }]
    };
    const localDecision = scorePatient(pWithTimeline, state.isSurgeMode);
    set({
      patients: [pWithTimeline, ...state.patients],
      decisions: { ...state.decisions, [patient.caseId]: localDecision },
    });

    // Fire-and-forget to backend
    if (state.backendOnline) {
      api.createPatient(patient).then(res => {
        if (res.decision) {
          set(s => ({
            decisions: { ...s.decisions, [patient.caseId]: res.decision },
          }));
        }
      }).catch(err => console.warn('Backend create failed:', err));
    }
  },

  // ── Assign doctor to patient ────────────────────────────────────────
  assignDoctor: (doctorId, patientId) => {
    const state = get();

    // Optimistic local update
    let updatedPatients = state.patients;
    if (patientId) {
      updatedPatients = state.patients.map(p => {
        if (p.caseId === patientId) {
          const doc = state.doctors.find(d => d.id === doctorId);
          return {
            ...p,
            timeline: [...(p.timeline || []), { time: new Date().toISOString(), description: `Assigned to ${doc?.name}`, type: 'assigned_bed' as const }]
          };
        }
        return p;
      });
    }

    set({
      patients: updatedPatients,
      doctors: state.doctors.map(d =>
        d.id === doctorId ? { ...d, currentPatientId: patientId || undefined, status: patientId ? 'busy' : 'available' } : d
      ),
    });

    // Fire-and-forget to backend
    if (state.backendOnline) {
      api.updateStaff(doctorId, { patientId }).catch(err => console.warn('Backend assign failed:', err));
    }
  },

  // ── Set doctor status ───────────────────────────────────────────────
  setDoctorStatus: (doctorId, status) => {
    set(state => ({
      doctors: state.doctors.map(d =>
        d.id === doctorId ? { ...d, status, currentPatientId: status === 'available' ? undefined : d.currentPatientId } : d
      ),
    }));

    if (get().backendOnline) {
      api.updateStaff(doctorId, { status }).catch(err => console.warn('Backend status failed:', err));
    }
  },

  // ── Toggle surge mode ───────────────────────────────────────────────
  toggleSurgeMode: () => {
    const state = get();
    const newSurge = !state.isSurgeMode;

    // Local rescore
    const newDecisions = { ...state.decisions };
    state.patients.forEach(p => {
      newDecisions[p.caseId] = scorePatient(p, newSurge);
    });
    set({ isSurgeMode: newSurge, decisions: newDecisions });

    // Backend
    if (state.backendOnline) {
      api.toggleSurge().catch(err => console.warn('Backend surge failed:', err));
    }
  },

  // ── Advance time (demo simulation) ─────────────────────────────────
  advanceTime: (minutes: number) => set(state => {
    const newTime = new Date(state.currentTime.getTime() + minutes * 60000);

    const newPatients = state.patients.map(p => {
      if (p.caseId === 'PT-2004') {
        return {
          ...p,
          vitals: { ...p.vitals, hr: 112, spo2: 92 },
          timeline: [...(p.timeline || []), { time: newTime.toISOString(), description: 'Vitals re-check detected deterioration (HR 112, SpO2 92%)', type: 'deterioration_alert' as const }]
        };
      }
      return p;
    });

    const newDecisions = { ...state.decisions };
    let escalated = state.escalatedCaseId;

    newPatients.forEach(p => {
      const oldESI = state.decisions[p.caseId]?.recommendedESI;
      const newDecision = scorePatient(p, state.isSurgeMode);
      newDecisions[p.caseId] = newDecision;
      if (oldESI !== undefined && newDecision.recommendedESI < oldESI) {
        escalated = p.caseId;
      }
    });

    return { currentTime: newTime, patients: newPatients, decisions: newDecisions, escalatedCaseId: escalated };
  }),

  // ── Dismiss escalation ──────────────────────────────────────────────
  dismissEscalation: (_reason: string) => set({ escalatedCaseId: null }),

  // ── Submit nurse decision (triage sign-off) ─────────────────────────
  submitDecision: (caseId, assignedESI, overrideReason) => {
    const state = get();
    const decision = state.decisions[caseId];
    if (!decision) return;

    // Local audit log
    const log: AuditRecord = {
      caseId,
      recommendedESI: decision.recommendedESI,
      assignedESI,
      flag: decision.flag,
      overrideReason: overrideReason || '',
      reviewLatencySec: 10,
      timestamp: new Date().toISOString(),
      modelVersion: '1.0.0',
      captureConsentState: true,
    };

    const updatedPatients = state.patients.map(p => {
      if (p.caseId === caseId) {
        return {
          ...p,
          timeline: [...(p.timeline || []), { time: new Date().toISOString(), description: `Nurse assigned ESI ${assignedESI}`, type: 'triage' as const }]
        };
      }
      return p;
    });

    set({
      auditLogs: [...state.auditLogs, log],
      patients: updatedPatients,
    });

    // Backend
    if (state.backendOnline) {
      api.submitTriage(caseId, assignedESI, overrideReason).catch(err => console.warn('Backend triage failed:', err));
    }
  },

  // ── Re-score all patients ───────────────────────────────────────────
  reScoreAll: () => {
    const state = get();
    const newDecisions = { ...state.decisions };
    state.patients.forEach(p => {
      newDecisions[p.caseId] = scorePatient(p, state.isSurgeMode);
    });
    set({ decisions: newDecisions });

    if (state.backendOnline) {
      api.rescoreAll().catch(err => console.warn('Backend rescore failed:', err));
    }
  },
}));
