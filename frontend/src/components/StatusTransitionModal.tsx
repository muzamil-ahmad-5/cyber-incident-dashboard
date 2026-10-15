import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { Incident } from '../types/incident';
import { api } from '../services/api';

interface Props {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Open: ['Investigating', 'Contained', 'Resolved', 'Closed'],
  Investigating: ['Open', 'Contained', 'Resolved', 'Closed'],
  Contained: ['Investigating', 'Resolved', 'Closed'],
  Resolved: ['Closed', 'Investigating'],
  Closed: ['Investigating'],
};

export const StatusTransitionModal: React.FC<Props> = ({ incident, isOpen, onClose, onSuccess }) => {
  if (!isOpen || !incident) return null;

  const validTransitions = ALLOWED_TRANSITIONS[incident.status] || [];
  const [newStatus, setNewStatus] = useState<string>(validTransitions[0] || incident.status);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await api.updateIncidentStatus(incident.incident_id, newStatus, note);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Status transition failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Transition Status</h3>
            <p className="text-xs font-mono text-cyan-400">{incident.incident_id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Current Lifecycle Status</label>
            <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              {incident.status}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {validTransitions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Investigation Justification / Actions Performed
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Host isolated from network segment; forensics image taken..."
              className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                'Commit Transition'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
