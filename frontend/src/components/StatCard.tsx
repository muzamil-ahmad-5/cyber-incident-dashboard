import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { cyberAudio } from '../services/cyberAudio';

interface Props {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'cyan' | 'red' | 'orange' | 'amber' | 'emerald' | 'purple' | 'blue' | 'slate';
  badge?: string;
  onClick?: () => void;
}

// Smooth number counter hook
const useAnimatedCount = (target: number | string, duration: number = 600) => {
  const numericTarget = typeof target === 'number' ? target : parseFloat(target);
  const [displayValue, setDisplayValue] = useState<number>(isNaN(numericTarget) ? 0 : numericTarget);

  useEffect(() => {
    if (isNaN(numericTarget)) return;

    let startTimestamp: number | null = null;
    const initialValue = displayValue;
    const diff = numericTarget - initialValue;

    if (diff === 0) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(initialValue + diff * easeProgress));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [numericTarget, duration]);

  if (typeof target === 'string' && isNaN(numericTarget)) {
    return target;
  }
  return displayValue;
};

export const StatCard: React.FC<Props> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'cyan',
  badge,
  onClick,
}) => {
  const animatedVal = useAnimatedCount(value);

  const handleClick = () => {
    if (onClick) {
      cyberAudio.playClick();
      onClick();
    }
  };

  const variantStyles = {
    cyan: {
      card: 'border-cyan-500/25 hover:border-cyan-500/60 hover:shadow-cyan-500/10',
      iconBox: 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30',
      valText: 'text-white',
    },
    red: {
      card: 'border-red-500/25 hover:border-red-500/60 hover:shadow-red-500/10',
      iconBox: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30',
      valText: 'text-red-400',
    },
    orange: {
      card: 'border-orange-500/25 hover:border-orange-500/60 hover:shadow-orange-500/10',
      iconBox: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30',
      valText: 'text-orange-400',
    },
    amber: {
      card: 'border-amber-500/25 hover:border-amber-500/60 hover:shadow-amber-500/10',
      iconBox: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30',
      valText: 'text-amber-400',
    },
    emerald: {
      card: 'border-emerald-500/25 hover:border-emerald-500/60 hover:shadow-emerald-500/10',
      iconBox: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30',
      valText: 'text-emerald-400',
    },
    purple: {
      card: 'border-purple-500/25 hover:border-purple-500/60 hover:shadow-purple-500/10',
      iconBox: 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30',
      valText: 'text-purple-300',
    },
    blue: {
      card: 'border-blue-500/25 hover:border-blue-500/60 hover:shadow-blue-500/10',
      iconBox: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30',
      valText: 'text-blue-300',
    },
    slate: {
      card: 'border-slate-800 hover:border-slate-750',
      iconBox: 'bg-slate-800 text-slate-300 ring-1 ring-slate-700',
      valText: 'text-slate-200',
    },
  };

  const style = variantStyles[variant] || variantStyles.cyan;

  return (
    <div
      onClick={handleClick}
      className={`cyber-hud-card cyber-corners p-4 shadow-xl transition-all duration-300 ${
        style.card
      } ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${style.iconBox} transition-transform group-hover:scale-105`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className={`text-2xl lg:text-3xl font-extrabold font-mono tracking-tight ${style.valText}`}>
          {animatedVal}
        </div>
        {badge && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-750">
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-400 mt-2 font-medium truncate" title={subtitle}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
