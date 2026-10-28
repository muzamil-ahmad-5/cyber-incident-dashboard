import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  BarChart2,
  PieChart,
  Server,
  Clock,
  ShieldCheck,
  RefreshCw,
  Flame,
  AlertCircle,
  Filter,
  RotateCcw,
  TrendingUp,
  Activity,
  Layers,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsDashboard } from '../types/incident';
import {
  CategoryBarChart,
  SeverityDonutChart,
  TrendLineChart,
  PriorityDonutChart
} from '../components/InteractiveCharts';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatCard } from '../components/StatCard';

const CATEGORIES = [
  'All',
  'Suspicious Login',
  'Phishing Alert',
  'Malware Alert',
  'Unauthorized Access',
  'Brute-Force Attempt',
  'Suspicious Network Activity',
  'Data Exfiltration Alert',
  'Privilege Escalation',
  'Policy Violation',
  'Other',
];

const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];

export const ThreatAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: Record<string, string> = {};
      if (categoryFilter !== 'All') filters.category = categoryFilter;
      if (severityFilter !== 'All') filters.severity = severityFilter;
      if (fromDate) filters.from_date = fromDate;
      if (toDate) filters.to_date = toDate;

      const data = await api.getDashboardAnalytics(filters);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [categoryFilter, severityFilter, fromDate, toDate]);

  const handleResetFilters = () => {
    setCategoryFilter('All');
    setSeverityFilter('All');
    setFromDate('');
    setToDate('');
  };

  const topAssets = analytics?.top_affected_assets || [];
  const agingBuckets = analytics?.aging_distribution || [];
  const summary = analytics?.summary;
  const total = summary?.total_incidents || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Threat & Incident Analytics</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              Pandas 2.2 Aggregation Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic evaluation of security telemetry, asset exposure, and open incident aging
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-semibold transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Filter Controls Toolbar */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Analytical Scope & Date Filters</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Alert Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-slate-900">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Severity Scope</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">From Timestamp</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">To Timestamp</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Analytical KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Analyzed Incidents"
          value={summary?.total_incidents ?? '—'}
          icon={Activity}
          variant="cyan"
          subtitle="Matching active filter scope"
        />

        <StatCard
          title="Avg Heuristic Score"
          value={summary?.avg_risk_score !== undefined ? `${summary.avg_risk_score} / 100` : '—'}
          icon={BarChart2}
          variant="amber"
          subtitle="Deterministic priority index"
        />

        <StatCard
          title="Mean Time To Resolve"
          value={
            summary?.mttr_hours !== null && summary?.mttr_hours !== undefined
              ? `${summary.mttr_hours} hrs`
              : 'N/A'
          }
          icon={Clock}
          variant="emerald"
          subtitle={
            summary?.mttr_hours !== null && summary?.mttr_hours !== undefined
              ? 'Calculated from resolved_at timestamps'
              : 'Requires resolved incidents with timestamps'
          }
        />

        <StatCard
          title="Unresolved High Priority"
          value={summary?.unresolved_high_priority_count ?? '—'}
          icon={Flame}
          variant="red"
          subtitle="Urgent tickets needing triage"
          badge="Urgent"
          onClick={() => navigate('/incidents?status=Open&severity=Critical')}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Severity Frequency */}
        <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Severity Frequency</h2>
          </div>
          <SeverityDonutChart data={analytics?.severity_distribution || []} />
        </div>

        {/* Priority Breakdown */}
        <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Risk Priority Tiers</h2>
          </div>
          <PriorityDonutChart data={analytics?.priority_distribution || []} />
        </div>

        {/* Open Aging Buckets */}
        <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">Open Incident Aging</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Time elapsed since detection for all active, uncontained tickets:
            </p>

            <div className="space-y-3">
              {agingBuckets.map((bucket) => {
                const maxAgingCount = Math.max(...agingBuckets.map((b) => b.count), 1);
                const pct = Math.round((bucket.count / maxAgingCount) * 100);
                return (
                  <div key={bucket.range} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300">{bucket.range}</span>
                      <span className="font-mono text-cyan-400 font-bold">{bucket.count}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-purple-600 transition-all duration-500"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            *Aging factor applies +0.25 pts/hr to heuristic score, capped at 80 hours (20.0 pts).
          </div>
        </div>
      </div>

      {/* Incident Trends Over Time */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Daily Incident Ingestion Velocity</h2>
              <p className="text-[11px] text-slate-400">Historical frequency curves grouped by detection date</p>
            </div>
          </div>
        </div>
        <TrendLineChart data={analytics?.trend_over_time || []} />
      </div>

      {/* Top Affected Simulated Assets Table */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Top Impacted Simulated Assets</h2>
              <p className="text-[11px] text-slate-400">Simulated infrastructure hosts incurring recurring alerts</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Asset Hostname</th>
                <th className="py-2.5 px-3">Alert Count</th>
                <th className="py-2.5 px-3">Max Severity</th>
                <th className="py-2.5 px-3">Avg Risk Score</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {topAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No asset exposure data available.
                  </td>
                </tr>
              ) : (
                topAssets.map((asset) => (
                  <tr key={asset.asset} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400 flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-slate-500" />
                      <span>{asset.asset}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-white">{asset.incident_count} incidents</td>
                    <td className="py-2.5 px-3">
                      <SeverityBadge severity={asset.max_severity as any} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                      {asset.avg_risk_score} / 100
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => navigate(`/incidents?search=${encodeURIComponent(asset.asset)}`)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 text-[11px] font-medium transition-colors"
                      >
                        Filter Queue
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
