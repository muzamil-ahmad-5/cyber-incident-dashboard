import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  Volume2,
  VolumeX,
  Terminal,
  Sparkles,
  Tv,
  Activity,
  Zap,
  ChevronDown
} from 'lucide-react';
import { cyberAudio } from '../services/cyberAudio';

interface CyberTacticalTickerProps {
  currentDefcon: number;
  onSetDefcon: (level: number) => void;
  onOpenTerminal: () => void;
  matrixEnabled: boolean;
  onToggleMatrix: () => void;
  scanlinesEnabled: boolean;
  onToggleScanlines: () => void;
}

export const CyberTacticalTicker: React.FC<CyberTacticalTickerProps> = ({
  currentDefcon,
  onSetDefcon,
  onOpenTerminal,
  matrixEnabled,
  onToggleMatrix,
  scanlinesEnabled,
  onToggleScanlines,
}) => {
  const [zuluTime, setZuluTime] = useState<string>('');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(cyberAudio.isMuted());
  const [defconDropdown, setDefconDropdown] = useState(false);
  const [packetCount, setPacketCount] = useState(48210);

  // Update Zulu time clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setZuluTime(now.toUTCString().slice(17, 25));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fluctuating packet stream count for living telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setPacketCount(Math.floor(48000 + Math.random() * 800));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleAudio = () => {
    const muted = cyberAudio.toggleMute();
    setIsAudioMuted(muted);
  };

  const handleDefconChange = (lvl: number) => {
    onSetDefcon(lvl);
    setDefconDropdown(false);
    if (lvl === 1) {
      cyberAudio.playAlert();
    } else {
      cyberAudio.playSuccess();
    }
  };

  const defconConfigs: Record<number, { label: string; bg: string; text: string; border: string }> = {
    1: {
      label: 'DEFCON 1: MAXIMUM ALERT',
      bg: 'bg-red-950/80',
      text: 'text-red-400',
      border: 'border-red-500/70',
    },
    2: {
      label: 'DEFCON 2: ELEVATED',
      bg: 'bg-orange-950/80',
      text: 'text-orange-400',
      border: 'border-orange-500/60',
    },
    3: {
      label: 'DEFCON 3: CAUTION',
      bg: 'bg-yellow-950/80',
      text: 'text-yellow-400',
      border: 'border-yellow-500/60',
    },
    4: {
      label: 'DEFCON 4: NOMINAL',
      bg: 'bg-emerald-950/80',
      text: 'text-emerald-400',
      border: 'border-emerald-500/60',
    },
  };

  const currentCfg = defconConfigs[currentDefcon] || defconConfigs[2];

  return (
    <div className="bg-[#080D19]/95 border-b border-cyan-500/20 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none z-20">
      {/* Left: Tactical Threat Posture & Zulu Clock */}
      <div className="flex items-center gap-3">
        {/* DEFCON Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setDefconDropdown(!defconDropdown);
              cyberAudio.playClick();
            }}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md border ${currentCfg.border} ${currentCfg.bg} ${currentCfg.text} font-bold transition hover:brightness-125 shadow-sm`}
          >
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            <span className="tracking-wider">{currentCfg.label}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {defconDropdown && (
            <div className="absolute left-0 mt-1.5 w-60 bg-slate-950 border border-cyan-500/40 rounded-lg shadow-2xl p-1 z-50">
              {[1, 2, 3, 4].map((lvl) => {
                const cfg = defconConfigs[lvl];
                return (
                  <button
                    key={lvl}
                    onClick={() => handleDefconChange(lvl)}
                    className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between text-[11px] font-bold ${
                      currentDefcon === lvl
                        ? `${cfg.bg} ${cfg.text} border border-cyan-500/40`
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <span>{cfg.label}</span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lvl === 1 ? '#ef4444' : lvl === 2 ? '#f97316' : lvl === 3 ? '#eab308' : '#10b981' }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Zulu Time */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-400 font-bold">{zuluTime || '00:00:00'}</span>
          <span className="text-[10px] text-slate-500 font-bold">UTC [ZULU]</span>
        </div>

        {/* Sensor Throughput */}
        <div className="hidden md:flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>INSPECTION:</span>
          <span className="text-emerald-400 font-bold">{packetCount.toLocaleString()} pkts/s</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400">CIPHER: AES-256</span>
        </div>
      </div>

      {/* Right: Tactical Cyber Controls */}
      <div className="flex items-center gap-2">
        {/* Terminal Button */}
        <button
          onClick={() => {
            onOpenTerminal();
            cyberAudio.playClick();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-300 transition shadow-[0_0_12px_rgba(6,182,212,0.2)]"
          title="Open Tactical Command Terminal (Ctrl+K)"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline font-bold">TACTICAL CLI</span>
          <span className="text-[10px] opacity-60 ml-0.5 hidden lg:inline">[Ctrl+K]</span>
        </button>

        {/* Matrix Rain Toggle */}
        <button
          onClick={() => {
            onToggleMatrix();
            cyberAudio.playSuccess();
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition text-[11px] ${
            matrixEnabled
              ? 'bg-purple-950/60 border-purple-500/50 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.25)]'
              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Cyber Matrix Grid Effect"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden md:inline">MATRIX</span>
        </button>

        {/* Scanlines CRT Toggle */}
        <button
          onClick={() => {
            onToggleScanlines();
            cyberAudio.playClick();
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition text-[11px] ${
            scanlinesEnabled
              ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle CRT Scanline HUD Effect"
        >
          <Tv className="w-3.5 h-3.5" />
          <span className="hidden md:inline">SCANLINES</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={handleToggleAudio}
          className={`p-1.5 rounded-md border transition ${
            !isAudioMuted
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title={!isAudioMuted ? 'Cyber Audio: ON' : 'Cyber Audio: MUTED'}
          aria-label="Toggle Cyber Audio"
        >
          {!isAudioMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
