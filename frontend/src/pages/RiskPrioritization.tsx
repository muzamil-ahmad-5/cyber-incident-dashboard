import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Calculator,
  Sliders,
  Info,
  Server,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Incident } from '../types/incident';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';

export const RiskPrioritization: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Live Interactive Simulator state
  const [simSeverity, setSimSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Critical');
  const [simImpact, setSimImpact] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [simHours, setSimHours] = useState(48);
  const [simStatus, setSimStatus] = useState<'Open' | 'Investigating' | 'Contained' | 'Resolved' | 'Closed'>('Open');
  const [simAssetProd, setSimAssetProd] = useState(true);

  // Fetch real incidents sorted by risk score descending
  const fetchRankedIncidents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.listIncidents({
        page: 1,
        page_size: 25,
        sort_by: 'risk_score',
        sort_dir: 'desc',
        search: searchTerm.trim() || undefined,
      });
      setIncidents(res.items || []);
      if (!selectedIncident && res.items?.length > 0) {
        setSelectedIncident(res.items[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load risk rankings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRankedIncidents();
  }, [searchTerm]);

  // Deterministic formula weights
  const severityPoints: Record<string, number> = { Critical: 40.0, High: 25.0, Medium: 15.0, Low: 5.0 };
  const impactPoints: Record<string, number> = { Critical: 25.0, High: 25.0, Medium: 15.0, Low: 5.0 };
  const statusMultipliers: Record<string, number> = {
    Open: 1.0,
    Investigating: 0.85,
    Contained: 0.40,
    Resolved: 0.10,
    Closed: 0.05,
  };

  // Live calculation
  const baseSev = severityPoints[simSeverity] || 15.0;
  const rawImpact = (impactPoints[simImpact] || 15.0) + (simAssetProd ? 5.0 : 0.0);
  const finalImpact = Math.min(25.0, rawImpact);
  const agingPts = ['Resolved', 'Closed'].includes(simStatus) ? 0.0 : Math.min(20.0, Number((simHours * 0.25).toFixed(1)));
  const multiplier = statusMultipliers[simStatus] || 1.0;
  const subtotal = baseSev + finalImpact + agingPts;
  const rawScore = subtotal * multiplier;
  const finalSimScore = Math.round(Math.max(0.0, Math.min(100.0, rawScore)) * 10) / 10;
  const simTier = finalSimScore >= 80 ? 'CRITICAL' : finalSimScore >= 60 ? 'HIGH' : finalSimScore >= 35 ? 'MEDIUM' : 'LOW';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Risk Prioritization Workspace</h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              Heuristic Engine v2.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Explainable, deterministic multi-factor scoring (0–100 scale) for academic SOC triage
          </p>
        </div>

        <button
          onClick={fetchRankedIncidents}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Rankings</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Algorithm Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
            <ShieldAlert className="w-4 h-4" />
            <span>1. Base Severity (Max 40 pts)</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Deterministic baseline reflecting inherent incident severity classification:
            Critical = 40, High = 25, Medium = 15, Low = 5.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-purple-400 font-semibold mb-2">
            <Server className="w-4 h-4" />
            <span>2. Impact & Asset (Max 25 pts)</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Potential operational damage with +5 bonus for core infrastructure (prod, auth, db, vault, payment, k8s, gateway).
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
            <Clock className="w-4 h-4" />
            <span>3. Aging Penalty (Max 20 pts)</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Unmitigated active exposure penalty: +0.25 pts per elapsed hour open, capped at 80 hours (20.0 points maximum).
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
            <Sliders className="w-4 h-4" />
            <span>4. Status Mitigation</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Lifecycle reduction: Open = 1.0×, Investigating = 0.85×, Contained = 0.40×, Resolved = 0.10×, Closed = 0.05×.
          </p>
        </div>
      </div>

      {/* Interactive Risk Simulator Sandbox */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Interactive Risk Formula Simulator</h2>
              <p className="text-xs text-slate-400">Test hypothetical incident scenarios and observe mathematical score calculation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Simulated Result:</span>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 flex items-center gap-2">
              <span className="text-lg font-bold font-mono text-cyan-400">{finalSimScore} / 100</span>
              <PriorityBadge priority={simTier as any} />
            </div>
          </div>
        </div>

        {/* Simulator Controls */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Severity Level</label>
            <select
              value={simSeverity}
              onChange={(e) => setSimSeverity(e.target.value as any)}
              className="w-full bg-slate-850 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="Critical">Critical (40 pts)</option>
              <option value="High">High (25 pts)</option>
              <option value="Medium">Medium (15 pts)</option>
              <option value="Low">Low (5 pts)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Potential Impact</label>
            <select
              value={simImpact}
              onChange={(e) => setSimImpact(e.target.value as any)}
              className="w-full bg-slate-850 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="Critical">Critical (25 pts)</option>
              <option value="High">High (25 pts)</option>
              <option value="Medium">Medium (15 pts)</option>
              <option value="Low">Low (5 pts)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Affected Asset Type</label>
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simAssetProd}
                onChange={(e) => setSimAssetProd(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
              />
              <span className="text-slate-300 text-xs">Critical Host (+5 pts)</span>
            </label>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Hours Unresolved: {simHours}h</label>
            <input
              type="range"
              min={0}
              max={120}
              value={simHours}
              onChange={(e) => setSimHours(Number(e.target.value))}
              className="w-full mt-2 accent-cyan-400 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Lifecycle Status</label>
            <select
              value={simStatus}
              onChange={(e) => setSimStatus(e.target.value as any)}
              className="w-full bg-slate-850 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="Open">Open (1.00×)</option>
              <option value="Investigating">Investigating (0.85×)</option>
              <option value="Contained">Contained (0.40×)</option>
              <option value="Resolved">Resolved (0.10×)</option>
              <option value="Closed">Closed (0.05×)</option>
            </select>
          </div>
        </div>

        {/* Formula Step-by-Step Breakdown */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
            <span className="text-cyan-400">({baseSev} Base</span>
            <span>+</span>
            <span className="text-purple-400">{finalImpact} Impact</span>
            <span>+</span>
            <span className="text-amber-400">{agingPts} Aging)</span>
            <span>×</span>
            <span className="text-emerald-400">{multiplier.toFixed(2)} Status</span>
            <span>=</span>
            <span className="text-white font-bold">{rawScore.toFixed(1)} raw</span>
            <span>→</span>
            <span className="text-cyan-400 font-bold">Clamped: {finalSimScore}/100</span>
          </div>

          <div className="text-[11px] text-slate-500 italic">
            *Transparent rule-based scoring (non-ML deterministic heuristic)
          </div>
        </div>
      </div>

      {/* Real Prioritized Database Incidents Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-white">Live Incident Prioritization Queue</h2>
            <p className="text-xs text-slate-400">Actual database incidents sorted in order of calculated urgency</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, asset, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-850 border border-slate-750 text-white rounded-lg pl-8 pr-3 py-1.5 text-xs w-64 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">Incident ID</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Affected Asset</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No incidents matching current criteria.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={inc.incident_id}
                    className="hover:bg-slate-850/60 transition-colors group cursor-pointer"
                    onClick={() => setSelectedIncident(inc)}
                  >
                    <td className="py-2.5 px-3">
                      <PriorityBadge priority={inc.risk_priority} />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                      {inc.risk_score}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-200 font-semibold">
                      {inc.incident_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {inc.category}
                    </td>
                    <td className="py-2.5 px-3">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] truncate max-w-[140px]">
                      {inc.affected_asset}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/investigation?id=${inc.incident_id}`);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[11px] font-medium border border-cyan-500/30 transition-colors"
                      >
                        <span>Investigate</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
