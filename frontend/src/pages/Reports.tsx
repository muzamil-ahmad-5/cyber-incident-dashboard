import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Info,
  Printer,
  RefreshCw,
  Layers,
  BarChart2,
  Flame
} from 'lucide-react';
import { api } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Incident, AnalyticsDashboard } from '../types/incident';

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
const STATUSES = ['All', 'Open', 'Investigating', 'Contained', 'Resolved', 'Closed'];

export const Reports: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [unresolvedReport, setUnresolvedReport] = useState<any>(null);
  const [previewIncidents, setPreviewIncidents] = useState<Incident[]>([]);
  const [totalMatching, setTotalMatching] = useState<number>(0);

  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (filterSeverity !== 'All') filters.severity = filterSeverity;
      if (filterCategory !== 'All') filters.category = filterCategory;
      if (filterStatus !== 'All') filters.status = filterStatus;
      if (fromDate) filters.from_date = fromDate;
      if (toDate) filters.to_date = toDate;

      const [analyticsRes, urgentRes, incidentsRes] = await Promise.all([
        api.getDashboardAnalytics(filters),
        api.getUnresolvedHighPriorityReport(),
        api.listIncidents({ ...filters, page: 1, page_size: 10, sort_by: 'timestamp', sort_dir: 'desc' }),
      ]);

      setAnalytics(analyticsRes);
      setUnresolvedReport(urgentRes);
      setPreviewIncidents(incidentsRes.items || []);
      setTotalMatching(incidentsRes.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch report data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [filterSeverity, filterCategory, filterStatus, fromDate, toDate]);

  const handleDownloadCSV = async () => {
    setIsExporting(true);
    try {
      const filters: Record<string, string> = {};
      if (filterSeverity !== 'All') filters.severity = filterSeverity;
      if (filterCategory !== 'All') filters.category = filterCategory;
      if (filterStatus !== 'All') filters.status = filterStatus;
      if (fromDate) filters.from_date = fromDate;
      if (toDate) filters.to_date = toDate;

      await api.downloadCSV(filters);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = analytics?.summary;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Security Incident Reports & Exports</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              SOC Compliance Module
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate sanitised CSV exports, executive summaries, and filtered incident reports from actual database records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReportData}
            title="Refresh Report Data"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Incident Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-[#0F172A]/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="text-slate-400 mb-1">Total In Scope</div>
          <div className="text-2xl font-mono font-extrabold text-cyan-400">
            {summary?.total_incidents ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Matching current filter parameters</div>
        </div>

        <div className="bg-[#0F172A]/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="text-slate-400 mb-1">Critical & High</div>
          <div className="text-2xl font-mono font-extrabold text-orange-400">
            {(summary?.critical_incidents ?? 0) + (summary?.high_incidents ?? 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {summary?.critical_incidents ?? 0} Critical • {summary?.high_incidents ?? 0} High
          </div>
        </div>

        <div className="bg-[#0F172A]/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="text-slate-400 mb-1">Active Open Queue</div>
          <div className="text-2xl font-mono font-extrabold text-red-400">
            {summary?.open_incidents ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {summary?.investigating_incidents ?? 0} currently under investigation
          </div>
        </div>

        <div className="bg-[#0F172A]/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="text-slate-400 mb-1">Resolved & Closed</div>
          <div className="text-2xl font-mono font-extrabold text-emerald-400">
            {(summary?.resolved_incidents ?? 0) + (summary?.closed_incidents ?? 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Avg Risk Index: {summary?.avg_risk_score ?? 0} / 100
          </div>
        </div>
      </div>

      {/* Export Controls & Filter Card */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Generate Filtered CSV Incident Export</h2>
            <p className="text-xs text-slate-400">Download formatted incident logs with spreadsheet formula injection protection</p>
          </div>
        </div>

        {/* Filter Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Severity Scope</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Category Scope</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Status Scope</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="flex items-start gap-2 text-xs text-slate-400 max-w-xl">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">
              <strong>Security Control (CWE-1236 Sanitization):</strong> In order to defend against Spreadsheet Formula Injection, cells starting with characters <code className="text-cyan-300">=, +, -, @</code> are neutralized with a leading single quote before CSV export.
            </span>
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all shrink-0 self-end sm:self-auto disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating CSV...' : `Download CSV Report (${totalMatching})`}</span>
          </button>
        </div>
      </div>

      {/* Breakdown Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Severity Breakdown */}
        <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Severity Breakdown</h2>
          <div className="space-y-2 text-xs">
            {analytics?.severity_distribution?.map((item) => (
              <div key={item.severity} className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-850">
                <span className="text-slate-300 font-medium">{item.severity}</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {item.count} <span className="text-slate-500 font-normal">({item.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Calculated Priority Breakdown</h2>
          <div className="space-y-2 text-xs">
            {analytics?.priority_distribution?.map((item) => (
              <div key={item.priority} className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-850">
                <span className="text-slate-300 font-medium">{item.priority}</span>
                <span className="font-mono text-amber-400 font-bold">
                  {item.count} <span className="text-slate-500 font-normal">({item.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Category Vectors</h2>
          <div className="space-y-2 text-xs">
            {analytics?.category_distribution?.slice(0, 4).map((item) => (
              <div key={item.category} className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-850">
                <span className="text-slate-300 font-medium truncate max-w-[170px]" title={item.category}>
                  {item.category}
                </span>
                <span className="font-mono text-purple-400 font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtered Records Preview Table */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Filtered Records Preview</h2>
              <p className="text-xs text-slate-400">First 10 records matching the export filter criteria</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Showing {previewIncidents.length} of {totalMatching} matching records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Affected Asset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading records from database...
                  </td>
                </tr>
              ) : previewIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No incidents match the active filter criteria.
                  </td>
                </tr>
              ) : (
                previewIncidents.map((item) => (
                  <tr key={item.incident_id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{item.incident_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {item.timestamp?.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{item.category}</td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={item.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{item.risk_score}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{item.affected_asset}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unresolved High-Priority Incident Report */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Unresolved Critical & High Priority Triage Report</h2>
              <p className="text-xs text-slate-400">Active incidents requiring urgent SOC analyst investigation</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">
              Total Urgent: <strong className="text-red-400 font-mono">{unresolvedReport?.total_unresolved_urgent_incidents ?? 0}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-mono text-[11px]">
              Generated: {unresolvedReport?.generated_at ?? 'Live'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Age (Hours)</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Priority / Score</th>
                <th className="py-3 px-4">Simulated Asset</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading priority triage report...</td>
                </tr>
              ) : !unresolvedReport?.items?.length ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-emerald-400 font-medium">
                    No active high or critical incidents are currently unresolved.
                  </td>
                </tr>
              ) : (
                unresolvedReport.items.map((item: any) => (
                  <tr key={item.incident_id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{item.incident_id}</td>
                    <td className="py-3 px-4 font-mono text-red-400 font-semibold">{item.hours_open}h</td>
                    <td className="py-3 px-4 font-medium text-white">{item.category}</td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={item.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={item.risk_priority} score={item.risk_score} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{item.affected_asset}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-400">{item.assigned_analyst}</td>
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
