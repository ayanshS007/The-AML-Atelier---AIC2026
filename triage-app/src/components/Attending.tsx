import React from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Bed, Clock, User, Activity } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';

export function Attending() {
  const { patients, doctors, currentTime, decisions } = useStore();

  const attendingPatients = patients.filter(p => doctors.some(d => d.currentPatientId === p.caseId));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-heading mb-2 text-[#0f4c5c]">3. Active Treatment Bay</h1>
          <p className="text-muted">Patients currently occupying beds and receiving care</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-heading text-[#0f4c5c]">{attendingPatients.length}</div>
          <div className="text-xs uppercase tracking-widest text-muted">Active Beds</div>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 self-start">
          {attendingPatients.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-[#a4c3b2] bg-[#f1f7f6] text-[#2d6a4f] rounded">
              No patients are currently assigned to beds. Assign a doctor from the Doctors tab.
            </div>
          )}

          {attendingPatients.map(p => {
            const doc = doctors.find(d => d.currentPatientId === p.caseId)!;
            const wait = Math.max(0, differenceInMinutes(currentTime, new Date(p.arrivalTime)));
            const dec = decisions[p.caseId];

            return (
              <div key={p.caseId} className="relative overflow-hidden rounded-lg shadow-sm border border-[#b2d8d8] bg-white transition-all hover:shadow-md">
                {/* Colorful Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-[#006d77] to-[#83c5be] text-white flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-heading mb-1">{p.name}</h3>
                    <div className="text-xs opacity-90">{p.age}{p.sex} • MRN {(parseInt(p.caseId.replace(/\D/g, '')) * 137) % 900000 + 100000}</div>
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border border-white/30 flex items-center gap-1">
                    <Bed size={14} /> Bed {Math.floor(Math.random() * 20) + 1}
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                  <div className="flex items-center gap-3 bg-[#edf6f9] p-3 rounded border border-[#daeaf6]">
                    <div className="bg-[#006d77] text-white p-2 rounded-full"><User size={16} /></div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-[#006d77] font-bold">Attending Provider</div>
                      <div className="font-medium text-sm">{doc.name}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-widest text-muted">Chief Complaint</div>
                      <div className="text-sm font-medium truncate" title={p.chiefComplaintVerbatim}>{p.chiefComplaintVerbatim}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-widest text-muted">Total Time in ED</div>
                      <div className="text-sm font-medium flex items-center gap-1"><Clock size={14} className="text-[#83c5be]"/> {wait}m</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-300 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-muted">Triage Acuity</span>
                      <span className="bg-[#006d77] text-white px-2 py-0.5 rounded text-xs font-bold">ESI {dec.recommendedESI}</span>
                    </div>
                    <Link to={`/patient/${p.caseId}`} className="text-[#006d77] hover:text-[#005058] flex items-center gap-1 text-xs font-semibold">
                      View Chart <Activity size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resource Sidebar */}
        <div className="w-80 shrink-0 space-y-6">
          <div className="blueprint p-5">
            <div className="corner tl"></div><div className="corner tr"></div><div className="corner bl"></div><div className="corner br"></div>
            <h3 className="font-heading text-lg mb-4 flex items-center gap-2"><Activity size={18} /> Sensor-Tracked Assets</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Portable X-Ray Units</span>
                  <span className="font-bold">1 / 3 Free</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-[#006d77] w-2/3"></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Crash Carts (Bay A)</span>
                  <span className="font-bold">4 / 4 Ready</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Telemetry Monitors</span>
                  <span className="font-bold">18 / 20 In Use</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-[#a8564a] w-[90%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Ultrasound (POCUS)</span>
                  <span className="font-bold">0 / 2 Free</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gray-400 w-full"></div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-3 bg-surface border border-divider text-xs text-muted rounded">
              Asset tracking is powered by active RFID tags integrated into the hospital's Bluetooth Low Energy (BLE) mesh network.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
