import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Shield, Cpu, Play, CheckCircle, AlertTriangle, Radio } from 'lucide-react';
import { cyberAudio } from '../services/cyberAudio';
import { api } from '../services/api';

interface CyberCommandTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDefcon: number;
  onSetDefcon: (level: number) => void;
  matrixEnabled: boolean;
  onToggleMatrix: () => void;
  scanlinesEnabled: boolean;
  onToggleScanlines: () => void;
}

interface CommandOutput {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'warn';
  text: string;
}

export const CyberCommandTerminal: React.FC<CyberCommandTerminalProps> = ({
  isOpen,
  onClose,
  currentDefcon,
  onSetDefcon,
  matrixEnabled,
  onToggleMatrix,
  scanlinesEnabled,
  onToggleScanlines,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [outputs, setOutputs] = useState<CommandOutput[]>([
    {
      id: 'init-1',
      type: 'output',
      text: 'CYBERGUARD SOC TACTICAL COMMAND INTERFACE v4.2 [INITIALIZED]',
    },
    {
      id: 'init-2',
      type: 'output',
      text: 'Type "help" to view tactical command operations or click quick action buttons below.',
    },
  ]);
  const [isScanning, setIsScanning] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      cyberAudio.playSuccess();
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputs]);

  // Handle global escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const pushOutput = (text: string, type: 'input' | 'output' | 'error' | 'success' | 'warn' = 'output') => {
    setOutputs((prev) => [...prev, { id: Math.random().toString(), type, text }]);
  };

  const handleCommand = async (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    cyberAudio.playClick();
    pushOutput(`root@cyberguard-soc:~$ ${trimmed}`, 'input');
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);
    setInputVal('');

    const [cmd, ...args] = trimmed.split(' ');
    const lowerCmd = cmd.toLowerCase();

    switch (lowerCmd) {
      case 'help':
        pushOutput('=== SOC TACTICAL CLI COMMANDS ===', 'warn');
        pushOutput('  status              - Check real-time SOC Sentinel & API telemetry');
        pushOutput('  scan [target]       - Execute simulated tactical port & CVE vulnerability sweep');
        pushOutput('  defcon [1-4]        - Change global SOC DEFCON threat posture (1=Max, 4=Nominal)');
        pushOutput('  isolate [asset]     - Trigger simulated zero-trust asset quarantine');
        pushOutput('  incidents           - List current active critical incidents from SQLite');
        pushOutput('  matrix              - Toggle animated digital matrix rain stream');
        pushOutput('  scanlines           - Toggle CRT retro scanline overlay');
        pushOutput('  audio               - Toggle cyber audio synthesis');
        pushOutput('  clear               - Clear terminal output');
        pushOutput('  exit                - Close terminal interface');
        break;

      case 'status':
        try {
          const health = await api.getSystemHealth();
          pushOutput(`[SYSTEM HEALTH]: Status: ${health.status.toUpperCase()} | DB: ${health.database.toUpperCase()}`, 'success');
          pushOutput(`[STATISTICS]: Incidents: ${health.stats?.incidents ?? 'N/A'} | Audits: ${health.stats?.audit_logs ?? 'N/A'} | Users: ${health.stats?.users ?? 'N/A'}`);
          pushOutput(`[DEFCON POSTURE]: Level ${currentDefcon} Active | Encryption: AES-256-GCM`);
        } catch (err: any) {
          pushOutput(`[DIAGNOSTIC WARN]: Could not query live API: ${err.message}`, 'error');
        }
        break;

      case 'defcon':
        const lvl = parseInt(args[0], 10);
        if (lvl >= 1 && lvl <= 4) {
          onSetDefcon(lvl);
          cyberAudio.playAlert();
          pushOutput(`[DEFCON ALERT]: Threat posture updated to DEFCON ${lvl}!`, 'warn');
        } else {
          pushOutput('Usage: defcon [1-4] (e.g. "defcon 1" or "defcon 2")', 'error');
        }
        break;

      case 'scan':
        const target = args[0] || '192.168.1.100 (DMZ-GATEWAY)';
        setIsScanning(true);
        cyberAudio.playScan();
        pushOutput(`[SCANNING]: Initiating tactical SYN/XMAS sweep on ${target}...`, 'warn');
        setTimeout(() => {
          cyberAudio.playScan();
          pushOutput(`[SCAN PROGRESS]: Probing ports 21, 22, 80, 443, 3389, 8080... [40%]`);
        }, 600);
        setTimeout(() => {
          cyberAudio.playSuccess();
          pushOutput(`[SCAN COMPLETE]: Scanned ${target}: Port 443/HTTPS (TLS 1.3), Port 22/SSH (OpenSSL 3.0), CVE-2023-44487 Mitigated. 0 Breaches Found.`, 'success');
          setIsScanning(false);
        }, 1400);
        break;

      case 'isolate':
        const asset = args[0] || 'prod-db-cluster-01';
        cyberAudio.playAlert();
        pushOutput(`[ZERO-TRUST QUARANTINE]: Dispatched VLAN 999 isolation for asset '${asset}'.`, 'warn');
        pushOutput(`[FIREWALL]: Inbound/Outbound traffic severed. Forensic triage snapshot created in SQLite.`, 'success');
        break;

      case 'incidents':
        try {
          const list = await api.listIncidents({ page: 1, page_size: 4, severity: 'Critical' });
          if (list.items && list.items.length > 0) {
            pushOutput(`[ACTIVE CRITICAL INCIDENTS - TOTAL: ${list.total}]`, 'warn');
            list.items.forEach((item: any) => {
              pushOutput(` • [${item.incident_id}] Risk: ${item.risk_score} | ${item.category} | Asset: ${item.affected_asset} [${item.status}]`);
            });
          } else {
            pushOutput('[INCIDENTS]: No open Critical alerts detected.', 'success');
          }
        } catch (err: any) {
          pushOutput(`Error fetching incidents: ${err.message}`, 'error');
        }
        break;

      case 'matrix':
        onToggleMatrix();
        cyberAudio.playSuccess();
        pushOutput(`[MATRIX EFFECT]: ${!matrixEnabled ? 'ENABLED' : 'DISABLED'}`, 'success');
        break;

      case 'scanlines':
        onToggleScanlines();
        cyberAudio.playSuccess();
        pushOutput(`[CRT SCANLINES]: ${!scanlinesEnabled ? 'ENABLED' : 'DISABLED'}`, 'success');
        break;

      case 'audio':
        const isMuted = cyberAudio.toggleMute();
        pushOutput(`[CYBER AUDIO]: ${!isMuted ? 'ENABLED' : 'MUTED'}`, 'success');
        break;

      case 'clear':
        setOutputs([]);
        break;

      case 'exit':
        onClose();
        break;

      default:
        pushOutput(`Unknown tactical command: "${trimmed}". Type "help" for a list of available commands.`, 'error');
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    cyberAudio.playKey();
    if (e.key === 'Enter') {
      handleCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx !== -1) {
        const nextIdx = historyIdx + 1;
        if (nextIdx < history.length) {
          setHistoryIdx(nextIdx);
          setInputVal(history[nextIdx]);
        } else {
          setHistoryIdx(-1);
          setInputVal('');
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-[#090D1A]/95 border-2 border-cyan-500/60 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden font-mono flex flex-col max-h-[85vh]">
        {/* Cyber Reticles / Corner brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-cyan-500/40 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-bold text-cyan-300 tracking-wider">
              CYBERGUARD TACTICAL TERMINAL // COMMAND DECK
            </span>
            <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-500/40 text-[10px]">
              DEFCON {currentDefcon}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close terminal"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Terminal Output Log Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-1.5 text-xs text-slate-300 min-h-64 max-h-[50vh]">
          {outputs.map((out) => {
            const colorClass = {
              input: 'text-cyan-400 font-bold',
              output: 'text-slate-300',
              error: 'text-red-400 font-bold',
              success: 'text-emerald-400',
              warn: 'text-amber-400 font-bold',
            }[out.type];

            return (
              <div key={out.id} className={`${colorClass} leading-relaxed break-words`}>
                {out.text}
              </div>
            );
          })}
          {isScanning && (
            <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
              <Radio className="w-3.5 h-3.5 animate-spin" />
              <span>Scanning network interface packets...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <span className="text-cyan-400 font-bold text-xs shrink-0">root@cyberguard-soc:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type command ('help', 'scan', 'status', 'defcon 1')..."
            className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder:text-slate-600"
          />
          <button
            onClick={() => handleCommand(inputVal)}
            className="px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-300 rounded text-xs transition"
          >
            Execute
          </button>
        </div>

        {/* Tactical Quick Click Action Chips */}
        <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Quick Commands:</span>
          <button
            onClick={() => handleCommand('status')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition"
          >
            status
          </button>
          <button
            onClick={() => handleCommand('scan')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 transition"
          >
            scan
          </button>
          <button
            onClick={() => handleCommand('incidents')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition"
          >
            incidents
          </button>
          <button
            onClick={() => handleCommand('defcon 1')}
            className="px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/40 transition"
          >
            DEFCON 1
          </button>
          <button
            onClick={() => handleCommand('defcon 2')}
            className="px-2 py-0.5 rounded bg-orange-950/60 hover:bg-orange-900/60 text-orange-300 border border-orange-500/40 transition"
          >
            DEFCON 2
          </button>
          <button
            onClick={() => handleCommand('matrix')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 transition"
          >
            matrix fx
          </button>
          <button
            onClick={() => handleCommand('audio')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            audio
          </button>
        </div>
      </div>
    </div>
  );
};
