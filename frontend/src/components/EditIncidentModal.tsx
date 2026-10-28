import React, { useState, useEffect } from 'react';
import { X, Edit3, AlertTriangle, CheckCircle, Server, User } from 'lucide-react';
import { Incident } from '../types/incident';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  incident: Incident | null;
  onClose: () => void;
  onSuccess: (updated: Incident) => void;
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

export const EditIncidentModal: React.FC<Props> = ({
  isOpen,
  incident,
  onClose,
  onSuccess,
}) => {
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [potentialImpact, setPotentialImpact] = useState('');
  const [affectedAsset, setAffectedAsset] = useState('');
  const [description, setDescription] = useState('');
  const [assignedAnalyst, setAssignedAnalyst] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (incident) {
      setCategory(incident.category);
      setSeverity(incident.severity);
      setPotentialImpact(incident.potential_impact);
      setAffectedAsset(incident.affected_asset);
      setDescription(incident.description);
      setAssignedAnalyst(incident.assigned_analyst || '');
      setError(null);
    }
  }, [incident]);

  if (!isOpen || !incident) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affectedAsset.trim()) {
      setError('Affected simulated asset is required.');
      return;
    }
    if (!description.trim() || description.length < 5) {
      setError('Description must be at least 5 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await api.updateIncident(incident.incident_id, {
        category,
        severity,
        potential_impact: potentialImpact,
        affected_asset: affectedAsset.trim(),
        description: description.trim(),
        assigned_analyst: assignedAnalyst.trim() || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update incident.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0F172A] border border-slate-750 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Security Incident</h3>
              <p className="text-xs font-mono text-cyan-400">{incident.incident_id}</p>
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
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              >
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev}>
                    {sev}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Potential Impact</label>
              <select
                value={potentialImpact}
                onChange={(e) => setPotentialImpact(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              >
                {IMPACTS.map((imp) => (
                  <option key={imp} value={imp}>
                    {imp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Assigned Analyst</label>
              <input
                type="text"
                value={assignedAnalyst}
                onChange={(e) => setAssignedAnalyst(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Affected Simulated Asset</label>
            <input
              type="text"
              value={affectedAsset}
              onChange={(e) => setAffectedAsset(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-750 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            *Updating fields triggers automated backend recalculation of the deterministic risk score and updates the persistent audit trail.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save & Recalculate Risk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
