import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/authContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Overview } from './pages/Overview';
import { Incidents } from './pages/Incidents';
import { Investigation } from './pages/Investigation';
import { ThreatAnalytics } from './pages/ThreatAnalytics';
import { RiskPrioritization } from './pages/RiskPrioritization';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { SettingsPage } from './pages/Settings';

export function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AuthProvider>
      <Router>
        <div className="flex min-h-screen bg-[#070B14] text-slate-100 font-sans antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
          {/* Collapsible Persistent Sidebar */}
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
            <Navbar />
            <main className="flex-1 pb-12">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/incidents" element={<Incidents />} />
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
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
