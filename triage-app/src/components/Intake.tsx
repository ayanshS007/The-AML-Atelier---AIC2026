import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { incomingDemoPatients } from '../data/patients';
import clsx from 'clsx';
import { Mic, Activity, Ambulance, User, Ear } from 'lucide-react';

export function Intake() {
  const navigate = useNavigate();
  const addPatient = useStore(s => s.addPatient);
  
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [transcriptIndex, setTranscriptIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const demoCase = incomingDemoPatients[selectedScenarioIndex];
  const fullTranscript = demoCase.captureSession?.transcript || [];

  useEffect(() => {
    let timer: any;
    if (playing && transcriptIndex < fullTranscript.length - 1) {
      timer = setTimeout(() => {
        setTranscriptIndex(prev => prev + 1);
      }, 2500); // 2.5s per line to linger on the conversation
    } else if (playing && transcriptIndex >= fullTranscript.length - 1) {
      setPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [playing, transcriptIndex, fullTranscript.length]);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptIndex]);

  const isDonePlaying = transcriptIndex >= fullTranscript.length - 1 && transcriptIndex !== -1;
  const currentTranscript = fullTranscript.slice(0, transcriptIndex + 1);

  const handleSendToQueue = () => {
    addPatient(demoCase);
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      <div className="flex items-center justify-between px-8 py-5 border-b border-divider shrink-0 bg-white shadow-sm z-10">
        <div>
          <h2 className="text-2xl font-heading text-[#0f4c5c]">New Patient Intake</h2>
          <p className="text-xs text-muted mt-1">Simulate incoming ED cases via ambient NLP capture</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase tracking-widest text-muted mb-1">Select Incoming Scenario</label>
            <select 
              className="input text-sm py-2 px-4 w-72 bg-gray-200 border-gray-300 font-semibold text-[#0f4c5c]"
              value={selectedScenarioIndex}
              onChange={(e) => {
                setSelectedScenarioIndex(Number(e.target.value));
                setTranscriptIndex(-1);
                setPlaying(false);
              }}
            >
              {incomingDemoPatients.map((p, i) => (
                <option key={i} value={i}>
                  {p.arrivalMode === 'ambulance' ? '🚑' : '🚶'} Scenario {i + 1}: {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-10 w-px bg-divider"></div>

          <div className="flex items-center gap-3 bg-gray-200 px-4 py-2 rounded border border-gray-300">
            <span className="relative flex h-3 w-3">
              <span className={clsx("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", playing ? "bg-red-400" : "bg-gray-400")}></span>
              <span className={clsx("relative inline-flex rounded-full h-3 w-3", playing ? "bg-red-500" : "bg-gray-400")}></span>
            </span>
            <span className="text-xs font-mono text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Ear size={14} className={playing ? "text-red-500" : "text-gray-800"}/> 
              {playing ? 'Listening Active...' : 'Mic Standby'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 p-8 flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-8">
          
          {/* Arrival Mode Banner */}
          <div className={clsx(
            "p-4 rounded-lg flex items-center gap-4 border-2 transition-all",
            demoCase.arrivalMode === 'ambulance' 
              ? "bg-red-50 border-red-200 text-red-900" 
              : "bg-blue-50 border-blue-200 text-blue-900"
          )}>
            <div className={clsx(
              "p-3 rounded-full text-white",
              demoCase.arrivalMode === 'ambulance' ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-blue-500"
            )}>
              {demoCase.arrivalMode === 'ambulance' ? <Ambulance size={28} /> : <User size={28} />}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Arrival Vector</div>
              <h3 className="text-xl font-heading font-bold uppercase tracking-wider">{demoCase.arrivalMode}</h3>
            </div>
            <div className="ml-auto text-right opacity-70">
              <div className="text-[10px] uppercase tracking-widest">Strongest predictor</div>
              <div className="text-xs font-semibold">of admission likelihood</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-divider shadow-sm">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-4 border-b border-gray-300 pb-2">1 · Demographics Extraction</div>
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
              <div className="field">
                <label>Name</label>
                <div className="input flex items-center bg-gray-200 h-12 font-medium">{isDonePlaying ? demoCase.name : 'Listening...'}</div>
              </div>
              <div className="field">
                <label>Age</label>
                <div className="input flex items-center bg-gray-200 h-12 font-medium">{isDonePlaying ? demoCase.age : '...'}</div>
              </div>
              <div className="field">
                <label>Sex</label>
                <div className="input flex items-center bg-gray-200 h-12 font-medium uppercase">{isDonePlaying ? demoCase.sex : '...'}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col flex-1 bg-white rounded-lg border border-divider shadow-sm overflow-hidden">
            <div className="p-4 border-b border-divider flex justify-between items-center bg-gray-200">
              <div className="text-[10px] uppercase tracking-widest text-muted">2 · Ambient Conversation Log</div>
              <button 
                className={clsx(
                  "btn h-10 px-6 transition-all duration-300", 
                  playing ? "bg-red-50 text-red-600 border-red-200" : "btn-primary",
                  isDonePlaying && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => { setPlaying(true); setTranscriptIndex(0); }}
                disabled={playing || isDonePlaying}
              >
                <Mic size={16} className={clsx(playing && "animate-pulse")} />
                {playing ? 'Recording...' : 'Start Scenario'}
              </button>
            </div>
            
            <div ref={scrollRef} className="p-6 bg-[#f8f9fa] flex-1 overflow-y-auto max-h-[300px] space-y-4 font-sans text-sm">
              {currentTranscript.length === 0 && !playing && (
                <div className="h-full flex items-center justify-center text-gray-800 italic">
                  Click "Start Scenario" to begin ambient capture...
                </div>
              )}
              {currentTranscript.map((line, i) => (
                <div key={i} className={clsx(
                  "p-3 rounded-lg max-w-[85%] shadow-sm", 
                  line.speaker === 'patient' ? 'bg-[#e0fbfc] text-[#1d3557] self-start border border-[#c2dfe3]' : 
                  line.speaker === 'family' ? 'bg-[#f1faee] text-[#1d3557] self-start border border-[#d8e2dc]' :
                  'bg-white text-gray-800 self-end ml-auto border border-gray-300'
                )}>
                  <span className={clsx(
                    "text-[9px] block mb-1 font-bold uppercase tracking-wider",
                    line.speaker === 'patient' ? 'text-[#457b9d]' : 
                    line.speaker === 'family' ? 'text-[#2a9d8f]' :
                    'text-gray-800'
                  )}>{line.speaker}</span>
                  {line.text}
                </div>
              ))}
              {playing && (
                <div className="text-gray-800 text-xs italic flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span>
                  </span>
                  Processing speech...
                </div>
              )}
            </div>

            <div className="p-4 border-t border-divider bg-gray-200">
              <div className="text-[10px] uppercase tracking-widest text-[#0f4c5c] mb-2 font-bold flex justify-between">
                <span>Extracted Verbatim Complaint</span>
                <span className="text-gray-800 font-normal">Passed intact to ML</span>
              </div>
              <div className="input flex-1 italic p-3 text-sm bg-white min-h-[60px] flex items-center text-gray-900 font-serif">
                {isDonePlaying ? `"${demoCase.chiefComplaintVerbatim}"` : ''}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-lg border border-divider shadow-sm">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-4 border-b border-gray-300 pb-2">3 · Structuring Vitals</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="blueprint p-4 text-center">
                <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Heart Rate</div>
                <div className="font-heading text-3xl text-[#0f4c5c]">{isDonePlaying ? demoCase.vitals.hr ?? '--' : '--'}</div>
              </div>
              <div className="blueprint p-4 text-center">
                <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Blood Pressure</div>
                <div className="font-heading text-3xl text-[#0f4c5c]">{isDonePlaying ? (demoCase.vitals.sbp ? `${demoCase.vitals.sbp}/${demoCase.vitals.dbp}` : '--/--') : '--/--'}</div>
              </div>
              <div className="blueprint p-4 text-center">
                <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Resp Rate</div>
                <div className="font-heading text-3xl text-[#0f4c5c]">{isDonePlaying ? demoCase.vitals.rr ?? '--' : '--'}</div>
              </div>
              <div className="blueprint p-4 text-center">
                <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">SpO₂</div>
                <div className="font-heading text-3xl text-[#0f4c5c]">{isDonePlaying ? demoCase.vitals.spo2 ?? '--' : '--'}%</div>
              </div>
              <div className="blueprint p-4 text-center">
                <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Temperature</div>
                <div className="font-heading text-3xl text-[#0f4c5c]">{isDonePlaying ? demoCase.vitals.tempC ?? '--' : '--'}</div>
              </div>
              <div className="blueprint p-4 border-dashed text-center">
                <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Pain Score</div>
                <div className="font-heading text-3xl text-muted">{isDonePlaying ? demoCase.vitals.pain ?? '--' : '--'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-divider shadow-sm">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-4 border-b border-gray-300 pb-2 flex justify-between">
              <span>4 · Prior Medical History (NLP + EHR Sync)</span>
              {isDonePlaying && <span className="text-green-600 font-bold">✓ Synced</span>}
            </div>
            
            <div className="space-y-3">
              <div className="field">
                <label className="text-[10px]">Extracted from Conversation</label>
                <div className="bg-gray-200 p-2 min-h-[40px] rounded border border-gray-300 flex flex-wrap gap-2 text-sm">
                  {isDonePlaying ? (
                    Object.entries(demoCase.captureSession?.history || {}).length > 0 ? (
                      Object.entries(demoCase.captureSession?.history || {}).map(([key, val]) => (
                        <span key={key} className="bg-white px-2 py-1 rounded text-[#0f4c5c] border border-gray-300 shadow-sm text-xs">
                          <strong>{key}:</strong> {val}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-800 italic mt-1">None mentioned in audio</span>
                    )
                  ) : (
                    <span className="text-gray-800 mt-1">Listening...</span>
                  )}
                </div>
              </div>
              <div className="field">
                <label className="text-[10px]">Matched in Hospital EHR Database</label>
                <div className="input flex items-center bg-blue-50/50 h-10 font-medium text-sm text-blue-900 border border-blue-100">
                  {isDonePlaying ? (demoCase.priorHistory || 'No prior records found') : 'Awaiting patient identification...'}
                </div>
              </div>
            </div>
          </div>

          <div className="blueprint p-5 border-dashed border-2 border-gray-300 bg-gray-200">
            <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
            <div className="flex items-center gap-2 text-[#0f4c5c] mb-2">
              <Activity size={18} />
              <div className="text-[10px] uppercase tracking-widest font-bold">Model Data Hand-off</div>
            </div>
            <p className="text-sm mt-2 leading-relaxed text-gray-900">
              When the nurse clicks "Send to triage queue", this exact payload is sent to the local ML model.
              Any fields that are blank (like pain or temp) are explicitly left blank. 
              The model widens uncertainty rather than filling them in with a healthy value.
            </p>
          </div>

          <div className="mt-auto pt-4 border-t border-divider flex flex-col gap-2">
            <button 
              className={clsx(
                "btn w-full py-5 text-xl tracking-wide shadow-md transition-all duration-300",
                isDonePlaying ? "bg-[#0f4c5c] text-white hover:bg-[#0a3844]" : "bg-gray-200 text-gray-800 cursor-not-allowed"
              )}
              disabled={!isDonePlaying}
              onClick={handleSendToQueue}
            >
              Push Patient to Triage Queue
            </button>
            <div className="text-[10px] text-muted text-center mt-2 uppercase tracking-widest">
              Sending is permitted with missing data to prevent delays
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
