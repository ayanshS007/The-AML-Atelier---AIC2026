import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import clsx from 'clsx';
import { ChevronLeft } from 'lucide-react';

export function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, decisions, submitDecision, currentTime, auditLogs } = useStore();
  const patient = patients.find(p => p.caseId === id);
  const decision = decisions[id || ''];

  const [selectedESI, setSelectedESI] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (decision) {
      setSelectedESI(decision.recommendedESI);
    }
  }, [decision]);

  if (!patient || !decision) return <div>Patient not found</div>;

  const existingLog = auditLogs.find(l => l.caseId === id);
  const isTriaged = !!existingLog;
  const isFlagged = decision.flag.type === 'undertriage';
  const requiresOverrideReason = selectedESI !== null && (selectedESI > decision.recommendedESI || selectedESI > 2);

  const handleAssign = () => {
    if (selectedESI !== null) {
      submitDecision(patient.caseId, selectedESI, reason || 'Accepted recommendation');
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-divider shrink-0">
        <button onClick={() => navigate('/')} className="text-accent text-sm font-heading font-semibold flex items-center hover:underline">
          <ChevronLeft size={16} /> BACK TO QUEUE
        </button>
        <div className="flex gap-4 text-xs font-heading">
          <span className="tracking-widest">
            {new Date(patient.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • waiting {Math.max(0, Math.floor((currentTime.getTime() - new Date(patient.arrivalTime).getTime()) / 60000))}m
          </span>
          <span className="border border-divider px-2 py-1">RN J. OKAFOR</span>
        </div>
      </div>

      {isFlagged && (
        <div className="bg-[#a8564a] text-white px-6 py-3 flex items-center gap-4 shrink-0">
          <span className="font-heading text-xl tracking-widest">⚑ UNDERTRIAGE MISMATCH</span>
          <span className="text-sm opacity-90">Surface read says ESI 4. Hidden-risk channels say otherwise. The model recommends pulling this patient forward — <b>you decide</b>.</span>
        </div>
      )}

      <div className="grid grid-cols-[340px_1fr_340px] flex-1 min-h-0 overflow-y-auto">
        {/* Column 1: Patient Context */}
        <div className="p-5 border-r border-divider flex flex-col gap-4">
          <div>
            <h3 className="text-3xl m-0">{patient.name}</h3>
            <div className="text-xs text-muted">{patient.age}{patient.sex} • MRN {(parseInt(patient.caseId.replace(/\D/g, '')) * 137) % 900000 + 100000} • {patient.arrivalMode}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Chief complaint • verbatim</div>
            <div className="blueprint p-3 text-sm italic leading-relaxed">
              "{patient.chiefComplaintVerbatim}"
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Vitals at door</div>
            <div className="grid grid-cols-2 gap-[1px] bg-divider border border-divider">
              <div className="bg-bg p-2"><div className="text-[10px] text-muted">HR</div><div className="font-heading text-xl">{patient.vitals.hr}</div></div>
              <div className="bg-bg p-2"><div className="text-[10px] text-muted">BP</div><div className="font-heading text-xl">{patient.vitals.sbp}/{patient.vitals.dbp}</div></div>
              <div className="bg-bg p-2"><div className="text-[10px] text-muted">RR</div><div className={clsx("font-heading text-xl", (patient.vitals.rr ?? 0) > 20 && "text-[#8f3f33]")}>{patient.vitals.rr}</div></div>
              <div className="bg-bg p-2"><div className="text-[10px] text-muted">SpO₂</div><div className="font-heading text-xl">{patient.vitals.spo2 ?? '--'}%</div></div>
              <div className="bg-bg p-2"><div className="text-[10px] text-muted">Temp</div><div className={clsx("font-heading text-xl", patient.vitals.tempC && patient.vitals.tempC > 38 && "text-[#8f3f33]")}>{patient.vitals.tempC ?? '--'}</div></div>
              <div className="bg-bg p-2"><div className="text-[10px] text-muted">Pain</div><div className="font-heading text-xl">{patient.vitals.pain ?? '--'}</div></div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="tag tag-accent">Shock index {((patient.vitals.hr ?? 80) / (patient.vitals.sbp ?? 120)).toFixed(2)}</span>
            </div>
          </div><div className="mt-4 flex-1 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Patient Timeline & Rescores</div>
            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {patient.timeline?.map((event, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-slate-300 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                    <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                  </div>
                  {/* Card */}
                  <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded border border-divider shadow-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-accent-700">{event.type.replace('_', ' ')}</span>
                      <time className="text-[10px] text-muted">{new Date(event.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                    </div>
                    <div className="text-xs text-slate-700">{event.description}</div>
                  </div>
                </div>
              ))}
              {(!patient.timeline || patient.timeline.length === 0) && (
                <div className="text-xs text-muted">No timeline events recorded.</div>
              )}
            </div>
            
            <div className="mt-6 text-xs text-muted leading-relaxed border-t border-divider pt-3 space-y-2">
              <div>
                <span className="font-bold text-gray-800 uppercase tracking-widest text-[9px] mr-2">EHR Record:</span> 
                {patient.priorHistory || 'None on record'}
              </div>
              {patient.captureSession?.history && Object.keys(patient.captureSession.history).length > 0 && (
                <div>
                  <span className="font-bold text-gray-800 uppercase tracking-widest text-[9px] mr-2">NLP Extracted:</span> 
                  {Object.entries(patient.captureSession.history).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Rationale & Model */}
        <div className="p-5 flex flex-col gap-5 min-w-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="blueprint p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted">Surface read</div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="tag tag-outline text-sm">ESI 4</span>
                <span className="text-xs text-muted">low priority</span>
              </div>
            </div>
            <div className={clsx("blueprint p-4", isFlagged && "bg-[#f5e1dc] border-[#d8a99f]")}>
              <div className={clsx("text-[10px] uppercase tracking-widest", isFlagged ? "text-[#6f3128]" : "text-muted")}>Model recommendation</div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={clsx("tag text-sm", isFlagged ? "bg-accent-700 text-bg" : "bg-accent-500 text-bg")}>ESI {decision.recommendedESI}</span>
                <span className={clsx("text-xs", isFlagged ? "text-[#6f3128]" : "text-muted")}>pull forward</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Hidden-risk channels · calibrated probabilities</div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Early sepsis pattern', val: Math.round(decision.riskProfile.sepsis.score * 100) },
                { label: 'Admission likely', val: Math.round(decision.riskProfile.admissionLikely.score * 100) },
                { label: 'Critical care / deterioration', val: Math.round(decision.riskProfile.criticalCare.score * 100) },
              ].map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{c.label}</span>
                    <span className="font-heading font-bold">{c.val}%</span>
                  </div>
                  <div className="h-2 bg-surface">
                    <div className={clsx("h-2", c.val > 60 ? "bg-[#a8564a]" : "bg-accent")} style={{ width: `${c.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="blueprint p-4 mt-auto">
            <div className="text-[10px] uppercase tracking-widest text-accent-700">Why I'm worried</div>
            <p className="text-sm mt-2 leading-relaxed">{decision.explanation.why}</p>
            <div className="mt-4 text-xs text-muted">
              Top drivers: {decision.explanation.topDrivers.map(d => d.feature).join(' · ')}
            </div>
          </div>
          
          <div className="text-xs text-muted">
            {(decision.confidence * 100).toFixed(0)}% CONFIDENCE
          </div>
        </div>

        {/* Column 3: Decision */}
        <div className="p-5 bg-surface border-l border-divider flex flex-col gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted">Your decision</div>
            <h4 className="text-xl mt-1">{isTriaged ? 'Final Acuity Assigned' : 'Set final acuity'}</h4>
            <p className="text-xs text-muted mt-1">{isTriaged ? 'This patient has been signed off.' : 'The record carries your call, not the model\'s.'}</p>
          </div>

          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map(level => {
              const isRecommended = level === decision.recommendedESI;
              const isSelected = isTriaged ? level === existingLog?.assignedESI : selectedESI === level;
              return (
                <label key={level} className={clsx("radio border bg-bg p-3", isRecommended ? "border-accent bg-accent-100" : "border-divider", isTriaged && !isSelected && "opacity-50")}>
                  <input type="radio" name="acu" checked={isSelected} onChange={() => !isTriaged && setSelectedESI(level)} disabled={isTriaged} />
                  <span className="dot"></span>
                  <span className={clsx("tag", level <= 2 ? "bg-accent-700 text-bg" : level === 3 ? "bg-accent-500 text-white" : "tag-outline")}>ESI {level}</span>
                  <span className="text-xs flex-1 ml-2">
                    {level === 1 ? 'Resuscitation' : level === 2 ? 'Emergent' : level === 3 ? 'Urgent' : level === 4 ? 'Less urgent' : 'Non-urgent'}
                    {isRecommended && <span className="text-accent-700 ml-1">· recommended</span>}
                  </span>
                </label>
              )
            })}
          </div>

          {!isTriaged && requiresOverrideReason && (
            <div className="field mt-auto">
              <label>Reason required (overriding recommendation)</label>
              <textarea 
                className="input text-xs" 
                placeholder="Disagreeing with the flag? Say why..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          )}

          {!isTriaged ? (
            <button 
              className={clsx("btn btn-block py-3 mt-auto", selectedESI === 2 ? "bg-[#a8564a] text-white border-[#a8564a]" : "btn-primary")}
              disabled={requiresOverrideReason && !reason.trim()}
              onClick={handleAssign}
            >
              Sign-off & Move to Waiting Room (ESI {selectedESI}) {selectedESI === 2 && '· pull forward'}
            </button>
          ) : (
            <div className="mt-auto p-4 bg-gray-200 border border-gray-300 rounded text-center text-sm font-semibold text-gray-800">
              Chart is Locked (Signed-off)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
