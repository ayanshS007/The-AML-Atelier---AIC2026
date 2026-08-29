import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Queue } from './components/Queue';
import { Intake } from './components/Intake';
import { PatientDetail } from './components/PatientDetail';
import { EscalationModal } from './components/EscalationModal';
import { Audit } from './components/Audit';
import { WaitingRoom } from './components/WaitingRoom';
import { Oversight } from './components/Oversight';
import { Doctors } from './components/Doctors';
import { Attending } from './components/Attending';
import { ICU } from './components/ICU';
import { useStore } from './store';
import clsx from 'clsx';

function NavLinks() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="flex gap-4 ml-6 text-[11px] font-heading tracking-wider items-center">
      <Link to="/intake" className={clsx("pb-1 border-b-2", isActive('/intake') ? "text-accent border-accent" : "border-transparent text-muted hover:text-text")}>INTAKE</Link>
      <span className="text-gray-500">➔</span>
      <Link to="/" className={clsx("pb-1 border-b-2", isActive('/') ? "text-accent border-accent" : "border-transparent text-muted hover:text-text")}>1. QUEUE</Link>
      <span className="text-gray-500">➔</span>
      <Link to="/waiting" className={clsx("pb-1 border-b-2", isActive('/waiting') ? "text-accent border-accent" : "border-transparent text-muted hover:text-text")}>2. WAITING</Link>
      <span className="text-gray-500">➔</span>
      <Link to="/attending" className={clsx("pb-1 border-b-2", isActive('/attending') ? "text-accent border-accent" : "border-transparent text-muted hover:text-text")}>3. ATTENDING</Link>
      <span className="text-gray-500">➔</span>
      <Link to="/icu" className={clsx("pb-1 border-b-2", isActive('/icu') ? "text-accent border-accent" : "border-transparent text-muted hover:text-text")}>ICU / CRIT</Link>
      
      <div className="w-px h-4 bg-divider mx-2"></div>
      
      <Link to="/doctors" className={clsx("pb-1 border-b-2", isActive('/doctors') ? "text-accent border-accent" : "border-transparent text-muted hover:text-text")}>STAFFING</Link>
      <Link to="/oversight" className={clsx("pb-1 border-b-2", isActive('/oversight') ? "text-accent border-accent" : "border-transparent text-muted hover:text-text")}>OVERSIGHT</Link>
      <Link to="/audit" className={clsx("pb-1 border-b-2", isActive('/audit') ? "text-accent border-accent" : "border-transparent text-muted hover:text-text")}>AUDIT</Link>
    </div>
  );
}

function App() {
  const loadFromBackend = useStore(s => s.loadFromBackend);
  const backendOnline = useStore(s => s.backendOnline);

  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center gap-6 p-4 border-b border-divider shrink-0">
          <div className="font-heading font-semibold text-lg tracking-wide shrink-0">
            PATIENTTRIAGE<span className="text-accent">.AI</span>
          </div>
          <NavLinks />
          <div className="ml-auto text-xs text-muted flex items-center gap-4 shrink-0">
            <span className={`inline-block w-2 h-2 rounded-full ${backendOnline ? 'bg-green-500' : 'bg-yellow-500'}`} title={backendOnline ? 'Backend connected' : 'Using local data'} />
            <span className="font-heading tracking-widest uppercase">St. Mary's ED • Triage Bay 1</span>
          </div>
        </header>
        <main className="flex-1 min-h-0">
          <Routes>
            <Route path="/" element={<Queue />} />
            <Route path="/intake" element={<Intake />} />
            <Route path="/patient/:id" element={<PatientDetail />} />
            <Route path="/waiting" element={<WaitingRoom />} />
            <Route path="/attending" element={<Attending />} />
            <Route path="/icu" element={<ICU />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/oversight" element={<Oversight />} />
            <Route path="/audit" element={<Audit />} />
          </Routes>
          <EscalationModal />
        </main>
      </div>
    </Router>
  );
}

export default App;
