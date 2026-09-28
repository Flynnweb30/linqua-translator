import React from 'react';
import { ConnectionState } from '../types/translation';
import {
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface ActionControlsProps {
  state: ConnectionState;
  isMicMuted: boolean;
  isAudioMuted: boolean;
  onToggleStartStop: () => void;
  onToggleMuteMic: () => void;
  onToggleMuteAudio: () => void;
  onReconnect: () => void;
  onClearTranscript: () => void;
  transcriptCount: number;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  state,
  isMicMuted,
  isAudioMuted,
  onToggleStartStop,
  onToggleMuteMic,
  onToggleMuteAudio,
  onReconnect,
  onClearTranscript,
  transcriptCount,
}) => {
  const isRunning =
    state === 'connecting' ||
    state === 'connected' ||
    state === 'listening' ||
    state === 'translating';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Primary START / STOP Large Button */}
        <div className="w-full sm:w-auto">
          <button
            onClick={onToggleStartStop}
            className={`w-full sm:w-56 py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center space-x-2.5 active:scale-95 ${
              isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25 ring-2 ring-rose-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 ring-2 ring-emerald-500/40'
            }`}
            aria-label={isRunning ? 'Stop Translation' : 'Start Translation'}
          >
            {isRunning ? (
              <>
                <Square className="w-5 h-5 fill-current" />
                <span>STOP TRANSLATION</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>START TRANSLATION</span>
              </>
            )}
          </button>
        </div>

        {/* Additional Controls Bar */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
          {/* Mute Original Mic */}
          <button
            onClick={onToggleMuteMic}
            disabled={!isRunning}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 ${
              isMicMuted
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            } ${!isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Original Microphone'}
          >
            {isMicMuted ? (
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isMicMuted ? 'UNMUTE MIC' : 'MUTE ORIGINAL'}</span>
          </button>

          {/* Mute Translation Speaker */}
          <button
            onClick={onToggleMuteAudio}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 ${
              isAudioMuted
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={isAudioMuted ? 'Unmute Translation Audio' : 'Mute Translation Audio'}
          >
            {isAudioMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isAudioMuted ? 'UNMUTE AUDIO' : 'MUTE TRANSLATION'}</span>
          </button>

          {/* Reconnect Button */}
          <button
            onClick={onReconnect}
            className="px-3 py-2 rounded-lg text-xs font-medium border bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition flex items-center space-x-1.5"
            title="Reset & Reconnect AI Session"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>RECONNECT</span>
          </button>

          {/* Clear Transcript */}
          <button
            onClick={onClearTranscript}
            disabled={transcriptCount === 0}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 ${
              transcriptCount > 0
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-rose-300 hover:border-rose-500/40 hover:bg-slate-800'
                : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            title="Clear Live Transcript History"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>CLEAR TRANSCRIPT</span>
          </button>
        </div>
      </div>

      {/* Real-time Pro Suggestions Bar when Running */}
      {isRunning && (
        <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-slate-200 font-medium">Bilingual Translation Live:</span>
            <span>Speak in complete sentences • Pause 1s for seamless translation • Headset prevents echo</span>
          </div>
          <span className="text-blue-400 font-medium">Spanish ↔ English Active</span>
        </div>
      )}
    </div>
  );
};
