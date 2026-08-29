import React from 'react';
import { useStore } from '../store';
import clsx from 'clsx';
import { Activity } from 'lucide-react';
import type { Doctor } from '../types';

export function Doctors() {
  const { doctors, patients, auditLogs, assignDoctor, setDoctorStatus } = useStore();

  const waitingPatients = patients.filter(p => 
    auditLogs.some(l => l.caseId === p.caseId) && 
    !doctors.some(d => d.currentPatientId === p.caseId)
  );

  const renderDoctorCard = (doc: Doctor) => {
    const isBusy = doc.status === 'busy';
    const patient = doc.currentPatientId ? patients.find(p => p.caseId === doc.currentPatientId) : null;

    return (
      <div key={doc.id} className={clsx("card blueprint flex flex-col", isBusy && "border-accent")}>
        <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-heading mb-1">{doc.name}</h3>
            <div className="text-[10px] text-muted uppercase tracking-wider">{doc.specialization}</div>
          </div>
          <div className={clsx(
            "tag text-[10px]",
            doc.status === 'available' ? "bg-green-100 text-green-800 border-green-200" :
            doc.status === 'break' ? "bg-gray-200 text-gray-800 border-gray-300" :
            "bg-accent-100 text-accent-800 border-accent-200"
          )}>
            {doc.status.toUpperCase()}
          </div>
        </div>

        <div className="mt-auto">
          {isBusy && patient ? (
            <div className="bg-surface p-3 border border-divider">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Attending To</div>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className="text-accent" />
                <div>
                  <div className="font-heading font-semibold text-sm truncate">{patient.name}</div>
                  <div className="text-[10px] text-muted">MRN {(parseInt(patient.caseId.replace(/\D/g, '')) * 137) % 900000 + 100000} • {patient.age}{patient.sex}</div>
                </div>
              </div>
              <button 
                className="btn btn-secondary btn-sm w-full text-[10px]"
                onClick={() => assignDoctor(doc.id, null)}
              >
                Mark Available (End Consult)
              </button>
            </div>
          ) : (
            <div className="bg-surface p-3 border border-divider">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Action</div>
              <select 
                className="input text-xs w-full mb-3"
                onChange={(e) => {
                  if (e.target.value) {
                    assignDoctor(doc.id, e.target.value);
                  }
                }}
                value=""
                disabled={doc.status === 'break'}
              >
                <option value="" disabled>Assign from Waiting Room...</option>
                {waitingPatients.map(p => (
                  <option key={p.caseId} value={p.caseId}>{p.name} - {p.chiefComplaintVerbatim.substring(0, 20)}...</option>
                ))}
              </select>
              
              {doc.status !== 'break' && (
                <button 
                  className="text-[10px] text-muted hover:text-text underline"
                  onClick={() => setDoctorStatus(doc.id, 'break')}
                >
                  Set on Break
                </button>
              )}
              {doc.status === 'break' && (
                <button 
                  className="text-[10px] text-accent hover:text-accent-700 underline"
                  onClick={() => setDoctorStatus(doc.id, 'available')}
                >
                  Return from Break
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const grouped = {
    'Attendings & Fellows (Decision Makers)': doctors.filter(d => d.role === 'Attending' || d.role === 'Fellow'),
    'Residents (Primary Care)': doctors.filter(d => d.role === 'Resident'),
    'Interns (Assisting)': doctors.filter(d => d.role === 'Intern'),
    'Nursing & Leadership': doctors.filter(d => d.role === 'Charge Nurse')
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-heading mb-2">Clinical Staffing & Assignment</h1>
          <p className="text-muted">Real-time oversight of attending physicians, residents, and nursing leads.</p>
        </div>
      </div>

      <div className="space-y-12">
        {Object.entries(grouped).map(([groupName, docs]) => (
          <div key={groupName}>
            <h2 className="text-xl font-heading mb-4 border-b border-divider pb-2">{groupName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {docs.map(renderDoctorCard)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
