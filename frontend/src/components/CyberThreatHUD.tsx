import React, { useState, useEffect } from 'react';
import { Shield, Radio, Terminal, AlertTriangle, Activity, Wifi, Cpu, Eye, Zap, RefreshCw } from 'lucide-react';

interface TelemetryLog {
  id: string;
  timestamp: string;
  level: 'ALERT' | 'INFO' | 'WARN' | 'DEFENSE';
  message: string;
  source: string;
}

export const CyberThreatHUD: React.FC = () => {
  const [logs, setLogs] = useState<TelemetryLog[]>([
    { id: '1', timestamp: '14:20:01', level: 'ALERT', message: 'Inbound SYN flood mitigated on edge-gateway-01', source: 'FIREWALL' },
    { id: '2', timestamp: '14:20:04', level: 'DEFENSE', message: 'Asset isolation playbook recommended for prod-db-01', source: 'PLAYBOOK' },
    { id: '3', timestamp: '14:20:08', level: 'INFO', message: 'Heuristic engine computed risk score 91.5 (CRITICAL)', source: 'RISK_ENGINE' },
    { id: '4', timestamp: '14:20:12', level: 'WARN', message: 'Credential stuffing attempt detected against auth-portal', source: 'WAF' },
    { id: '5', timestamp: '14:20:15', level: 'INFO', message: 'Forensic audit signature logged to persistent SQLite', source: 'AUDIT_LOG' },
  ]);

  const [activeTab, setActiveTab] = useState<'map' | 'radar' | 'telemetry'>('map');
  const [selectedNode, setSelectedNode] = useState<string | null>('prod-db-01');

  // Stream live simulated telemetry logs every 4 seconds
  useEffect(() => {
    const pool: { level: 'ALERT' | 'INFO' | 'WARN' | 'DEFENSE'; message: string; source: string }[] = [
      { level: 'ALERT', message: 'Suspicious outbound DNS beaconing detected to darknet relay', source: 'IDS' },
      { level: 'DEFENSE', message: 'Automated token revoker dispatched quarantine notice', source: 'PLAYBOOK' },
      { level: 'INFO', message: 'Risk algorithm aged open ticket INC-3012 (+2.5 pts)', source: 'RISK_ENGINE' },
      { level: 'WARN', message: 'Privilege escalation attempt blocked on core-auth-srv', source: 'HOST_GUARD' },
      { level: 'ALERT', message: 'Ransomware precursor pattern detected: mass .tmp renaming', source: 'EDR' },
      { level: 'INFO', message: 'Telemetry packet burst: 48,210 pkts/s inspected safely', source: 'NET_SENSOR' },
      { level: 'DEFENSE', message: 'Spreadsheet formula injection CWE-1236 prevented in CSV export', source: 'SANITIZER' },
    ];

    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      const randomEvent = pool[Math.floor(Math.random() * pool.length)];
      
      setLogs(prev => [
        {
          id: Math.random().toString(),
          timestamp: timeStr,
          level: randomEvent.level,
          message: randomEvent.message,
          source: randomEvent.source,
        },
        ...prev.slice(0, 7) // keep 8 items
      ]);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="cyber-hud-card p-4 mb-6 shadow-2xl border border-cyan-500/30">
      {/* Top Cyber HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded bg-cyan-950/60 border border-cyan-500/50 text-cyan-400">
            <Shield className="w-5 h-5 animate-cyber-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider uppercase text-cyan-400 font-mono flex items-center gap-2">
                CYBER THREAT TOPOLOGY & RADAR HUD
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.5 rounded font-mono animate-pulse">
                  DEFCON 2 : ELEVATED
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Vector Ingestion: <span className="text-emerald-400">ONLINE</span> • Heuristic Engine: <span className="text-cyan-400">ACTIVE</span> • Telemetry: <span className="text-slate-300">48.2 kpps</span>
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-900/90 rounded-lg p-1 border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${activeTab === 'map' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Attack Topology
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${activeTab === 'radar' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            Sonar Radar
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${activeTab === 'telemetry' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Terminal className="w-3.5 h-3.5 text-yellow-400" />
            Live Stream
          </button>
        </div>
      </div>

      {/* Main HUD Display Area */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Animated SVG Attack Topology Canvas (3 Columns) */}
          <div className="lg:col-span-3 bg-slate-950/80 rounded-lg border border-slate-800/80 p-3 relative overflow-hidden">
            {/* Subtle scanline background */}
            <div className="absolute inset-0 scanline-bg opacity-20 pointer-events-none" />

            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                SIMULATED PERIMETER DEFENSE TOPOLOGY
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                INGESTION: 10 ALERT VECTORS
              </span>
            </div>

            {/* SVG Visualizer */}
            <div className="w-full h-64 relative">
              <svg className="w-full h-full" viewBox="0 0 750 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background grid markings */}
                <line x1="50" y1="20" x2="700" y2="20" stroke="#1E293B" strokeDasharray="3 3" />
                <line x1="50" y1="120" x2="700" y2="120" stroke="#1E293B" strokeDasharray="3 3" />
                <line x1="50" y1="220" x2="700" y2="220" stroke="#1E293B" strokeDasharray="3 3" />

                {/* Threat Inbound Laser Paths (Left to Center) */}
                {/* Vector 1: DDoS / Botnet */}
                <path d="M 120 50 L 375 120" stroke="#EF4444" strokeWidth="1.5" className="animate-data-flow" opacity="0.8" />
                {/* Vector 2: Ransomware Inbound */}
                <path d="M 120 120 L 375 120" stroke="#F97316" strokeWidth="2" className="animate-data-flow" opacity="0.9" />
                {/* Vector 3: Phishing / Exfiltration */}
                <path d="M 120 190 L 375 120" stroke="#FBBF24" strokeWidth="1.5" className="animate-data-flow" opacity="0.8" />

                {/* Shield Outbound Paths (Center to Assets) */}
                <path d="M 375 120 L 630 50" stroke="#06B6D4" strokeWidth="2" className="animate-data-flow" opacity="0.9" />
                <path d="M 375 120 L 630 120" stroke="#10B981" strokeWidth="2" className="animate-data-flow" opacity="0.9" />
                <path d="M 375 120 L 630 190" stroke="#06B6D4" strokeWidth="1.5" className="animate-data-flow" opacity="0.8" />

                {/* Threat Nodes (Left) */}
                <g transform="translate(60, 30)">
                  <rect width="110" height="40" rx="4" fill="#180A0A" stroke="#EF4444" strokeWidth="1.2" />
                  <circle cx="15" cy="20" r="5" fill="#EF4444" className="animate-ping" />
                  <circle cx="15" cy="20" r="4" fill="#EF4444" />
                  <text x="28" y="18" fill="#FCA5A5" fontSize="10" fontFamily="monospace" fontWeight="bold">EXT_BOTNET</text>
                  <text x="28" y="30" fill="#991B1B" fontSize="9" fontFamily="monospace">198.51.100.0/24</text>
                </g>

                <g transform="translate(60, 100)">
                  <rect width="110" height="40" rx="4" fill="#1A0F05" stroke="#F97316" strokeWidth="1.2" />
                  <circle cx="15" cy="20" r="5" fill="#F97316" className="animate-ping" />
                  <circle cx="15" cy="20" r="4" fill="#F97316" />
                  <text x="28" y="18" fill="#FDBA74" fontSize="10" fontFamily="monospace" fontWeight="bold">RANSOM_C2</text>
                  <text x="28" y="30" fill="#9A3412" fontSize="9" fontFamily="monospace">TOR_RELAY_NODE</text>
                </g>

                <g transform="translate(60, 170)">
                  <rect width="110" height="40" rx="4" fill="#191505" stroke="#FBBF24" strokeWidth="1.2" />
                  <circle cx="15" cy="20" r="4" fill="#FBBF24" />
                  <text x="28" y="18" fill="#FDE047" fontSize="10" fontFamily="monospace" fontWeight="bold">PHISH_INBOUND</text>
                  <text x="28" y="30" fill="#854D0E" fontSize="9" fontFamily="monospace">EXFIL_PROBE</text>
                </g>

                {/* Center Defense Gateway Shield */}
                <g transform="translate(325, 75)">
                  {/* Concentric glowing rings */}
                  <circle cx="50" cy="45" r="45" stroke="#06B6D4" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" className="animate-radar" />
                  <circle cx="50" cy="45" r="36" fill="#0B132B" stroke="#06B6D4" strokeWidth="1.8" />
                  <circle cx="50" cy="45" r="28" fill="#0F172A" stroke="#10B981" strokeWidth="1.2" />
                  <text x="50" y="42" fill="#22D3EE" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">SOC WAF</text>
                  <text x="50" y="55" fill="#34D399" fontSize="8" fontFamily="monospace" textAnchor="middle">PERIMETER</text>
                  <circle cx="50" cy="18" r="3" fill="#22D3EE" className="animate-ping" />
                </g>

                {/* Internal Enterprise Assets (Right) */}
                <g 
                  transform="translate(580, 30)" 
                  className="cursor-pointer"
                  onClick={() => setSelectedNode('prod-auth-vault-01')}
                >
                  <rect width="130" height="40" rx="4" fill="#0B1528" stroke={selectedNode === 'prod-auth-vault-01' ? '#22D3EE' : '#1E293B'} strokeWidth="1.5" />
                  <circle cx="15" cy="20" r="4" fill="#22D3EE" />
                  <text x="26" y="18" fill="#E2E8F0" fontSize="10" fontFamily="monospace" fontWeight="bold">prod-auth-vault-01</text>
                  <text x="26" y="30" fill="#38BDF8" fontSize="8" fontFamily="monospace">TIER 1 • CRITICAL</text>
                </g>

                <g 
                  transform="translate(580, 100)" 
                  className="cursor-pointer"
                  onClick={() => setSelectedNode('prod-db-01')}
                >
                  <rect width="130" height="40" rx="4" fill="#091824" stroke={selectedNode === 'prod-db-01' ? '#10B981' : '#1E293B'} strokeWidth="1.5" />
                  <circle cx="15" cy="20" r="4" fill="#10B981" className="animate-pulse" />
                  <text x="26" y="18" fill="#E2E8F0" fontSize="10" fontFamily="monospace" fontWeight="bold">prod-db-cluster</text>
                  <text x="26" y="30" fill="#34D399" fontSize="8" fontFamily="monospace">POSTGRES • MONITORED</text>
                </g>

                <g 
                  transform="translate(580, 170)" 
                  className="cursor-pointer"
                  onClick={() => setSelectedNode('api-gateway-01')}
                >
                  <rect width="130" height="40" rx="4" fill="#0B1528" stroke={selectedNode === 'api-gateway-01' ? '#22D3EE' : '#1E293B'} strokeWidth="1.5" />
                  <circle cx="15" cy="20" r="4" fill="#38BDF8" />
                  <text x="26" y="18" fill="#E2E8F0" fontSize="10" fontFamily="monospace" fontWeight="bold">api-gateway-01</text>
                  <text x="26" y="30" fill="#64748B" fontSize="8" fontFamily="monospace">INGRESS • HEALTHY</text>
                </g>
              </svg>
            </div>
          </div>

          {/* Asset Telemetry Sidebar (1 Column) */}
          <div className="bg-slate-950/80 rounded-lg border border-slate-800/80 p-3 font-mono flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold mb-3 pb-2 border-b border-slate-800">
                <Cpu className="w-4 h-4" />
                ASSET TELEMETRY
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Selected Node:</span>
                  <p className="text-cyan-300 font-bold">{selectedNode}</p>
                </div>
                <div>
                  <span className="text-slate-500">Sensitivity Weight:</span>
                  <p className="text-red-400">+5.0 Pts (Mission-Critical)</p>
                </div>
                <div>
                  <span className="text-slate-500">Active Honeypot:</span>
                  <p className="text-emerald-400">Canary Token Armed</p>
                </div>
                <div>
                  <span className="text-slate-500">Defense Action:</span>
                  <p className="text-yellow-400">VLAN Isolation Ready</p>
                </div>
                <div>
                  <span className="text-slate-500">Ingested Packets:</span>
                  <p className="text-slate-200">1,489,204 / hr</p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Real-time heuristic link active
            </div>
          </div>
        </div>
      )}

      {/* Radar Mode */}
      {activeTab === 'radar' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/80 rounded-lg border border-slate-800 p-4 items-center">
          {/* Animated Sonar Radar Canvas */}
          <div className="md:col-span-1 flex flex-col items-center justify-center p-2">
            <div className="relative w-52 h-52 rounded-full border-2 border-emerald-500/40 bg-emerald-950/20 flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.2)]">
              {/* Concentric rings */}
              <div className="absolute w-40 h-40 rounded-full border border-emerald-500/30" />
              <div className="absolute w-28 h-28 rounded-full border border-emerald-500/25" />
              <div className="absolute w-16 h-16 rounded-full border border-emerald-500/20" />
              
              {/* Crosshairs */}
              <div className="absolute w-full h-[1px] bg-emerald-500/30" />
              <div className="absolute h-full w-[1px] bg-emerald-500/30" />
              
              {/* Degree markers */}
              <span className="absolute top-1 text-[9px] font-mono text-emerald-400">000°</span>
              <span className="absolute bottom-1 text-[9px] font-mono text-emerald-400">180°</span>
              <span className="absolute left-1 text-[9px] font-mono text-emerald-400">270°</span>
              <span className="absolute right-1 text-[9px] font-mono text-emerald-400">090°</span>

              {/* Blip Dots (Simulated Threats) */}
              <span className="absolute top-12 left-16 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="absolute top-12 left-16 w-2 h-2 rounded-full bg-red-400" />

              <span className="absolute bottom-14 right-14 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="absolute top-20 right-16 w-2 h-2 rounded-full bg-red-500" />
              <span className="absolute bottom-10 left-20 w-1.5 h-1.5 rounded-full bg-emerald-400" />

              {/* Rotating Sweep Beam */}
              <div 
                className="absolute inset-0 animate-radar pointer-events-none"
                style={{
                  background: 'conic-gradient(from 0deg at 50% 50%, rgba(16, 185, 129, 0.4) 0deg, rgba(16, 185, 129, 0) 60deg, transparent 60deg)'
                }}
              />
            </div>
            <span className="text-[11px] font-mono text-emerald-400 mt-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              ACTIVE RADAR SWEEP • 360°
            </span>
          </div>

          {/* Radar Telemetry Information */}
          <div className="md:col-span-2 font-mono space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">SCAN SPECTRUM:</span>
              <span className="text-cyan-400">X-BAND (9.4 GHz) • SYNTHETIC</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">TARGETS ACQUIRED:</span>
              <span className="text-red-400 font-bold">4 SIMULATED THREAT VECTORS</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">PROXIMITY ALERT:</span>
              <span className="text-amber-400 font-bold">BEARING 042° • ELEVATION +12° (Ransomware Probe)</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">DEFENSIVE STATUS:</span>
              <span className="text-emerald-400 font-bold">PERIMETER INTERCEPT READY</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-300">
              <span className="text-cyan-400 font-bold">[SOC LAB NOTE]:</span> The sonar radar visually maps incoming synthetic alert clusters relative to internal network tiers for rapid orientation during critical incident triage.
            </div>
          </div>
        </div>
      )}

      {/* Live Stream Terminal */}
      {activeTab === 'telemetry' && (
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>SOC REAL-TIME TELEMETRY BUFFER (SIMULATED INGESTION)</span>
            </div>
            <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
              STREAM: ACTIVE
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono">
            {logs.map((log) => {
              const badgeColors = {
                ALERT: 'text-red-400 bg-red-950/60 border-red-500/30',
                WARN: 'text-amber-400 bg-amber-950/60 border-amber-500/30',
                INFO: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30',
                DEFENSE: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
              }[log.level];

              return (
                <div key={log.id} className="flex items-start gap-2 py-1 px-1.5 rounded hover:bg-slate-900/60 transition">
                  <span className="text-slate-500 text-[11px]">[{log.timestamp}]</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border ${badgeColors} font-bold`}>
                    {log.level}
                  </span>
                  <span className="text-slate-400 text-[11px]">[{log.source}]</span>
                  <span className="text-slate-200 flex-1">{log.message}</span>
                </div>
              );
            })}
            <div className="text-cyan-400 text-xs flex items-center gap-1 pt-1">
              <span>root@cyberguard-soc:~$</span>
              <span className="w-2 h-4 bg-cyan-400 inline-block animate-terminal-cursor" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
