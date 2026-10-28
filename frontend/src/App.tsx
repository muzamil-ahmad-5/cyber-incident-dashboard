import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/authContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { CyberTacticalTicker } from './components/CyberTacticalTicker';
import { CyberBackground } from './components/CyberBackground';
import { CyberCommandTerminal } from './components/CyberCommandTerminal';
import { Overview } from './pages/Overview';
import { Incidents } from './pages/Incidents';
import { Investigation } from './pages/Investigation';
import { ThreatAnalytics } from './pages/ThreatAnalytics';
import { RiskPrioritization } from './pages/RiskPrioritization';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { SettingsPage } from './pages/Settings';
import { AIEntityClassifier } from './pages/AIEntityClassifier';
import { cyberAudio } from './services/cyberAudio';

export function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [defconLevel, setDefconLevel] = useState(2);
  const [matrixEnabled, setMatrixEnabled] = useState(true);
  const [scanlinesEnabled, setScanlinesEnabled] = useState(true);

  // Keyboard shortcut for Cyber Command Terminal (Ctrl+K or ` / ~)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '`' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault();
        setTerminalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="flex min-h-screen bg-[#070B14] text-slate-100 font-sans antialiased selection:bg-cyan-500/20 selection:text-cyan-300 relative overflow-hidden">
          {/* Cybernetic Dynamic Canvas Background & Scanlines */}
          <CyberBackground
            matrixEnabled={matrixEnabled}
            scanlinesEnabled={scanlinesEnabled}
          />

          {/* Collapsible Persistent Sidebar */}
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto z-10">
            {/* Main Navbar */}
            <Navbar onOpenTerminal={() => setTerminalOpen(true)} />

            {/* Tactical Cyber Ticker Banner */}
            <CyberTacticalTicker
              currentDefcon={defconLevel}
              onSetDefcon={(lvl) => setDefconLevel(lvl)}
              onOpenTerminal={() => setTerminalOpen(true)}
              matrixEnabled={matrixEnabled}
              onToggleMatrix={() => setMatrixEnabled(!matrixEnabled)}
              scanlinesEnabled={scanlinesEnabled}
              onToggleScanlines={() => setScanlinesEnabled(!scanlinesEnabled)}
            />

            {/* View Router */}
            <main className="flex-1 pb-12 relative">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/ai-classifier" element={<AIEntityClassifier />} />
                <Route path="/analytics" element={<ThreatAnalytics />} />
                <Route path="/risk-prioritization" element={<RiskPrioritization />} />
                <Route path="/investigation" element={<Investigation />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>

          {/* Tactical Cyber CLI Terminal Modal */}
          <CyberCommandTerminal
            isOpen={terminalOpen}
            onClose={() => setTerminalOpen(false)}
            currentDefcon={defconLevel}
            onSetDefcon={(lvl) => setDefconLevel(lvl)}
            matrixEnabled={matrixEnabled}
            onToggleMatrix={() => setMatrixEnabled(!matrixEnabled)}
            scanlinesEnabled={scanlinesEnabled}
            onToggleScanlines={() => setScanlinesEnabled(!scanlinesEnabled)}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
