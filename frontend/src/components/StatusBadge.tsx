import React from 'react';
import { IncidentStatus } from '../types/incident';

interface Props {
  status: IncidentStatus | string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const stat = (status || 'Open').toLowerCase();

  const styles: Record<string, string> = {
    open: 'bg-red-500/10 text-red-400 border-red-500/25',
    investigating: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
    contained: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    closed: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
  };

  const currentStyle = styles[stat] || styles.open;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${currentStyle}`}>
      {status}
    </span>
  );
};
