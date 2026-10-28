import React, { useState } from 'react';
import {
  X,
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
  Edit3,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Incident } from '../types/incident';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  incident: Incident | null;
  onClose: () => void;
  onStatusChangeRequest?: (incident: Incident) => void;
  onEditRequest?: (incident: Incident) => void;
  onIncidentUpdated?: (updated: Incident) => void;
}

export const IncidentDetailModal: React.FC<Props> = ({
  isOpen,
  incident,
  onClose,
  onStatusChangeRequest,
  onEditRequest,
  onIncidentUpdated,
}) => {
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  if (!isOpen || !incident) return null;

  let riskBreakdown: any = {};
  if (incident.risk_factors) {
    try {
      riskBreakdown = JSON.parse(incident.risk_factors);
    } catch {
      riskBreakdown = {};
    }
  }

  const playbooks = incident.recommended_actions?.split('\n').filter(Boolean) || [];

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmittingNote(true);
    setNoteError(null);
    try {
      const updated = await api.addIncidentNote(incident.incident_id, newNote.trim());
      setNewNote('');
      if (onIncidentUpdated) onIncidentUpdated(updated);
    } catch (err: any) {
      setNoteError(err.message || 'Failed to append note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0F172A] border border-slate-750 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-white">{incident.incident_id}</h2>
                <SeverityBadge severity={incident.severity} size="sm" />
                <StatusBadge status={incident.status} />
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{incident.category}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigate(`/investigation?id=${incident.incident_id}`);
                onClose();
              }}
              title="Open full investigation workspace"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Workspace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-5 text-xs">
          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Current Risk:</span>
              <PriorityBadge priority={incident.risk_priority} score={incident.risk_score} />
            </div>

            <div className="flex items-center gap-2">
              {onStatusChangeRequest && (
                <button
                  onClick={() => onStatusChangeRequest(incident)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Transition Status</span>
                </button>
              )}
              {onEditRequest && (
                <button
                  onClick={() => onEditRequest(incident)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Incident Description
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed font-sans">
              {incident.description}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
              <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Detection Timestamp</span>
              </div>
              <div className="font-mono text-white text-[11px]">
                {incident.timestamp?.replace('T', ' ').slice(0, 19)} UTC
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
              <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1">
                <Server className="w-3 h-3 text-cyan-400" />
                <span>Affected Asset</span>
              </div>
              <div className="font-mono text-cyan-300 text-[11px] truncate" title={incident.affected_asset}>
                {incident.affected_asset}
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
              <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-cyan-400" />
                <span>Assigned Analyst</span>
              </div>
              <div className="font-medium text-white text-[11px] truncate">
                {incident.assigned_analyst || 'Unassigned'}
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
              <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>Potential Impact</span>
              </div>
              <div className="font-medium text-amber-300 text-[11px]">
                {incident.potential_impact}
              </div>
            </div>
          </div>

          {/* Explainable Risk Factors */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Explainable Risk Score Breakdown
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs mb-3">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Base Severity</div>
                <div className="font-mono font-bold text-cyan-400 text-sm">
                  +{riskBreakdown.base_severity_score ?? 15} pts
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Impact & Asset</div>
                <div className="font-mono font-bold text-purple-400 text-sm">
                  +{riskBreakdown.impact_score ?? 15} pts
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Aging Penalty</div>
                <div className="font-mono font-bold text-amber-400 text-sm">
                  +{riskBreakdown.aging_score ?? 0} pts
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Mitigation Multiplier</div>
                <div className="font-mono font-bold text-emerald-400 text-sm">
                  ×{riskBreakdown.status_multiplier ?? 1.0}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-mono leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              Formula: ({riskBreakdown.base_severity_score ?? 15} base + {riskBreakdown.impact_score ?? 15} impact + {riskBreakdown.aging_score ?? 0} aging) × {riskBreakdown.status_multiplier ?? 1.0} status = {incident.risk_score} / 100 ({incident.risk_priority})
            </p>
          </div>

          {/* Defensive Playbooks */}
          {playbooks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Recommended Defensive Playbook Actions
                </h3>
              </div>
              <div className="space-y-1.5">
                {playbooks.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-850 text-slate-300 flex items-start gap-2.5 text-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investigation Notes & Work Log */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Investigation Work Log
              </h3>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed mb-3">
              {incident.investigation_notes || 'No investigation notes recorded.'}
            </div>

            {/* Quick append note form */}
            <form onSubmit={handleAddNote} className="space-y-2">
              {noteError && (
                <div className="text-red-400 text-[11px]">{noteError}</div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Append timestamped analyst note or finding..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={isSubmittingNote || !newNote.trim()}
                  className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold flex items-center gap-1.5 transition-colors shrink-0 text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingNote ? 'Saving...' : 'Append'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
