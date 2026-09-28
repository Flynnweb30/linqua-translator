import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  HelpCircle,
  Keyboard,
  Mic,
  Play,
  Radio,
  Sliders,
  Sparkles,
  Volume2,
  X,
  Zap,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with prominent '?' Help Section */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-extrabold text-lg shadow-sm">
              ?
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-slate-100 font-bold text-base">
                  Linqua User Guide & Help Center
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  v2.0 Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Step-by-step workflow for live phone calls, Zoom meetings & bilingual sales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close user guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Step-by-Step New User Workflow */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>Step-by-Step Workflow for New Users</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Step 1 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    STEP 1
                  </span>
                  <Mic className="w-4 h-4 text-emerald-400" />
                </div>
                <h5 className="font-semibold text-slate-200 text-xs">Allow Microphone & Connect Audio</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Connect headphones or your call headset. When prompted, grant browser microphone permission to enable the 16kHz low-latency audio capture stream.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    STEP 2
                  </span>
                  <Sliders className="w-4 h-4 text-indigo-400" />
                </div>
                <h5 className="font-semibold text-slate-200 text-xs">Select Operating Mode</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Choose <strong className="text-slate-200">Two-Way (AUTO)</strong> for active live sales or support calls, or <strong className="text-slate-200">One-Way</strong> to continuously listen to a Spanish presentation.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    STEP 3
                  </span>
                  <Play className="w-4 h-4 text-emerald-400" />
                </div>
                <h5 className="font-semibold text-slate-200 text-xs">Press START & Speak Naturally</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Press the large green <strong className="text-emerald-400">START</strong> button (or press <kbd className="px-1 py-0.2 rounded bg-slate-900 border border-slate-700 font-mono text-[10px]">Space</kbd>). Linqua immediately translates speech-to-speech with natural male voice playback.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    STEP 4
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <h5 className="font-semibold text-slate-200 text-xs">Log Call to CRM Workspace</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Track prospect name, deal terms, and notes in the CRM Workspace. Click <strong className="text-blue-300">Append Call Transcript</strong> to log dialogue turns with zero typing.
                </p>
              </div>
            </div>
          </div>

          {/* Core Feature Deep-Dive */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> Recommended CRM & Call Configuration
            </h4>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block">Default Natural Male Voice (Fenrir):</strong>
                  <span className="text-slate-400">
                    Configured with Google Gemini Live's natural male persona for authoritative, clear business tone. You can switch to Charon or Puck in Settings anytime.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block">Barge-in / Interruption:</strong>
                  <span className="text-slate-400">
                    If either speaker starts talking while translated audio is playing, Linqua immediately flushes queued playback so the conversation flows naturally without sound overlap.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block">Direction Control during Busy Calls:</strong>
                  <span className="text-slate-400">
                    While AUTO handles reciprocal translation automatically, you can click <span className="text-slate-200 font-mono">Spanish → English</span> or <span className="text-slate-200 font-mono">English → Spanish</span> to enforce strict single-direction translation during noisy background environments.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Keyboard className="w-4 h-4" /> Keyboard Shortcuts for Call Operation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Start / Stop Call</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-slate-200">
                  Space
                </kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Mute Microphone</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-slate-200">
                  M
                </kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Mute Spoken Audio</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-slate-200">
                  A
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
          <span className="text-xs text-slate-500 font-mono">Linqua • S2S Voice Interpreter</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition"
          >
            Start Using Linqua
          </button>
        </div>
      </div>
    </div>
  );
};
