import React from 'react';
import { useStore } from '../store';
import { Settings2, AlertTriangle, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

export function Oversight() {
  const { isSurgeMode, toggleSurgeMode, decisions, patients } = useStore();

  const undertriageFlags = patients.filter(p => decisions[p.caseId]?.flag.type === 'undertriage');
  const uncertaintyFlags = patients.filter(p => decisions[p.caseId]?.flag.type === 'uncertainty');

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Value Proposition Header */}
      <div className="bg-gradient-to-r from-[#212529] to-[#343a40] text-white p-6 rounded-lg shadow-md border border-[#495057]">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={24} className="text-green-400" />
          <h1 className="text-2xl font-heading">Charge Nurse Command Center (Safety Net)</h1>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">
          <strong>The USP: Machine precision with human authority.</strong> In a chaotic ED, the Charge Nurse needs a top-down view of algorithmic recommendations. 
          This dashboard allows leadership to monitor AI behavior in real-time, instantly spot high-risk patients the model might be under-triageing, 
          and globally recalibrate the algorithm during mass-casualty events using <strong>Surge Mode</strong>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Surge Control */}
        <div className="blueprint p-6 border-l-4 border-[#006d77]">
          <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-heading">Disaster / Surge Mode</h2>
              <p className="text-xs text-muted mt-1">
                Recalibrates risk thresholds dynamically. When active, the model will aggressively bump marginal ESI 3s to ESI 2s to clear the waiting room faster during extreme volume.
              </p>
            </div>
            <button 
              className={clsx("btn px-4 py-2 font-bold", isSurgeMode ? "bg-red-600 text-white hover:bg-red-700" : "btn-secondary")} 
              onClick={toggleSurgeMode}
            >
              <Settings2 size={16} /> {isSurgeMode ? 'DISABLE SURGE' : 'ACTIVATE SURGE'}
            </button>
          </div>
          {isSurgeMode && (
            <div className="bg-red-50 text-red-800 p-3 rounded text-sm border border-red-200">
              <strong>Surge 3x Active:</strong> Model sensitivity increased by 15%. All ML recommendations are now biased toward higher acuity.
            </div>
          )}
        </div>

        {/* Global Flags */}
        <div className="blueprint p-6">
          <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
          <h2 className="text-lg font-heading mb-4">System Alerts</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#faf0ed] p-3 border border-[#a8564a] rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#a8564a]" />
                <span className="text-sm font-semibold text-[#a8564a]">Undertriage Risk Flags</span>
              </div>
              <span className="text-lg font-bold text-[#a8564a]">{undertriageFlags.length}</span>
            </div>

            <div className="flex justify-between items-center bg-gray-200 p-3 border border-gray-300 rounded">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Model Uncertainty Flags</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{uncertaintyFlags.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
