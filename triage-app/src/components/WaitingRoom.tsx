import React from 'react';
import { useStore } from '../store';
import { differenceInMinutes } from 'date-fns';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Activity } from 'lucide-react';

export function WaitingRoom() {
  const { patients, decisions, currentTime, auditLogs, doctors } = useStore();

  // Stage 2: Waiting Room (Patients signed off by nurse, but NOT YET assigned to a doctor bed)
  const waitingPatients = patients.filter(p => 
    auditLogs.some(l => l.caseId === p.caseId) && 
    !doctors.some(d => d.currentPatientId === p.caseId)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="flex items-center gap-2">2. Waiting Room</h1>
          <p className="text-muted">Triaged patients waiting for a bed. Every patient is continuously monitored and re-scored.</p>
        </div>
        <span className="tag tag-accent">Next sweep 21:16</span>
      </div>

      <div className="blueprint bg-surface overflow-x-auto">
        <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
        <table className="table w-full text-left">
          <thead>
            <tr>
              <th className="w-48">Patient</th>
              <th className="w-24">Assigned</th>
              <th className="w-64">Deterioration risk over the wait</th>
              <th className="w-24">Now</th>
              <th className="w-48">Last vitals check</th>
              <th>Movement</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {waitingPatients.map(p => {
              const wait = differenceInMinutes(currentTime, new Date(p.arrivalTime));
              const dec = decisions[p.caseId];
              const isFlagged = dec.flag.type === 'undertriage';
              
              const isDeteriorating = p.caseId === 'PT-2004';
              const riskHistory = isDeteriorating 
                ? [10, 12, 15, 14, 28, 45, 64] // Deteriorating
                : [8, 7, 8, 6, 7, 7, 6]; // Stable

              // Find last vitals check or arrival
              const lastVitalsEvent = [...(p.timeline || [])].reverse().find(e => e.type === 'vitals_check' || e.type === 'deterioration_alert') 
                || p.timeline?.find(e => e.type === 'arrival');
              
              const waitSinceCheck = lastVitalsEvent ? differenceInMinutes(currentTime, new Date(lastVitalsEvent.time)) : wait;
              
              return (
                <tr key={p.caseId} className={clsx(isFlagged && "bg-[#f5e1dc] border-l-4 border-[#a8564a]")}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-muted">{p.age}{p.sex} • waiting {wait}m</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("tag", dec.recommendedESI <= 2 ? "bg-accent-700 text-bg" : "bg-accent-500 text-bg")}>
                      ESI {dec.recommendedESI}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-end gap-1 h-10">
                      {riskHistory.map((val, i) => (
                        <div 
                          key={i} 
                          className={clsx("flex-1", val > 40 ? "bg-[#a8564a]" : val > 20 ? "bg-[#c98374]" : "bg-accent-400")} 
                          style={{ height: `${val}%` }}
                        ></div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("font-heading text-xl", riskHistory[riskHistory.length-1] > 40 ? "text-[#8f3f33]" : "")}>
                      {riskHistory[riskHistory.length-1]}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-semibold text-gray-800">{waitSinceCheck}m ago</div>
                    <div className="text-muted mt-1">HR {p.vitals.hr ?? '--'} • SpO₂ {p.vitals.spo2 ?? '--'}%</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {isDeteriorating ? (
                      <span className="text-[#6f3128] font-semibold">⚑ Re-scored upward. Alert raised.</span>
                    ) : (
                      "Stable. Next auto-check in 15m."
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/patient/${p.caseId}`} className="btn btn-secondary text-xs py-1 px-2">Open Chart</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="p-4 text-xs text-muted">The system re-scores upward freely. It never lowers an acuity a nurse has assigned — only a human can do that.</div>
      </div>
    </div>
  );
}
