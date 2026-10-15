import React from 'react';
import { SeverityLevel } from '../types/incident';

interface Props {
  severity: SeverityLevel | string;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<Props> = ({ severity, size = 'md' }) => {
  const sev = (severity || 'Medium').toLowerCase();
  
  const styles: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };

  const dots: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  const currentStyle = styles[sev] || styles.medium;
  const dotColor = dots[sev] || dots.medium;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${currentStyle} ${padding}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {severity}
    </span>
  );
};
