import React, { useMemo } from 'react';
import { useStore } from '../store';
import { differenceInMinutes } from 'date-fns';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Activity, AlertTriangle, Clock, Settings2 } from 'lucide-react';

function getAcuityClass(esi: number) {
  // Fill weight ESI 1 solid -> ESI 5 outline
  switch(esi) {
    case 1: return 'bg-accent text-bg';
    case 2: return 'bg-accent-600 text-bg';
    case 3: return 'bg-accent-200 text-accent-900 border border-accent';
    case 4: return 'bg-surface text-accent-800 border border-accent border-dashed';
    case 5: return 'bg-transparent text-text border border-divider';
    default: return 'bg-transparent';
  }
}

export function Queue() {
  const { patients, decisions, doctors, isSurgeMode, toggleSurgeMode, advanceTime, currentTime, auditLogs } = useStore();

  const sortedPatients = useMemo(() => {
    // Stage 1: Triage Queue (Patients NOT YET triaged by a nurse, and NOT assigned to a doctor)
    const unTriagedPatients = patients.filter(p => !auditLogs.some(l => l.caseId === p.caseId) && !doctors.some(d => d.currentPatientId === p.caseId));

    return [...unTriagedPatients].sort((a, b) => {
      const decA = decisions[a.caseId];
      const decB = decisions[b.caseId];
      if (decA.recommendedESI !== decB.recommendedESI) {
        return decA.recommendedESI - decB.recommendedESI;
      }
      const waitA = differenceInMinutes(currentTime, new Date(a.arrivalTime));
      const waitB = differenceInMinutes(currentTime, new Date(b.arrivalTime));
      return waitB - waitA;
    });
  }, [patients, decisions, doctors, currentTime]);

  const flagsCount = Object.values(decisions).filter(d => d.flag.type === 'undertriage').length;
  
  const medianWait = useMemo(() => {
    const unTriaged = patients.filter(p => !auditLogs.some(l => l.caseId === p.caseId) && !doctors.some(d => d.currentPatientId === p.caseId));
    if (unTriaged.length === 0) return 0;
    const waits = unTriaged.map(p => Math.max(0, differenceInMinutes(currentTime, new Date(p.arrivalTime)))).sort((a,b) => a-b);
    return waits[Math.floor(waits.length / 2)];
  }, [patients, doctors, currentTime, auditLogs]);

  const overrideRate = useMemo(() => {
    if (auditLogs.length === 0) return 12; // Initial seed realistic number
    const overrides = auditLogs.filter(l => l.assignedESI !== l.recommendedESI).length;
    return Math.round((overrides / auditLogs.length) * 100);
  }, [auditLogs]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            1. Triage Queue 
            {isSurgeMode && <span className="tag bg-red-100 text-red-800 border border-red-300">SURGE 3x</span>}
          </h1>
          <p className="text-muted">Patients requiring human triage sign-off (currently {sortedPatients.length})</p>
        </div>
        <div className="flex gap-4">
          <button className={clsx("btn", isSurgeMode ? "btn-primary" : "btn-secondary")} onClick={toggleSurgeMode}>
            <Settings2 size={16} /> Surge Mode
          </button>
          <button className="btn btn-secondary" onClick={() => advanceTime(15)}>
            <Clock size={16} /> +15m (Test)
          </button>
          <Link to="/intake" className="btn btn-primary">+ New Arrival</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card blueprint">
          <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
          <div className="card-kicker">In Waiting Room</div>
          <div className="text-3xl font-heading">{sortedPatients.length}</div>
        </div>
        <div className="card blueprint">
          <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
          <div className="card-kicker">Median Wait</div>
          <div className="text-3xl font-heading">{medianWait}m</div>
        </div>
        <div className={clsx("card blueprint", flagsCount > 0 && "bg-[#f5e1dc] border-[#a8564a]")}>
          <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
          <div className={clsx("card-kicker", flagsCount > 0 && "text-[#a8564a]")}>Open Under-Triage Flags</div>
          <div className="text-3xl font-heading flex items-center gap-2">
            {flagsCount > 0 && <AlertTriangle size={24} className="text-[#a8564a]" />}
            {flagsCount}
          </div>
        </div>
        <div className="card blueprint">
          <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
          <div className="card-kicker">Override Rate</div>
          <div className="text-3xl font-heading">{overrideRate}%</div>
        </div>
      </div>

      {/* Table */}
      <div className="blueprint bg-surface overflow-x-auto">
        <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
        <table className="table w-full text-left">
          <thead>
            <tr>
              <th>Wait</th>
              <th>Mode</th>
              <th>Name / Demographics</th>
              <th>Complaint</th>
              <th>Vitals (HR/BP/RR/SpO2/T)</th>
              <th>Model Rec</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedPatients.map(p => {
              const wait = Math.max(0, differenceInMinutes(currentTime, new Date(p.arrivalTime)));
              const dec = decisions[p.caseId];
              const isFlagged = dec.flag.type === 'undertriage';
              const isUncertain = dec.flag.type === 'uncertainty';

              return (
                <tr key={p.caseId} className={clsx(isFlagged && "bg-[#f5e1dc] border-l-4 border-[#a8564a]")}>
                  <td className="w-16"><span className={wait > 60 ? 'text-accent font-bold' : ''}>{wait}m</span></td>
                  <td><span className="tag tag-neutral">{p.arrivalMode}</span></td>
                  <td className="px-4 py-3">
                    <div className="font-heading text-sm">{p.name}</div>
                    <div className="text-xs text-muted mt-0.5">{p.age}{p.sex}</div>
                    <div className="flex gap-1 mt-1">
                      {p.priorHistory && p.priorHistory !== 'None' && (
                        <span className="text-[9px] bg-gray-200 border border-gray-300 text-gray-800 px-1 rounded uppercase tracking-wider" title={p.priorHistory}>HX</span>
                      )}
                      {p.captureSession?.language && p.captureSession.language !== 'English' && (
                        <span className="text-[9px] bg-blue-100 border border-blue-200 text-blue-600 px-1 rounded uppercase tracking-wider" title={`Language: ${p.captureSession.language}`}>INT</span>
                      )}
                      {p.captureSession?.voiceSignals.some(s => s.type !== 'none') && (
                        <span className="text-[9px] bg-purple-100 border border-purple-200 text-purple-600 px-1 rounded uppercase tracking-wider" title="Voice biomarker detected">VOC</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm truncate max-w-[200px]" title={p.chiefComplaintVerbatim}>
                    {p.chiefComplaintVerbatim}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] bg-surface border border-divider px-1.5 py-0.5 rounded">HR {p.vitals.hr ?? '--'}</span>
                      <span className="text-[10px] bg-surface border border-divider px-1.5 py-0.5 rounded">BP {p.vitals.sbp ? `${p.vitals.sbp}/${p.vitals.dbp}` : '--/--'}</span>
                      <span className="text-[10px] bg-surface border border-divider px-1.5 py-0.5 rounded">O₂ {p.vitals.spo2 ?? '--'}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={clsx("w-8 h-8 flex items-center justify-center font-bold text-sm font-heading rounded-sm", getAcuityClass(dec.recommendedESI))}>
                        {dec.recommendedESI}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted">Conf: {(dec.confidence * 100).toFixed(0)}%</span>
                        {isFlagged && <span className="text-[10px] font-bold text-[#a8564a]">FLAG</span>}
                        {isUncertain && <span className="text-[10px] text-orange-600">SPARSE</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <Link to={`/patient/${p.caseId}`} className="btn btn-ghost btn-icon">
                      <Activity size={16} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
