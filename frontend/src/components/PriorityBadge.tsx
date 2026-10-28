import React from 'react';
import { RiskPriority } from '../types/incident';

interface Props {
  priority: RiskPriority | string;
  score?: number;
}

export const PriorityBadge: React.FC<Props> = ({ priority, score }) => {
  const pri = (priority || 'MEDIUM').toUpperCase();

  const styles: Record<string, string> = {
    CRITICAL: 'bg-red-950 text-red-200 border-red-700/60 shadow-sm shadow-red-900/30',
    HIGH: 'bg-amber-950 text-amber-200 border-amber-700/60 shadow-sm shadow-amber-900/30',
    MEDIUM: 'bg-yellow-950 text-yellow-200 border-yellow-700/60',
    LOW: 'bg-blue-950 text-blue-200 border-blue-700/60',
  };

  const badgeStyle = styles[pri] || styles.MEDIUM;

  return (
    <div className="inline-flex items-center gap-1.5" title={`Explainable Risk Priority: ${pri} (Score: ${score ?? 'N/A'}/100)`}>
      <span className={`px-2 py-0.5 rounded text-xs font-bold border tracking-wide ${badgeStyle}`}>
        {pri}
      </span>
      {score !== undefined && (
        <span className="text-xs font-mono text-slate-400">
          {score.toFixed(1)}
        </span>
      )}
    </div>
  );
};
