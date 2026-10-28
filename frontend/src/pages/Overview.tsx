import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle,
  FileSearch,
  Filter,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Server,
  Plus,
  Shield,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsDashboard, Incident } from '../types/incident';
import { StatCard } from '../components/StatCard';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import {
  CategoryBarChart,
  SeverityDonutChart,
  TrendLineChart,
  PriorityDonutChart
} from '../components/InteractiveCharts';
import { IncidentModal } from '../components/IncidentModal';
import { CyberThreatHUD } from '../components/CyberThreatHUD';

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: Record<string, string> = {};
      if (severityFilter !== 'All') filters.severity = severityFilter;
      if (categoryFilter !== 'All') filters.category = categoryFilter;

      const [analyticsRes, incidentsRes] = await Promise.all([
        api.getDashboardAnalytics(filters),
        api.listIncidents({
          page: 1,
          page_size: 6,
          severity: severityFilter !== 'All' ? severityFilter : undefined,
          category: categoryFilter !== 'All' ? categoryFilter : undefined,
          sort_by: 'timestamp',
          sort_dir: 'desc',
        }),
      ]);

      setAnalytics(analyticsRes);
      setRecentIncidents(incidentsRes.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [severityFilter, categoryFilter]);

  const summary = analytics?.summary;
  const total = summary?.total_incidents || 0;

  // Percentage calculations from actual database records
  const openPct = total > 0 ? Math.round(((summary?.open_incidents || 0) / total) * 100) : 0;
  const resolvedPct = total > 0 ? Math.round(((summary?.resolved_incidents || 0) / total) * 100) : 0;
  const criticalPct = total > 0 ? Math.round(((summary?.critical_incidents || 0) / total) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Security Incident Overview</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              Live SOC Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time heuristic risk prioritization & academic incident response tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Severity Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-750 px-2.5 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All</option>
              <option value="Critical" className="bg-slate-900">Critical</option>
              <option value="High" className="bg-slate-900">High</option>
              <option value="Medium" className="bg-slate-900">Medium</option>
              <option value="Low" className="bg-slate-900">Low</option>
            </select>
          </div>

          <button
            onClick={fetchData}
            title="Refresh dashboard metrics"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Synthetic Incident</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline hover:text-red-300 font-semibold">
            Retry Connection
          </button>
        </div>
      )}

      {/* 6 Required Overview Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Total Incidents */}
        <StatCard
          title="Total Incidents"
          value={summary?.total_incidents ?? '—'}
          icon={ShieldAlert}
          variant="cyan"
          subtitle="All recorded database events"
          badge="Database"
          onClick={() => navigate('/incidents')}
        />

        {/* 2. Open Incidents */}
        <StatCard
          title="Open Incidents"
          value={summary?.open_incidents ?? '—'}
          icon={Clock}
          variant="red"
          subtitle={`${openPct}% of total alerts`}
          badge="Active"
          onClick={() => navigate('/incidents?status=Open')}
        />

        {/* 3. Critical Incidents */}
        <StatCard
          title="Critical Incidents"
          value={summary?.critical_incidents ?? '—'}
          icon={Flame}
          variant="orange"
          subtitle={`${criticalPct}% severe exposure`}
          badge="P1 Urgent"
          onClick={() => navigate('/incidents?severity=Critical')}
        />

        {/* 4. Incidents Under Investigation */}
        <StatCard
          title="Under Investigation"
          value={summary?.investigating_incidents ?? '—'}
          icon={FileSearch}
          variant="amber"
          subtitle="Active forensic triage"
          badge="Triage"
          onClick={() => navigate('/incidents?status=Investigating')}
        />

        {/* 5. Resolved Incidents */}
        <StatCard
          title="Resolved Incidents"
          value={summary?.resolved_incidents ?? '—'}
          icon={CheckCircle}
          variant="emerald"
          subtitle={`${resolvedPct}% remediation rate`}
          badge="Remediated"
          onClick={() => navigate('/incidents?status=Resolved')}
        />

        {/* 6. High-Priority Incidents */}
        <StatCard
          title="High-Priority Incidents"
          value={summary?.unresolved_high_priority_count ?? '—'}
          icon={TrendingUp}
          variant="purple"
          subtitle="Unresolved Tier 1 & 2"
          badge="Risk >= 60"
          onClick={() => navigate('/risk-prioritization')}
        />
      </div>

      {/* Cyber SOC Threat Topology & Sonar Radar HUD */}
      <CyberThreatHUD />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution Donut */}
        <div className="cyber-hud-card cyber-corners p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Severity Distribution</h2>
              <p className="text-[11px] text-slate-400">Initial incident impact classifications</p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
              Live Database
            </span>
          </div>
          <SeverityDonutChart data={analytics?.severity_distribution || []} />
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="cyber-hud-card cyber-corners p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Category Distribution</h2>
              <p className="text-[11px] text-slate-400">Frequency of alert categories</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Top 7 Vectors</span>
          </div>
          <CategoryBarChart data={analytics?.category_distribution || []} />
        </div>

        {/* Risk Priority Tier Distribution */}
        <div className="cyber-hud-card cyber-corners p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Risk Priority Tiers</h2>
              <p className="text-[11px] text-slate-400">Deterministic algorithm scoring tiers</p>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
              Avg: {summary?.avg_risk_score ?? 0} / 100
            </span>
          </div>
          <PriorityDonutChart data={analytics?.priority_distribution || []} />

          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Unresolved Critical/High:</span>
            <span className="font-mono font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/50">
              {summary?.unresolved_high_priority_count ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Incident Frequency Trend Row */}
      <div className="cyber-hud-card cyber-corners p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Incident Ingestion Trend</h2>
              <p className="text-[11px] text-slate-400">Timeline of detected alerts across days</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">14-Day Vector</span>
        </div>
        <TrendLineChart data={analytics?.trend_over_time || []} />
      </div>

      {/* Recent Incidents Table Preview */}
      <div className="cyber-hud-card cyber-corners overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Recent Security Incidents</h2>
            <p className="text-xs text-slate-400">Latest alerts queued in the operations center</p>
          </div>
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
          >
            <span>View Full Queue ({summary?.total_incidents ?? 0})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Priority / Score</th>
                <th className="py-3 px-4">Simulated Asset</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {recentIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No incidents match the active filters.
                  </td>
                </tr>
              ) : (
                recentIncidents.map((inc) => (
                  <tr key={inc.incident_id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{inc.incident_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {inc.timestamp?.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{inc.category}</td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={inc.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={inc.risk_priority} score={inc.risk_score} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[150px]">{inc.affected_asset}</span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/investigation?id=${inc.incident_id}`)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 font-medium transition-colors"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <IncidentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};
