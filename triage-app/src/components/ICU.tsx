import React from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { HeartPulse, Clock, Activity, AlertCircle } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';

export function ICU() {
  const { patients, decisions, currentTime, auditLogs } = useStore();

  // Patients who need ICU (ESI 1 or Critical Care risk > 80%)
  const icuPatients = patients.filter(p => {
    const dec = decisions[p.caseId];
    if (!dec) return false;
    const assignedESI = auditLogs.find(l => l.caseId === p.caseId)?.assignedESI || dec.recommendedESI;
    return assignedESI === 1 || dec.riskProfile.criticalCare.score > 0.8;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-heading mb-2 text-[#4a154b]">ICU / Critical Transfer</h1>
          <p className="text-muted">High acuity patients requiring immediate step-up or intensive care.</p>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <div className="text-3xl font-heading text-[#4a154b]">2 / 12</div>
            <div className="text-[10px] uppercase tracking-widest text-muted">ICU Beds Available</div>
          </div>
          <div className="w-px h-12 bg-divider"></div>
          <div className="text-right">
            <div className="text-3xl font-heading text-accent">{icuPatients.length}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted">ED Boarders</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {icuPatients.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-gray-300 bg-surface rounded">
            No critical care transfers pending.
          </div>
        )}

        {icuPatients.map(p => {
          const wait = Math.max(0, differenceInMinutes(currentTime, new Date(p.arrivalTime)));
          const dec = decisions[p.caseId];
          const isTriaged = auditLogs.some(l => l.caseId === p.caseId);

          return (
            <div key={p.caseId} className="relative overflow-hidden rounded-lg shadow-sm border border-[#e2d5e3] bg-white">
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-[#4a154b] to-[#7b2c7c] text-white flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-heading mb-1">{p.name}</h3>
                  <div className="text-xs opacity-90">{p.age}{p.sex} • MRN {(parseInt(p.caseId.replace(/\D/g, '')) * 137) % 900000 + 100000}</div>
                </div>
                {wait > 60 && (
                  <div className="bg-red-500/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border border-red-500/30 flex items-center gap-1 text-red-100">
                    <AlertCircle size={14} /> Boarding {wait}m
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-5 space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted">Acuity Status</div>
                    <div className="text-sm font-semibold flex items-center gap-2 mt-1">
                      {isTriaged ? <span className="tag bg-[#4a154b] text-white">Triaged ESI 1</span> : <span className="tag bg-orange-100 text-orange-800">Un-Triaged</span>}
                      <span>•</span>
                      <span>Crit-Risk {Math.round(dec.riskProfile.criticalCare.score * 100)}%</span>
                    </div>
                  </div>
                  <Link to={`/patient/${p.caseId}`} className="text-[#4a154b] hover:underline flex items-center gap-1 text-xs font-semibold">
                    View Chart <Activity size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[#f8f5f9] p-4 rounded border border-[#e2d5e3]">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Assigned Fellow</div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <div className="bg-[#7b2c7c] text-white rounded-full p-1"><HeartPulse size={12}/></div>
                      Dr. David Cho
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Transfer Status</div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Clock size={14} className="text-[#7b2c7c]" />
                      Pending bed cleaning
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
