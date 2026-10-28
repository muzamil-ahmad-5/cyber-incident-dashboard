import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
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

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const IMPACTS = ['Critical', 'High', 'Medium', 'Low'];

export const IncidentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [severity, setSeverity] = useState('Medium');
  const [potentialImpact, setPotentialImpact] = useState('Medium');
  const [affectedAsset, setAffectedAsset] = useState('');
  const [description, setDescription] = useState('');
  const [assignedAnalyst, setAssignedAnalyst] = useState('analyst_sarah');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affectedAsset.trim()) {
      setError('Affected simulated asset is required (e.g. srv-auth-01.corp).');
      return;
    }
    if (!description.trim() || description.length < 5) {
      setError('Description must be at least 5 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.createIncident({
        category,
        severity,
        potential_impact: potentialImpact,
        affected_asset: affectedAsset.trim(),
        description: description.trim(),
        assigned_analyst: assignedAnalyst.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create synthetic incident.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Synthetic Incident</h3>
              <p className="text-xs text-slate-400">Simulate a security event in the laboratory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Potential Impact</label>
              <select
                value={potentialImpact}
                onChange={(e) => setPotentialImpact(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {IMPACTS.map((imp) => (
                  <option key={imp} value={imp}>
                    {imp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Analyst</label>
              <input
                type="text"
                value={assignedAnalyst}
                onChange={(e) => setAssignedAnalyst(e.target.value)}
                placeholder="e.g. analyst_sarah"
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Affected Simulated Asset
            </label>
            <input
              type="text"
              value={affectedAsset}
              onChange={(e) => setAffectedAsset(e.target.value)}
              placeholder="e.g. srv-auth-01.corp.internal"
              className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide simulated telemetry findings, alert triggers, or observed indicators..."
              className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Evaluating & Logging...' : 'Create & Score Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
