import type { Doctor } from '../types';

export const seedDoctors: Doctor[] = [
  // Attendings
  { id: 'DOC-01', name: 'Dr. Sarah Jenkins', specialization: 'Emergency Medicine', role: 'Attending', status: 'available' },
  { id: 'DOC-02', name: 'Dr. Marcus Webb', specialization: 'Trauma Surgery', role: 'Attending', status: 'available' },
  { id: 'DOC-03', name: 'Dr. Elena Rostova', specialization: 'Cardiology (On Call)', role: 'Attending', status: 'available' },
  { id: 'DOC-04', name: 'Dr. Aisha Patel', specialization: 'Pediatric Emergency', role: 'Attending', status: 'break' },
  { id: 'DOC-05', name: 'Dr. Kenji Tanaka', specialization: 'Neurology (Stroke Team)', role: 'Attending', status: 'available' },

  // Fellows
  { id: 'FEL-01', name: 'Dr. David Cho', specialization: 'Critical Care Fellow', role: 'Fellow', status: 'available' },
  { id: 'FEL-02', name: 'Dr. Rachel Green', specialization: 'Pediatric Fellow', role: 'Fellow', status: 'available' },

  // Residents (PGY-2 / PGY-3)
  { id: 'RES-01', name: 'Dr. James Chen', specialization: 'Emergency Med PGY-3', role: 'Resident', status: 'available' },
  { id: 'RES-02', name: 'Dr. Maria Garcia', specialization: 'Emergency Med PGY-2', role: 'Resident', status: 'available' },
  { id: 'RES-03', name: 'Dr. Liam O\'Connor', specialization: 'General Surgery PGY-2', role: 'Resident', status: 'available' },
  { id: 'RES-04', name: 'Dr. Chloe Smith', specialization: 'Emergency Med PGY-3', role: 'Resident', status: 'available' },

  // Interns (PGY-1)
  { id: 'INT-01', name: 'Dr. Sam Wilson', specialization: 'Intern PGY-1', role: 'Intern', status: 'available' },
  { id: 'INT-02', name: 'Dr. Taylor Swift', specialization: 'Intern PGY-1', role: 'Intern', status: 'break' },
  { id: 'INT-03', name: 'Dr. Ben Wyatt', specialization: 'Intern PGY-1', role: 'Intern', status: 'available' },

  // Nursing Leadership
  { id: 'NUR-01', name: 'RN Jessica Okafor', specialization: 'Charge Nurse', role: 'Charge Nurse', status: 'available' },
  { id: 'NUR-02', name: 'RN David Rose', specialization: 'Triage Lead', role: 'Charge Nurse', status: 'available' }
];
