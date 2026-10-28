import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  SearchCode,
  ShieldAlert,
  Server,
  Clock,
  User,
  Calculator,
  CheckCircle,
  FileText,
  Send,
  AlertTriangle,
  PlayCircle,
  ExternalLink,
  ChevronRight,
  Info,
  History,
  RefreshCw,
  Edit3,
  BrainCircuit
} from 'lucide-react';
import { api } from '../services/api';
import { Incident, AuditLog } from '../types/incident';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusTransitionModal } from '../components/StatusTransitionModal';
import { EditIncidentModal } from '../components/EditIncidentModal';

export const Investigation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const incidentIdParam = searchParams.get('id');

  const [incident, setIncident] = useState<Incident | null>(null);
  const [incidentsList, setIncidentsList] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string>(incidentIdParam || '');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Fetch queue list for quick switching
  useEffect(() => {
    api.listIncidents({ page: 1, page_size: 50, sort_by: 'risk_score', sort_dir: 'desc' })
      .then((res) => {
        setIncidentsList(res.items || []);
        if (!selectedId && res.items?.length > 0) {
          setSelectedId(res.items[0].incident_id);
          setSearchParams({ id: res.items[0].incident_id });
        }
      })
      .catch((err) => console.error('Failed to load incident list for investigation', err));
  }, []);

  const loadIncident = async (id: string) => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getIncident(id);
      setIncident(data);
      loadIncidentAudit(id);
    } catch (err: any) {
      setError(err.message || `Failed to load details for ${id}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadIncidentAudit = async (id: string) => {
    setIsLoadingAudit(true);
    try {
      const res = await api.listAuditLogs({ incident_id: id, page_size: 20 });
      setAuditLogs(res.items || []);
    } catch {
      setAuditLogs([]);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadIncident(selectedId);
      setSearchParams({ id: selectedId });
    }
  }, [selectedId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !incident) return;

    setIsSubmittingNote(true);
    try {
      const updated = await api.addIncidentNote(incident.incident_id, newNote.trim());
      setIncident(updated);
      setNewNote('');
      loadIncidentAudit(incident.incident_id);
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Parse risk factors breakdown JSON safely
  let riskBreakdown: any = {};
  if (incident?.risk_factors) {
    try {
      riskBreakdown = JSON.parse(incident.risk_factors);
    } catch {
      riskBreakdown = {};
    }
  }

  // Parse playbooks
  const playbooks = incident?.recommended_actions?.split('\n').filter(Boolean) || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Incident Selector Bar */}
      <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <SearchCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">SOC Investigation Workspace</h1>
            <p className="text-xs text-slate-400">Forensics analysis, playbooks & explainable risk breakdown</p>
          </div>
        </div>

        {/* Dropdown switch */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Select Incident:</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-slate-900 border border-slate-750 text-cyan-400 font-mono text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            {incidentsList.map((inc) => (
              <option key={inc.incident_id} value={inc.incident_id} className="bg-slate-900 text-white font-mono">
                {inc.incident_id} - [{inc.severity}] {inc.category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {incident && (
        <div className="space-y-6">
          {/* Incident Header Card */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold font-mono text-white tracking-tight">{incident.incident_id}</h2>
                  <SeverityBadge severity={incident.severity} />
                  <StatusBadge status={incident.status} />
                  <PriorityBadge priority={incident.risk_priority} score={incident.risk_score} />
                </div>
                <p className="text-sm text-slate-300 font-medium leading-relaxed font-sans">{incident.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTransitionModalOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all whitespace-nowrap flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Transition Status</span>
                </button>
                <button
                  onClick={() => navigate('/ai-classifier')}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all whitespace-nowrap flex items-center gap-1.5"
                  title="Classify alert description using AI Entity Model"
                >
                  <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Classifier Hub</span>
                </button>
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Incident</span>
                </button>
              </div>
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-850">
                <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Detection Timestamp</span>
                </div>
                <div className="font-mono text-white">{incident.timestamp?.replace('T', ' ').slice(0, 19)} UTC</div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-850">
                <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Affected Host</span>
                </div>
                <div className="font-mono text-cyan-300 truncate" title={incident.affected_asset}>
                  {incident.affected_asset}
                </div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-850">
                <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Assigned Analyst</span>
                </div>
                <div className="font-medium text-white">{incident.assigned_analyst || 'Unassigned'}</div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-850">
                <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Potential Impact</span>
                </div>
                <div className="font-medium text-amber-300">{incident.potential_impact}</div>
              </div>
            </div>
          </div>

          {/* Explainable Risk Engine Breakdown */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Explainable Risk Prioritization Breakdown</h3>
                <p className="text-xs text-slate-400">Deterministic mathematical heuristic scoring model (0–100 scale)</p>
              </div>
            </div>

            {/* Formula Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-slate-400 text-[11px] mb-1">Base Severity ({riskBreakdown.base_severity || incident.severity})</div>
                <div className="text-xl font-bold font-mono text-cyan-400">
                  +{riskBreakdown.base_severity_score?.toFixed(1) ?? '15.0'} pts
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Weight: Max 40.0</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-slate-400 text-[11px] mb-1">Impact & Asset Bonus</div>
                <div className="text-xl font-bold font-mono text-purple-400">
                  +{riskBreakdown.impact_score?.toFixed(1) ?? '15.0'} pts
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {riskBreakdown.asset_bonus_applied ? '+5 Critical Asset Applied' : 'Standard Host Weight'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-slate-400 text-[11px] mb-1">
                  Aging Penalty ({riskBreakdown.hours_unresolved ?? 0}h open)
                </div>
                <div className="text-xl font-bold font-mono text-red-400">
                  +{riskBreakdown.aging_score?.toFixed(1) ?? '0.0'} pts
                </div>
                <div className="text-[10px] text-slate-500 mt-1">+0.25/h (Capped at 20.0)</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-slate-400 text-[11px] mb-1">Status Multiplier ({incident.status})</div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  ×{riskBreakdown.status_multiplier?.toFixed(2) ?? '1.00'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Mitigation Factor</div>
              </div>
            </div>

            {/* Natural Language Explanation Box */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start gap-3">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-slate-300">Explanation for SOC Analyst & Viva Evaluation:</div>
                <p className="text-slate-400 font-mono text-[11px] leading-relaxed">
                  Formula: Raw Score = (Base Severity [{riskBreakdown.base_severity_score ?? 15}] + Impact [{riskBreakdown.impact_score ?? 15}] + Aging [{riskBreakdown.aging_score ?? 0}]) × Multiplier [{riskBreakdown.status_multiplier ?? 1.0}] = {riskBreakdown.raw_score?.toFixed(1) ?? incident.risk_score} → Final Score: {incident.risk_score}/100.
                </p>
                <p className="text-cyan-300 text-[11px]">
                  Priority Tier classified as <strong>{incident.risk_priority}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Two Column Layout: Defensive Playbooks & Investigation Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Defensive Response Actions */}
            <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Category Defensive Playbook</h3>
                  <p className="text-xs text-slate-400">Prescriptive defensive containment actions for {incident.category}</p>
                </div>
              </div>

              <div className="space-y-2.5 flex-1">
                {playbooks.map((act, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-3"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{act}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Actions are strictly defensive. Destructive network actions are never automated.</span>
              </div>
            </div>

            {/* Investigation Timeline & Notes */}
            <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Investigation Work Log</h3>
                  <p className="text-xs text-slate-400">Chronological analyst findings and forensics notes</p>
                </div>
              </div>

              {/* Notes content */}
              <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap overflow-y-auto max-h-64 mb-4 leading-relaxed">
                {incident.investigation_notes || 'No investigation notes recorded yet.'}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record an investigation finding, forensics hash, or containment step..."
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingNote || !newNote.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingNote ? 'Saving...' : 'Append Note'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Relevant Audit Events Trail for This Specific Incident */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Forensic Audit Trail for {incident.incident_id}
                  </h3>
                  <p className="text-xs text-slate-400">Tamper-evident SQLite audit log entries referencing this record</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{auditLogs.length} Recorded Events</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Event ID</th>
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Outcome</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                        No specific audit logs recorded for this incident yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-850/60 transition-colors">
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">{log.event_id}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {log.timestamp?.replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className="py-2.5 px-3 text-white font-sans">{log.actor}</td>
                        <td className="py-2.5 px-3 text-purple-300 font-bold">{log.action}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.outcome === 'SUCCESS'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : 'bg-red-950 text-red-400 border border-red-800/60'
                            }`}
                          >
                            {log.outcome}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans max-w-xs truncate" title={log.details || ''}>
                          {log.details || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <StatusTransitionModal
        incident={incident}
        isOpen={transitionModalOpen}
        onClose={() => setTransitionModalOpen(false)}
        onSuccess={() => {
          if (incident) loadIncident(incident.incident_id);
        }}
      />

      <EditIncidentModal
        incident={incident}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={(updated) => {
          setIncident(updated);
          loadIncidentAudit(updated.incident_id);
        }}
      />
    </div>
  );
};
