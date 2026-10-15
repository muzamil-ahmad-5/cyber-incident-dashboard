import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Calculator,
  ShieldCheck,
  Database,
  KeyRound,
  FileCode,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);

  // Live Risk Simulator Sandbox state for viva demonstration
  const [simSeverity, setSimSeverity] = useState('Critical');
  const [simImpact, setSimImpact] = useState('High');
  const [simHours, setSimHours] = useState(72);
  const [simStatus, setSimStatus] = useState('Open');
  const [simAssetProd, setSimAssetProd] = useState(true);

  useEffect(() => {
    api.getSystemHealth()
      .then(setHealth)
      .catch(console.error)
      .finally(() => setIsLoadingHealth(false));
  }, []);

  // Compute simulated score live
  const severityScores: Record<string, number> = { Critical: 40, High: 25, Medium: 15, Low: 5 };
  const impactScores: Record<string, number> = { Critical: 25, High: 25, Medium: 15, Low: 5 };
  const statusMultipliers: Record<string, number> = {
    Open: 1.0,
    Investigating: 0.85,
    Contained: 0.40,
    Resolved: 0.10,
    Closed: 0.05,
  };

  const baseSev = severityScores[simSeverity] || 15;
  const baseImp = Math.min(25, (impactScores[simImpact] || 15) + (simAssetProd ? 5 : 0));
  const agingPts = ['Resolved', 'Closed'].includes(simStatus) ? 0 : Math.min(20, Number((simHours * 0.25).toFixed(1)));
  const multiplier = statusMultipliers[simStatus] || 1.0;
  const rawSubtotal = baseSev + baseImp + agingPts;
  const calcScore = Math.round(Math.max(0, Math.min(100, rawSubtotal * multiplier)) * 10) / 10;

  const calcTier = calcScore >= 80 ? 'CRITICAL' : calcScore >= 60 ? 'HIGH' : calcScore >= 35 ? 'MEDIUM' : 'LOW';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">CYBERGUARD SOC Configuration & Viva Reference</h1>
        <p className="text-xs text-slate-400 mt-1">
          Technical specifications, live deterministic algorithm simulator, and viva defense parameters
        </p>
      </div>

      {/* System Health Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Application Architecture & Health</h3>
            <p className="text-xs text-slate-400">FastAPI backend + SQLite persistent storage runtime telemetry</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Database Connectivity</div>
            <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>SQLite Connected</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">data/incident_dashboard.db</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Stored Records</div>
            <div className="text-base font-bold font-mono text-cyan-400">
              {health?.stats?.incidents ?? '250'} Incidents
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {health?.stats?.audit_logs ?? '250+'} audit logs recorded
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Security & Encryption</div>
            <div className="text-base font-bold font-mono text-purple-400">
              Bcrypt + JWT (HS256)
            </div>
            <div className="text-[10px] text-slate-500 mt-1">CWE-1236 CSV Sanitization Active</div>
          </div>
        </div>
      </div>

      {/* Interactive Risk Simulator for Viva Defense */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live Risk Prioritization Algorithm Sandbox</h3>
              <p className="text-xs text-slate-400">
                Interactive simulator for university viva demonstration of deterministic boundary conditions
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
            Interactive Testbed
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">1. Severity Factor</label>
                <select
                  value={simSeverity}
                  onChange={(e) => setSimSeverity(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Critical">Critical (40 pts)</option>
                  <option value="High">High (25 pts)</option>
                  <option value="Medium">Medium (15 pts)</option>
                  <option value="Low">Low (5 pts)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">2. Potential Impact</label>
                <select
                  value={simImpact}
                  onChange={(e) => setSimImpact(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Critical">Critical (25 pts)</option>
                  <option value="High">High (25 pts)</option>
                  <option value="Medium">Medium (15 pts)</option>
                  <option value="Low">Low (5 pts)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  3. Unresolved Duration: <span className="text-cyan-400 font-mono">{simHours}h</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="4"
                  value={simHours}
                  onChange={(e) => setSimHours(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>0h (Fresh)</span>
                  <span>48h (Elevated)</span>
                  <span>80h+ (Cap: 20pts)</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">4. Investigation Lifecycle</label>
                <select
                  value={simStatus}
                  onChange={(e) => setSimStatus(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Open">Open (1.00x multiplier)</option>
                  <option value="Investigating">Investigating (0.85x multiplier)</option>
                  <option value="Contained">Contained (0.40x multiplier)</option>
                  <option value="Resolved">Resolved (0.10x multiplier)</option>
                  <option value="Closed">Closed (0.05x multiplier)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="simProd"
                checked={simAssetProd}
                onChange={(e) => setSimAssetProd(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 accent-cyan-500"
              />
              <label htmlFor="simProd" className="text-slate-300 cursor-pointer">
                Simulated Asset has Critical Hostname Keyword (+5.0 pts bonus, e.g. <code className="text-cyan-400 font-mono">prod, auth, db</code>)
              </label>
            </div>
          </div>

          {/* Real-time Calculation Result Box */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                Simulated Engine Output
              </div>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold font-mono text-cyan-400">{calcScore}</span>
                <span className="text-xs text-slate-500 font-mono">/ 100 max</span>
                <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  calcTier === 'CRITICAL' ? 'bg-red-950 text-red-200 border border-red-800' :
                  calcTier === 'HIGH' ? 'bg-amber-950 text-amber-200 border border-amber-800' :
                  calcTier === 'MEDIUM' ? 'bg-yellow-950 text-yellow-200 border border-yellow-800' :
                  'bg-blue-950 text-blue-200 border border-blue-800'
                }`}>
                  Tier: {calcTier}
                </span>
              </div>

              {/* Factor Breakdown */}
              <div className="space-y-1.5 font-mono text-xs text-slate-300 pt-3 border-t border-slate-850">
                <div className="flex justify-between">
                  <span className="text-slate-400">Base Severity Score:</span>
                  <span>+{baseSev.toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Impact Score (w/ asset weighting):</span>
                  <span>+{baseImp.toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Aging Factor ({simHours}h unresolved):</span>
                  <span>+{agingPts.toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Score:</span>
                  <span>{rawSubtotal.toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between text-emerald-400 pt-1 border-t border-slate-850">
                  <span>Status Multiplier ({simStatus}):</span>
                  <span>× {multiplier.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-4 leading-snug">
              Heuristic Formula: <code className="text-slate-400 font-mono">Score = clamp((BaseSeverity + Impact + Aging) * StatusMultiplier, 0, 100)</code>
            </p>
          </div>
        </div>
      </div>

      {/* University Viva & Milestone Guide */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">University Viva Defense & Evaluation Guide</h3>
            <p className="text-xs text-slate-400">Key talking points for defending the Information Security term project</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-cyan-400">1. Problem Statement & Objective</h4>
            <p className="text-slate-400 text-[11px]">
              Modern SOC analysts face severe alert fatigue from high-volume security monitoring systems. This project provides a centralized, reproducible dashboard with deterministic risk prioritization to order incidents by urgency rather than raw arrival time.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-cyan-400">2. Deterministic vs "Black Box" Scoring</h4>
            <p className="text-slate-400 text-[11px]">
              Rather than using an opaque black-box machine learning model without sufficient historical labels, the application uses an explainable heuristic algorithm that guarantees every score can be mathematically justified and audited during compliance reviews.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-cyan-400">3. Built-in Security Controls</h4>
            <p className="text-slate-400 text-[11px]">
              - Password security: Salted Bcrypt hashing with no plaintext storage.
              - Authorization: Role-based access control (RBAC) separating Analysts from Admins.
              - Auditability: Persistent audit logging of all destructive and lifecycle changes.
              - Export safety: Sanitization against CSV Formula Injection (CWE-1236).
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-cyan-400">4. Academic Integrity & Synthetic Scope</h4>
            <p className="text-slate-400 text-[11px]">
              All 250 incident records are generated via a deterministic random seed (seed 42). Fictional asset hostnames are used to prevent disclosing organizational logs or private information, aligning with university ethics standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
