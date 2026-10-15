import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  User,
  Clock,
  RotateCcw,
  ShieldCheck,
  Lock,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { PaginatedAuditLogs, AuditLog } from '../types/incident';
import { useAuth } from '../services/authContext';

const ACTIONS = [
  'All',
  'INCIDENT_CREATE',
  'INCIDENT_UPDATE',
  'STATUS_CHANGE',
  'NOTE_ADDED',
  'INCIDENT_DELETE',
  'REPORT_EXPORT',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'DATASET_SEED',
];

const OUTCOMES = ['All', 'SUCCESS', 'FAILURE', 'WARNING'];

export const AuditLogs: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<PaginatedAuditLogs | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('All');
  const [outcome, setOutcome] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.listAuditLogs({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        action: action !== 'All' ? action : undefined,
        outcome: outcome !== 'All' ? outcome : undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, action, outcome]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setAction('All');
    setOutcome('All');
    setPage(1);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">SOC Forensic Audit Trail</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              Immutable SQLite Log
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident forensic record of incident creation, analyst notes, status transitions, and authentication events
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* RBAC Compliance Status Banner */}
      <div className="p-3.5 rounded-2xl bg-[#0F172A]/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-white font-semibold flex items-center gap-2">
              <span>Auditing Access Level:</span>
              <span className="font-mono text-cyan-400 uppercase font-bold">
                {user?.role === 'admin' ? 'SOC Administrator (Full Audit Oversight)' : 'SOC Analyst (Read-Only Operational Trail)'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Audit events are recorded synchronously in SQLite with append-only integrity.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850">
          User: {user?.username} ({user?.role})
        </span>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event ID, actor username, related incident ID, or action details..."
              className="w-full bg-slate-900 border border-slate-750 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            Search Logs
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-750">
            <span className="text-slate-400 font-medium">Action Type:</span>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-mono text-[11px]"
            >
              {ACTIONS.map((act) => (
                <option key={act} value={act} className="bg-slate-900">
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-750">
            <span className="text-slate-400 font-medium">Outcome:</span>
            <select
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              {OUTCOMES.map((oc) => (
                <option key={oc} value={oc} className="bg-slate-900">
                  {oc}
                </option>
              ))}
            </select>
          </div>

          {/* Page Size */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-750">
            <span className="text-slate-400 font-medium">Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-mono"
            >
              <option value={10} className="bg-slate-900">10</option>
              <option value={20} className="bg-slate-900">20</option>
              <option value={50} className="bg-slate-900">50</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 px-2 py-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchLogs} className="underline font-semibold">
            Retry Connection
          </button>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Related Record</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                    <span>Loading audit events from SQLite...</span>
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    No audit records match the active filter criteria.
                  </td>
                </tr>
              ) : (
                data.items.map((log) => {
                  const isSuccess = log.outcome === 'SUCCESS';
                  const isFailure = log.outcome === 'FAILURE';

                  return (
                    <tr key={log.event_id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">{log.event_id}</td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {log.timestamp?.slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-4 font-medium text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>{log.actor}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-purple-300 font-bold">{log.action}</td>
                      <td className="py-3 px-4">
                        {log.incident_id ? (
                          <button
                            onClick={() => navigate(`/investigation?id=${log.incident_id}`)}
                            className="font-mono text-cyan-400 hover:underline flex items-center gap-1"
                            title="Jump to Investigation"
                          >
                            <span>{log.incident_id}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        ) : (
                          <span className="text-slate-500 font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isSuccess
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : isFailure
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-400" />
                          )}
                          <span>{log.outcome}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-sm truncate" title={log.details || ''}>
                        {log.details || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && (
          <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40">
            <div>
              Showing <span className="font-mono text-white font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-mono text-white font-semibold">
                {Math.min(page * pageSize, data.total)}
              </span>{' '}
              of <span className="font-mono text-white font-semibold">{data.total}</span> audit records
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:pointer-events-none text-slate-300 font-mono text-[11px]"
              >
                First
              </button>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:pointer-events-none text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono text-white px-2">
                Page {page} of {Math.max(1, data.total_pages)}
              </span>

              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(page + 1)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:pointer-events-none text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(data.total_pages)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:pointer-events-none text-slate-300 font-mono text-[11px]"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
