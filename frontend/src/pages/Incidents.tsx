import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Server,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Eye,
  Edit3,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import { Incident, PaginatedIncidents } from '../types/incident';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { IncidentModal } from '../components/IncidentModal';
import { StatusTransitionModal } from '../components/StatusTransitionModal';
import { EditIncidentModal } from '../components/EditIncidentModal';
import { IncidentDetailModal } from '../components/IncidentDetailModal';
import { useAuth } from '../services/authContext';

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
const PRIORITIES = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const Incidents: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const urlSearch = searchParams.get('search') || '';
  const urlSeverity = searchParams.get('severity') || 'All';
  const urlStatus = searchParams.get('status') || 'All';

  const [data, setData] = useState<PaginatedIncidents | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState(urlSearch);
  const [category, setCategory] = useState('All');
  const [severity, setSeverity] = useState(urlSeverity);
  const [status, setStatus] = useState(urlStatus);
  const [priority, setPriority] = useState('All');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [transitionIncident, setTransitionIncident] = useState<Incident | null>(null);
  const [editIncident, setEditIncident] = useState<Incident | null>(null);
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.listIncidents({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        category: category !== 'All' ? category : undefined,
        severity: severity !== 'All' ? severity : undefined,
        status: status !== 'All' ? status : undefined,
        priority: priority !== 'All' ? priority : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load incidents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, pageSize, category, severity, status, priority, sortBy, sortDir]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  const handleHeaderSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('All');
    setSeverity('All');
    setStatus('All');
    setPriority('All');
    setSortBy('timestamp');
    setSortDir('desc');
    setPage(1);
    setSearchParams({});
  };

  const handleDelete = async (incidentId: string) => {
    try {
      await api.deleteIncident(incidentId);
      setDeleteConfirmId(null);
      fetchIncidents();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const renderSortArrow = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60 inline ml-1" />;
    }
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-cyan-400 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 text-cyan-400 inline ml-1" />
    );
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Security Incident Queue</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              Total {data?.total ?? '—'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-criteria filtering, lifecycle transitions, and forensic investigation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchIncidents}
            title="Refresh incident list"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Incident</span>
          </button>
        </div>
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
              placeholder="Search by Incident ID, affected host, analyst, or description..."
              className="w-full bg-slate-900 border border-slate-750 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            Filter Query
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
          {/* Category */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-750">
            <span className="text-slate-400 font-medium">Category:</span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-slate-900">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-750">
            <span className="text-slate-400 font-medium">Severity:</span>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-750">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st} className="bg-slate-900">
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Priority */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-750">
            <span className="text-slate-400 font-medium">Priority:</span>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p} className="bg-slate-900">
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Page size */}
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
              <option value={15} className="bg-slate-900">15</option>
              <option value={25} className="bg-slate-900">25</option>
              <option value={50} className="bg-slate-900">50</option>
            </select>
          </div>

          {/* Reset button */}
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
          <button onClick={fetchIncidents} className="underline font-semibold">
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Incident Data Table */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider select-none">
                <th
                  onClick={() => handleHeaderSort('incident_id')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  Incident ID {renderSortArrow('incident_id')}
                </th>
                <th
                  onClick={() => handleHeaderSort('timestamp')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  Timestamp (UTC) {renderSortArrow('timestamp')}
                </th>
                <th
                  onClick={() => handleHeaderSort('category')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  Category {renderSortArrow('category')}
                </th>
                <th
                  onClick={() => handleHeaderSort('severity')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  Severity {renderSortArrow('severity')}
                </th>
                <th
                  onClick={() => handleHeaderSort('risk_score')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  Risk Score {renderSortArrow('risk_score')}
                </th>
                <th className="py-3 px-4">Affected Asset</th>
                <th className="py-3 px-4">Analyst</th>
                <th
                  onClick={() => handleHeaderSort('status')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  Status {renderSortArrow('status')}
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                    <span>Loading incidents from SQLite database...</span>
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    No security incidents match the query parameters.
                  </td>
                </tr>
              ) : (
                data.items.map((inc) => (
                  <tr
                    key={inc.incident_id}
                    onClick={() => setDetailIncident(inc)}
                    className="hover:bg-slate-850/60 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400 group-hover:underline">
                      {inc.incident_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {inc.timestamp?.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4 font-medium text-white max-w-[160px] truncate" title={inc.category}>
                      {inc.category}
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={inc.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={inc.risk_priority} score={inc.risk_score} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[130px]">{inc.affected_asset}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-[110px]">
                      {inc.assigned_analyst || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td
                      onClick={(e) => e.stopPropagation()}
                      className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap"
                    >
                      <button
                        onClick={() => setDetailIncident(inc)}
                        title="View Full Forensic Details"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors inline-flex"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setTransitionIncident(inc)}
                        title="Change Incident Status"
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 text-[11px] font-medium transition-colors"
                      >
                        Status
                      </button>

                      <button
                        onClick={() => setEditIncident(inc)}
                        title="Edit Incident Fields"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors inline-flex"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {user?.role === 'admin' && (
                        <button
                          onClick={() => setDeleteConfirmId(inc.incident_id)}
                          title="Delete Incident (Admin Only)"
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-colors inline-flex"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
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
              of <span className="font-mono text-white font-semibold">{data.total}</span> total incidents
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F172A] border border-slate-750 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-white text-sm">Confirm Permanent Delete</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Are you sure you want to permanently delete incident{' '}
              <span className="font-mono text-cyan-400 font-bold">{deleteConfirmId}</span>? This event will be
              recorded in the immutable audit trail.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <IncidentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchIncidents}
      />

      <StatusTransitionModal
        incident={transitionIncident}
        isOpen={!!transitionIncident}
        onClose={() => setTransitionIncident(null)}
        onSuccess={fetchIncidents}
      />

      <EditIncidentModal
        incident={editIncident}
        isOpen={!!editIncident}
        onClose={() => setEditIncident(null)}
        onSuccess={() => {
          fetchIncidents();
        }}
      />

      <IncidentDetailModal
        incident={detailIncident}
        isOpen={!!detailIncident}
        onClose={() => setDetailIncident(null)}
        onStatusChangeRequest={(inc) => {
          setDetailIncident(null);
          setTransitionIncident(inc);
        }}
        onEditRequest={(inc) => {
          setDetailIncident(null);
          setEditIncident(inc);
        }}
        onIncidentUpdated={(updated) => {
          setDetailIncident(updated);
          fetchIncidents();
        }}
      />
    </div>
  );
};
