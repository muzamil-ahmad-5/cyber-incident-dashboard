import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Search,
  Bell,
  CheckCircle2,
  Lock,
  ChevronDown,
  LogOut,
  AlertCircle,
  ExternalLink,
  X,
  Server,
  Filter,
  Terminal
} from 'lucide-react';
import { useAuth } from '../services/authContext';
import { api } from '../services/api';
import { Incident } from '../types/incident';
import { cyberAudio } from '../services/cyberAudio';

interface NavbarProps {
  onOpenTerminal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenTerminal }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, switchDemoRole, logout, isLoading: authLoading } = useAuth();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [criticalAlerts, setCriticalAlerts] = useState<Incident[]>([]);
  const [dbStatus, setDbStatus] = useState<'connected' | 'checking' | 'offline'>('checking');

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const routeTitles: Record<string, { title: string; section: string }> = {
    '/': { title: 'Dashboard Overview', section: 'SOC Telemetry' },
    '/incidents': { title: 'Security Incident Queue', section: 'Triage Management' },
    '/analytics': { title: 'Threat & Incident Analytics', section: 'Analytical Vector' },
    '/risk-prioritization': { title: 'Risk Prioritization Engine', section: 'Mathematical Heuristics' },
    '/investigation': { title: 'Incident Investigation Center', section: 'Forensic Response' },
    '/reports': { title: 'Reports & Export Center', section: 'Compliance & Audits' },
    '/audit-logs': { title: 'SOC Forensic Audit Trail', section: 'Tamper-Evident Records' },
    '/settings': { title: 'System Configuration', section: 'Environment Parameters' },
  };

  const currentMeta = routeTitles[location.pathname] || {
    title: 'Security Incident Dashboard',
    section: 'CYBERGUARD Operations',
  };

  // Fetch actual critical alerts from backend to populate notification bell honestly
  useEffect(() => {
    let isMounted = true;

    const fetchStatusAndAlerts = async () => {
      try {
        const [healthRes, urgentRes] = await Promise.all([
          api.getSystemHealth().catch(() => null),
          api.listIncidents({ severity: 'Critical', status: 'Open', page_size: 5 }).catch(() => null),
        ]);

        if (!isMounted) return;

        if (healthRes && healthRes.database === 'connected') {
          setDbStatus('connected');
        } else {
          setDbStatus('offline');
        }

        if (urgentRes && urgentRes.items) {
          setCriticalAlerts(urgentRes.items);
        }
      } catch {
        if (isMounted) setDbStatus('offline');
      }
    };

    fetchStatusAndAlerts();
    const interval = setInterval(fetchStatusAndAlerts, 20000); // 20s poll

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/incidents?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Page Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>{currentMeta.title}</span>
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-400 border border-cyan-800/60 hidden sm:inline-block">
            {currentMeta.section}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
          <Link to="/" className="hover:text-cyan-400 transition-colors">
            CYBERGUARD
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300">{currentMeta.title}</span>
        </div>
      </div>

      {/* Center/Right Controls: Search, Notifications, Demo Badge, RBAC */}
      <div className="flex items-center gap-3">
        {/* Quick Search */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search incident ID, asset, CVE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900/90 border border-slate-750 text-white rounded-lg pl-8 pr-3 py-1.5 text-xs w-60 focus:outline-none focus:border-cyan-500 focus:w-72 transition-all placeholder:text-slate-500"
          />
        </form>

        {/* Clear Demo/Academic Mode Label */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-750 text-[10px] text-slate-300 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>DEMO MODE: SYNTHETIC DATA</span>
        </div>

        {/* Honest Database Connection Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-750 text-[10px] font-mono">
          {dbStatus === 'connected' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">SQLite Connected</span>
            </>
          ) : dbStatus === 'checking' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300">Checking API...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400">API Offline</span>
            </>
          )}
        </div>

        {/* Tactical CLI Button */}
        {onOpenTerminal && (
          <button
            onClick={() => {
              onOpenTerminal();
              cyberAudio.playClick();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 font-mono text-xs transition shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            title="Open Tactical Command Terminal (Ctrl+K)"
          >
            <Terminal className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline font-bold">CLI</span>
          </button>
        )}

        {/* Real Application Alerts Notification Indicator */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              cyberAudio.playClick();
            }}
            className="relative p-2 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white transition-colors"
            title="Real Critical Alerts"
            aria-label="View critical alerts"
          >
            <Bell className="w-4 h-4" />
            {criticalAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0B1120] animate-pulse">
                {criticalAlerts.length}
              </span>
            )}
          </button>

          {/* Actual Critical Alerts Dropdown Drawer */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0F172A] border border-slate-750 rounded-xl shadow-2xl p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="font-bold text-white">Active Critical Alerts</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{criticalAlerts.length} Active</span>
              </div>

              {criticalAlerts.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-300">No Open Critical Alerts</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">All critical threats are contained or resolved.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {criticalAlerts.map((alert) => (
                    <div
                      key={alert.incident_id}
                      onClick={() => {
                        navigate(`/investigation?id=${alert.incident_id}`);
                        setNotificationsOpen(false);
                      }}
                      className="p-2.5 rounded-lg bg-slate-950/70 border border-red-500/30 hover:border-red-500/60 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono font-bold text-red-400">{alert.incident_id}</span>
                        <span className="text-slate-400 font-mono">Risk {alert.risk_score}</span>
                      </div>
                      <p className="text-slate-200 text-xs font-medium truncate">{alert.category}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{alert.affected_asset}</p>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      navigate('/incidents?severity=Critical&status=Open');
                      setNotificationsOpen(false);
                    }}
                    className="w-full text-center py-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    View All Critical Queue →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile & Demo RBAC Switcher */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white text-xs font-bold ring-1 ring-cyan-400/30">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
                <span>{user?.username || 'analyst'}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider ${
                    user?.role === 'admin'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  }`}
                >
                  {user?.role || 'analyst'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                {user?.full_name || 'SOC Analyst'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {/* RBAC Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-[#0F172A] border border-slate-750 rounded-xl shadow-2xl p-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <p className="font-semibold text-white">Active SOC Session</p>
                <p className="text-slate-400 text-[11px] truncate">
                  Role: <span className="text-cyan-400 font-mono font-bold uppercase">{user?.role}</span>
                </p>
              </div>

              <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Demo RBAC Switcher
              </div>

              <button
                disabled={authLoading}
                onClick={async () => {
                  await switchDemoRole('analyst');
                  setProfileDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  user?.role === 'analyst' ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>SOC Analyst</span>
                </div>
                {user?.role === 'analyst' && <span className="text-[10px] text-cyan-400 font-mono">Active</span>}
              </button>

              <button
                disabled={authLoading}
                onClick={async () => {
                  await switchDemoRole('admin');
                  setProfileDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  user?.role === 'admin' ? 'bg-purple-500/10 text-purple-400 font-semibold' : 'text-slate-300 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>SOC Administrator</span>
                </div>
                {user?.role === 'admin' && <span className="text-[10px] text-purple-400 font-mono">Active</span>}
              </button>

              <div className="border-t border-slate-800 mt-2 pt-1">
                <button
                  onClick={() => {
                    logout();
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
