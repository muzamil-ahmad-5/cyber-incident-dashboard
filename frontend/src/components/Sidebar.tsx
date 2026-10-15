import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  SearchCode,
  LineChart,
  FileText,
  History,
  Settings,
  ShieldCheck,
  Server,
  Calculator,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Props {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<Props> = ({ isCollapsed = false, onToggleCollapse }) => {
  const navItems = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'Security Incidents', to: '/incidents', icon: ShieldAlert },
    { name: 'Incident Analytics', to: '/analytics', icon: LineChart },
    { name: 'Risk Prioritization', to: '/risk-prioritization', icon: Calculator },
    { name: 'Investigation Center', to: '/investigation', icon: SearchCode },
    { name: 'Audit Logs', to: '/audit-logs', icon: History },
    { name: 'Reports & Export', to: '/reports', icon: FileText },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-[#0A0F1D] border-r border-slate-800/80 flex flex-col h-screen sticky top-0 shrink-0 select-none transition-all duration-300 z-30`}
    >
      {/* Brand & SOC Identifier */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-700 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-widest uppercase font-mono">
                  CYBERGUARD
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-cyan-400 font-medium tracking-tight truncate">
                Security Incident SOC
              </p>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Operations & Triage
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                } ${isCollapsed ? 'justify-center' : ''}`
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Academic Lab Environment Notice */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070B14]">
        {isCollapsed ? (
          <div className="flex justify-center" title="Academic Lab Mode • Synthetic Data">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20 animate-pulse" />
          </div>
        ) : (
          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800/80 text-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px]">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>Academic Lab SOC</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              Deterministic scoring & synthetic data for academic evaluation.
            </p>
            <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-500">
              <span>SENSORS: 10/10</span>
              <span className="text-cyan-400">DEFCON 2</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
