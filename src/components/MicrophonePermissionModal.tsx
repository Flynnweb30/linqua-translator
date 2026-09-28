import React from 'react';
import { AlertTriangle, MicOff, RefreshCw } from 'lucide-react';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onTryAgain: () => void;
  onDismiss: () => void;
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  isOpen,
  onTryAgain,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <MicOff className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Microphone Permission Required</span>
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Microphone access is required for real-time translation. Please allow microphone access
            in your browser settings and try again.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 text-left space-y-1.5">
          <p className="font-semibold text-slate-300">How to allow microphone:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Click the permissions/lock icon next to the URL address bar.</li>
            <li>Enable or toggle "Microphone" to <strong>Allow</strong>.</li>
            <li>Click the "Try Again" button below.</li>
          </ol>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={onTryAgain}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
