import React from 'react';
import { useStore } from '../store';
import { differenceInMinutes } from 'date-fns';
import { FileSearch, TrendingUp } from 'lucide-react';

export function Audit() {
  const { auditLogs, patients } = useStore();

  const overrides = auditLogs.filter(l => l.assignedESI !== l.recommendedESI);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Value Proposition Header */}
      <div className="bg-gradient-to-r from-[#1b263b] to-[#415a77] text-white p-6 rounded-lg shadow-md border border-[#0d1b2a]">
        <div className="flex items-center gap-3 mb-2">
          <FileSearch size={24} className="text-[#e0e1dd]" />
          <h1 className="text-2xl font-heading">Continuous Quality Improvement (CQI) Log</h1>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">
          <strong>The USP: A self-correcting safety loop.</strong> Because the system enforces that the human nurse must sign-off on the AI's recommendation, 
          we capture the exact moment a clinician disagrees with the algorithm. This log is gold for hospital administrators: it provides legal defensibility, 
          tracks potential algorithmic bias, and creates the exact dataset needed to safely retrain the local ML model without "unsupervised drift."
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="blueprint p-4">
          <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
          <div className="text-[10px] uppercase tracking-widest text-muted">Total Decisions Logged</div>
          <div className="text-3xl font-heading mt-1">{auditLogs.length}</div>
        </div>
        <div className="blueprint p-4">
          <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
          <div className="text-[10px] uppercase tracking-widest text-muted">Human Override Rate</div>
          <div className="text-3xl font-heading mt-1 flex items-baseline gap-2">
            {auditLogs.length > 0 ? Math.round((overrides.length / auditLogs.length) * 100) : 0}%
            <TrendingUp size={16} className="text-accent" />
          </div>
        </div>
        <div className="blueprint p-4">
          <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
          <div className="text-[10px] uppercase tracking-widest text-muted">Avg Time-to-Sign-off</div>
          <div className="text-3xl font-heading mt-1">42s</div>
        </div>
      </div>

      {overrides.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-gray-300 text-gray-900 rounded-lg">
          No manual overrides recorded yet. Process a patient in the Queue and explicitly change the AI's recommended ESI to generate a training log.
        </div>
      ) : (
        <div className="blueprint overflow-hidden">
          <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
          <table className="table w-full text-left bg-white">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-3 px-4 border-b">Case ID</th>
                <th className="py-3 px-4 border-b">Time</th>
                <th className="py-3 px-4 border-b text-center">AI Rec</th>
                <th className="py-3 px-4 border-b text-center">Nurse Assigned</th>
                <th className="py-3 px-4 border-b w-1/2">Required Justification (Feedback Loop)</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((l, i) => {
                const p = patients.find(pat => pat.caseId === l.caseId);
                return (
                  <tr key={i} className="hover:bg-gray-200 border-b border-gray-300 last:border-0">
                    <td className="py-3 px-4 font-mono text-xs">{l.caseId}</td>
                    <td className="py-3 px-4 text-xs text-muted">{new Date(l.timestamp).toLocaleTimeString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded font-bold text-xs">ESI {l.recommendedESI}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-accent-100 text-accent-800 px-2 py-1 rounded font-bold text-xs">ESI {l.assignedESI}</span>
                    </td>
                    <td className="py-3 px-4 text-sm italic border-l border-gray-300">
                      "{l.overrideReason}"
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
