import type { PatientEncounter } from '../types';

const now = new Date();
const subtractMinutes = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();

export const queuePatients: PatientEncounter[] = [
  {
    caseId: 'PT-1004',
    name: 'R. Silva',
    age: 61,
    sex: 'M',
    arrivalMode: 'walk-in',
    arrivalTime: subtractMinutes(85),
    chiefComplaintVerbatim: "short of breath, worse lying flat",
    vitals: { hr: 98, sbp: 140, dbp: 85, rr: 20, spo2: 95 },
    priorHistory: 'CHF, HTN',
    captureSession: {
      transcript: [{ speaker: 'patient', text: 'I am so short of breath, it gets worse when I lie flat.' }],
      verbatimComplaint: "short of breath, worse lying flat",
      history: {},
      voiceSignals: [{ type: 'sentence_dyspnea' }],
      language: 'English',
      asrConfidence: 0.92
    }
  },
  {
    caseId: 'PT-1005',
    name: 'T. Adeyemi',
    age: 29,
    sex: 'F',
    arrivalMode: 'walk-in',
    arrivalTime: subtractMinutes(60),
    chiefComplaintVerbatim: "lower abdominal pain 6/10",
    vitals: { hr: 90, sbp: 120, dbp: 75, rr: 16, tempC: 37.2, pain: 6 },
    priorHistory: 'None',
    captureSession: {
      transcript: [{ speaker: 'patient', text: 'I have this sharp lower abdominal pain, about a 6 out of 10.' }],
      verbatimComplaint: "lower abdominal pain 6/10",
      history: { 'Pain Scale': '6/10', 'Location': 'Lower abdomen' },
      voiceSignals: [{ type: 'none' }],
      language: 'English',
      asrConfidence: 0.95
    }
  },
  {
    caseId: 'PT-1008',
    name: 'M. Garcia',
    age: 45,
    sex: 'F',
    arrivalMode: 'walk-in',
    arrivalTime: subtractMinutes(120),
    chiefComplaintVerbatim: "dolor de cabeza fuerte",
    vitals: { hr: 85, sbp: 140, dbp: 90, rr: 16, pain: 8 },
    priorHistory: 'Migraines',
    captureSession: {
      transcript: [{ speaker: 'patient', text: 'Tengo un dolor de cabeza muy fuerte.' }],
      verbatimComplaint: "dolor de cabeza fuerte",
      history: { 'Symptom': 'Headache' },
      voiceSignals: [{ type: 'none' }],
      language: 'Spanish',
      asrConfidence: 0.85
    }
  },
  {
    caseId: 'PT-2004', name: 'O. Martinez', age: 19, sex: 'M', arrivalMode: 'walk-in', arrivalTime: subtractMinutes(65), chiefComplaintVerbatim: 'burning when I pee for 3 days',
    vitals: { hr: 82, sbp: 118, dbp: 76, rr: 14, tempC: 37.8, pain: 4 }, priorHistory: 'None',
    captureSession: { transcript: [{ speaker: 'patient', text: 'Burns when I pee.' }], verbatimComplaint: 'burning when I pee', history: {}, voiceSignals: [{ type: 'none' }], language: 'English', asrConfidence: 0.99 }
  },
  {
    caseId: 'PT-2005', name: 'D. Kim', age: 75, sex: 'M', arrivalMode: 'walk-in', arrivalTime: subtractMinutes(95), chiefComplaintVerbatim: 'fell at home, hit my head, on blood thinners',
    vitals: { hr: 72, sbp: 160, dbp: 85, rr: 16, tempC: 36.6, pain: 3 }, priorHistory: 'AFib (on Eliquis)',
    captureSession: { transcript: [{ speaker: 'patient', text: 'I tripped on a rug.' }], verbatimComplaint: 'fell at home, hit my head', history: {}, voiceSignals: [{ type: 'none' }], language: 'English', asrConfidence: 0.94 }
  },
  {
    caseId: 'PT-2006', name: 'A. Becker', age: 26, sex: 'F', arrivalMode: 'walk-in', arrivalTime: subtractMinutes(115), chiefComplaintVerbatim: 'anxiety attack, chest feels tight',
    vitals: { hr: 125, sbp: 135, dbp: 88, rr: 28, tempC: 36.7, pain: 2 }, priorHistory: 'GAD',
    captureSession: { transcript: [{ speaker: 'patient', text: 'I cant catch my breath, I am panicking.' }], verbatimComplaint: 'anxiety attack, chest feels tight', history: {}, voiceSignals: [{ type: 'sentence_dyspnea' }], language: 'English', asrConfidence: 0.85 }
  },
  {
    caseId: 'PT-2007', name: 'W. Jackson', age: 60, sex: 'M', arrivalMode: 'walk-in', arrivalTime: subtractMinutes(145), chiefComplaintVerbatim: 'coughing up green stuff, sweating',
    vitals: { hr: 108, sbp: 102, dbp: 62, rr: 24, tempC: 38.9, pain: 5 }, priorHistory: 'COPD',
    captureSession: { transcript: [{ speaker: 'patient', text: 'Been coughing for days.' }], verbatimComplaint: 'coughing up green stuff', history: {}, voiceSignals: [{ type: 'weak' }], language: 'English', asrConfidence: 0.91 }
  },
];

