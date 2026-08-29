import React, { useState } from 'react';
import { useStore } from '../store';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EscalationModal() {
  const { escalatedCaseId, patients, dismissEscalation } = useStore();
  const [reason, setReason] = useState('');
  const navigate = useNavigate();

  if (!escalatedCaseId) return null;
  const patient = patients.find(p => p.caseId === escalatedCaseId);
  if (!patient) return null;

  const handlePullForward = () => {
    dismissEscalation('pulled_forward');
    navigate(`/patient/${patient.caseId}`);
  };

  return (
    <div className="dialog-backdrop z-50 animate-in fade-in">
      <div className="dialog border-red-500 border-2 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
        <div className="flex items-center gap-3 text-red-600 mb-2">
          <AlertTriangle size={24} />
          <h2 className="dialog-title !mb-0 text-red-600">Escalation Alert</h2>
        </div>
        
        <div className="dialog-body">
          <div className="font-bold text-lg mb-1">{patient.name}</div>
          <p className="text-sm">Patient in waiting room re-scored to higher acuity based on deteriorating vitals.</p>
          
          <div className="bg-surface p-3 mt-4 flex items-center gap-4 border border-divider">
            <TrendingUp className="text-red-500" />
            <div>
              <div className="text-xs text-muted">Vitals Movement</div>
              <div className="font-mono text-sm">
                HR 98 → <span className="text-red-500 font-bold">112</span> | 
                SpO2 95% → <span className="text-red-500 font-bold">92%</span>
              </div>
            </div>
          </div>

          <div className="field mt-4">
            <label>Reason to dismiss</label>
            <input 
              className="input" 
              placeholder="Required if not pulling forward..." 
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="dialog-actions">
          <button 
            className="btn btn-secondary" 
            disabled={!reason} 
            onClick={() => dismissEscalation(reason)}
          >
            Dismiss
          </button>
          <button className="btn btn-primary bg-red-600 hover:bg-red-700" onClick={handlePullForward}>
            Pull Forward
          </button>
        </div>
      </div>
    </div>
  );
}
