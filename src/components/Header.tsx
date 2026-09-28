import React from 'react';
import { ConnectionState } from '../types/translation';
import {
  Activity,
  AlertCircle,
  Headphones,
  Mic,
  Radio,
  RefreshCw,
  Settings as SettingsIcon,
  Volume2,
} from 'lucide-react';

interface HeaderProps {
  state: ConnectionState;
  stateMessage?: string;
  volumeLevel: number;
  isMicMuted: boolean;
  isAudioMuted: boolean;
  onOpenSettings: () => void;
  onOpenUserGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  stateMessage,
  volumeLevel,
  isMicMuted,
  isAudioMuted,
  onOpenSettings,
  onOpenUserGuide,
}) => {
  const getStatusBadge = () => {
    switch (state) {
      case 'listening':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400 animate-pulse',
          icon: <Radio className="w-3.5 h-3.5 animate-pulse" />,
          label: 'Listening',
        };
      case 'translating':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
          dot: 'bg-blue-400 animate-ping',
          icon: <Activity className="w-3.5 h-3.5 animate-pulse" />,
          label: 'Translating Live',
        };
      case 'connecting':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400 animate-pulse',
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
          label: 'Connecting',
        };
      case 'connected':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          icon: <Radio className="w-3.5 h-3.5" />,
          label: 'Connected',
        };
      case 'reconnecting':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400 animate-ping',
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
          label: 'Reconnecting',
        };
      case 'error':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-400',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: 'Connection Error',
        };
      case 'stopping':
        return {
          bg: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
          dot: 'bg-slate-400',
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
          label: 'Stopping',
        };
      default:
        return {
          bg: 'bg-slate-800/80 border-slate-700/60 text-slate-300',
          dot: 'bg-slate-500',
          icon: null,
          label: 'Ready / Idle',
        };
    }
  };

  const status = getStatusBadge();

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Tagline */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-lg tracking-wider">
            LQ
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-slate-100 tracking-tight text-base sm:text-lg">
                LINQUA
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                S2S Translation
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Real-time bilingual Spanish ↔ English speech interpreter for live calls & meetings
            </p>
          </div>
        </div>

        {/* Live Audio Visualizer & Status */}
        <div className="flex items-center space-x-3">
          {/* Volume Indicator when actively capturing */}
          {(state === 'listening' || state === 'translating') && (
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs"
              title="Mic Input Level"
            >
              <Mic
                className={`w-3.5 h-3.5 ${
                  isMicMuted ? 'text-rose-400' : 'text-emerald-400 animate-pulse'
                }`}
              />
              <div className="w-16 h-2 bg-slate-700/80 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    isMicMuted ? 'bg-rose-500 w-0' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.round(volumeLevel * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Mute status icons */}
          {isMicMuted && (
            <span className="px-2 py-0.5 text-xs bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded flex items-center gap-1">
              <Mic className="w-3 h-3 text-rose-400 line-through" /> Mic Muted
            </span>
          )}
          {isAudioMuted && (
            <span className="px-2 py-0.5 text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-amber-400 line-through" /> Audio Muted
            </span>
          )}

          {/* Main Status Pill */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-medium shadow-sm transition-colors ${status.bg}`}
            role="status"
            aria-live="polite"
          >
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            {status.icon}
            <span>{status.label}</span>
          </div>

          {/* User Guide ? Help Trigger */}
          <button
            onClick={onOpenUserGuide}
            className="px-2.5 py-1.5 rounded-lg text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-600/25 border border-blue-500/30 hover:border-blue-400/60 flex items-center space-x-1.5 font-semibold text-xs shadow-sm transition"
            title="Open Linqua User Guide & Workflow (?)"
            aria-label="User Guide and Help"
          >
            <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[11px] font-bold">
              ?
            </span>
            <span className="hidden sm:inline">Help & Guide</span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition"
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* State message alert bar if error or reconnecting */}
      {(state === 'error' || state === 'reconnecting') && stateMessage && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-400">
          <div className="flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{stateMessage}</span>
          </div>
        </div>
      )}
    </header>
  );
};