export const incomingDemoPatients: PatientEncounter[] = [
  {
    caseId: 'PT-9001',
    name: 'M. Rowe',
    age: 67,
    sex: 'M',
    arrivalMode: 'ambulance',
    arrivalTime: subtractMinutes(0),
    chiefComplaintVerbatim: "crushing chest pain, can't breathe",
    vitals: { hr: 132, sbp: 82, dbp: 54, rr: 28, spo2: 86 },
    priorHistory: 'Hypertension, CABG 2018',
    prehospital: {
      serialVitals: [
        { time: subtractMinutes(20), vitals: { hr: 140, sbp: 90, dbp: 60, rr: 30, spo2: 84 } },
        { time: subtractMinutes(10), vitals: { hr: 135, sbp: 85, dbp: 55, rr: 29, spo2: 85 } },
      ],
      ecg: 'ST elevation V1-V4',
      interventions: ['O2 15L NRB', 'ASA 324mg'],
      gcs: 14,
      preNotification: 'STEMI Alert',
    },
    captureSession: {
      transcript: [
        { speaker: 'responder', text: 'Medic 41 arriving with a 67-year-old male, STEMI positive in the field.' },
        { speaker: 'responder', text: 'Patient started complaining of crushing chest pain about 45 minutes ago while mowing the lawn.' },
        { speaker: 'patient', text: 'It... it hurts so much... I can\'t catch my breath...' },
        { speaker: 'responder', text: 'We gave him 324 of aspirin and he is on 15 liters of oxygen.' },
        { speaker: 'responder', text: 'Last pressure was 82 over 54. He looks pale and diaphoretic.' }
      ],
      verbatimComplaint: "crushing chest pain, can't breathe",
      history: { OPQRST: 'Onset 1h ago, crushing, 10/10' },
      voiceSignals: [{ type: 'sentence_dyspnea' }, { type: 'weak' }],
      language: 'English',
      asrConfidence: 0.95
    }
  },
  {
    caseId: 'PT-9002',
    name: 'P. Nnamdi',
    age: 78,
    sex: 'F',
    arrivalMode: 'ambulance',
    arrivalTime: subtractMinutes(0),
    chiefComplaintVerbatim: "confused since this morning, not herself",
    vitals: { hr: 88, sbp: 155, dbp: 90, rr: 18, spo2: 97 },
    priorHistory: 'AFib, HTN',
    prehospital: {
      serialVitals: [{ time: subtractMinutes(30), vitals: { hr: 90, sbp: 160, dbp: 95, rr: 18, spo2: 96 } }],
      interventions: ['IV established', 'Stroke screen positive'],
      gcs: 13,
      preNotification: 'Stroke Alert'
    },
    captureSession: {
      transcript: [
        { speaker: 'responder', text: 'EMS bringing in a 78-year-old female, positive stroke screen.' },
        { speaker: 'family', text: 'She woke up like this. She was totally fine last night before bed around 10 PM.' },
        { speaker: 'responder', text: 'Last known normal was 10 PM last night. Daughter says she woke up confused this morning.' },
        { speaker: 'family', text: 'Mom, can you squeeze my hand? She\'s just not herself, her speech is all slurred.' },
        { speaker: 'patient', text: 'I... don... know... what... happ...' },
        { speaker: 'responder', text: 'Right side seems completely flaccid. We established an 18 gauge in the left AC.' }
      ],
      verbatimComplaint: "confused since this morning, not herself",
      history: { Onset: 'Morning' },
      voiceSignals: [{ type: 'slurred_speech' }],
      language: 'English',
      asrConfidence: 0.70
    }
  },
  {
    caseId: 'PT-9003',
    name: 'E. Rossi',
    age: 34,
    sex: 'M',
    arrivalMode: 'walk-in',
    arrivalTime: subtractMinutes(0),
    chiefComplaintVerbatim: 'sharp pain in my right flank, throwing up',
    vitals: { hr: 110, sbp: 138, dbp: 86, rr: 20, tempC: 37.1, pain: 10 },
    priorHistory: 'Kidney stones',
    captureSession: {
      transcript: [
        { speaker: 'responder', text: 'Hi sir, check-in is right here. What brings you to the ER today?' },
        { speaker: 'patient', text: 'Oh man... I have this incredibly sharp pain... right here on my right side.' },
        { speaker: 'responder', text: 'How long has it been hurting?' },
        { speaker: 'patient', text: 'It started about two hours ago. It comes in waves but it\'s excruciating.' },
        { speaker: 'patient', text: 'I\'ve been throwing up in the bathroom for the last twenty minutes. I can\'t even stand up straight.' },
        { speaker: 'responder', text: 'Have you had pain like this before?' },
        { speaker: 'patient', text: 'Yeah, I had kidney stones three years ago. It feels exactly like that.' }
      ],
      verbatimComplaint: 'sharp pain in my right flank, throwing up',
      history: { 'Pain Scale': '10/10', 'Prior Condition': 'Kidney stones (3 years ago)' },
      voiceSignals: [{ type: 'none' }],
      language: 'English',
      asrConfidence: 0.95
    }
  },
  {
    caseId: 'PT-9004',
    name: 'L. Singh',
    age: 31,
    sex: 'F',
    arrivalMode: 'walk-in',
    arrivalTime: subtractMinutes(0),
    chiefComplaintVerbatim: 'allergic reaction to shrimp, lips swelling',
    vitals: { hr: 122, sbp: 105, dbp: 65, rr: 28, tempC: 37.0, pain: 0 },
    priorHistory: 'Mild shellfish allergy',
    captureSession: {
      transcript: [
        { speaker: 'patient', text: 'Excuse me, I need help right now.' },
        { speaker: 'responder', text: 'What is going on, miss?' },
        { speaker: 'patient', text: 'I ate at a Thai restaurant and I think there was shrimp cross-contamination.' },
        { speaker: 'patient', text: 'My lips are swelling up really fast and my throat feels incredibly tight.' },
        { speaker: 'responder', text: 'Are you having trouble breathing?' },
        { speaker: 'patient', text: 'Yes, it\'s getting harder to swallow and breath... I don\'t have my EpiPen on me.' },
        { speaker: 'responder', text: 'Okay, we are going to get you back right away.' }
      ],
      verbatimComplaint: 'allergic reaction to shrimp, lips swelling',
      history: { 'Suspected Trigger': 'Shrimp (Thai restaurant)', 'Missing Meds': 'EpiPen' },
      voiceSignals: [{ type: 'sentence_dyspnea' }],
      language: 'English',
      asrConfidence: 0.89
    }
  },
  {
    caseId: 'PT-9005',
    name: 'M. Cohen',
    age: 8,
    sex: 'M',
    arrivalMode: 'walk-in',
    arrivalTime: subtractMinutes(0),
    chiefComplaintVerbatim: 'fell off monkey bars, arm looks bent',
    vitals: { hr: 120, sbp: 95, dbp: 60, rr: 22, tempC: 36.8, pain: 10 },
    priorHistory: 'Asthma',
    weightKg: 28,
    captureSession: {
      transcript: [
        { speaker: 'family', text: 'Please help, my son fell at the playground!' },
        { speaker: 'responder', text: 'Okay, deep breaths. What happened?' },
        { speaker: 'family', text: 'He was on the monkey bars and slipped. He fell right on his left arm.' },
        { speaker: 'patient', text: '[Crying loudly] It hurts! It hurts so bad!' },
        { speaker: 'family', text: 'His arm looks totally bent out of shape, I think it\'s definitely broken.' },
        { speaker: 'responder', text: 'Okay buddy, I know it hurts. We are going to get a doctor to look at it very soon.' }
      ],
      verbatimComplaint: 'fell off monkey bars, arm looks bent',
      history: { 'Mechanism': 'Fall from height' },
      voiceSignals: [{ type: 'none' }],
      language: 'English',
      asrConfidence: 0.98
    }
  }
];
