import React from 'react';
import { AppSettings, DirectionMode, TranslationMode } from '../types/translation';
import { Sliders, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  mode: TranslationMode;
  direction: DirectionMode;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdateMode: (mode: TranslationMode) => void;
  onUpdateDirection: (direction: DirectionMode) => void;
}

const VOICES = [
  { id: 'Fenrir', label: 'Fenrir (Natural Male - Default)', gender: 'Male', desc: 'Authoritative, clear & deep natural male voice for business and live calls' },
  { id: 'Charon', label: 'Charon (Natural Male)', gender: 'Male', desc: 'Low-pitch, calm and steady natural male interpreter tone' },
  { id: 'Puck', label: 'Puck (Natural Male)', gender: 'Male', desc: 'Crisp, direct, and dynamic natural male voice' },
  { id: 'Zephyr', label: 'Zephyr (Conversational Neutral)', gender: 'Neutral', desc: 'Balanced conversational voice persona' },
  { id: 'Kore', label: 'Kore (Natural Female)', gender: 'Female', desc: 'Warm, articulate, and clear professional female tone' },
  { id: 'Aoede', label: 'Aoede (Natural Female)', gender: 'Female', desc: 'Bright, expressive, and friendly female tone' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  mode,
  direction,
  onClose,
  onUpdateSettings,
  onUpdateMode,
  onUpdateDirection,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-base">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Translation Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm">
          {/* Voice Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Translation Voice Persona
              </label>
              <span className="text-[11px] text-blue-400 font-medium">Default: Male (Fenrir)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onUpdateSettings({ voiceName: v.id })}
                  className={`p-3 text-left rounded-xl border transition ${
                    settings.voiceName === v.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-xs text-slate-100">{v.label}</p>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        v.gender === 'Male'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : v.gender === 'Female'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {v.gender}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Translation Mode & Direction */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Default Operational Flow
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdateMode('one-way')}
                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                  mode === 'one-way'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                One-Way Mode
              </button>
              <button
                onClick={() => onUpdateMode('two-way')}
                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                  mode === 'two-way'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Two-Way Mode
              </button>
            </div>

            {mode === 'two-way' && (
              <div className="pt-2">
                <label className="text-xs text-slate-400 block mb-1.5">
                  Two-Way Directional Detection
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdateDirection('auto')}
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium transition ${
                      direction === 'auto'
                        ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Automatic Bilingual
                  </button>
                  <button
                    onClick={() => onUpdateDirection('es-to-en')}
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium transition ${
                      direction === 'es-to-en'
                        ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    ES → EN
                  </button>
                  <button
                    onClick={() => onUpdateDirection('en-to-es')}
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium transition ${
                      direction === 'en-to-es'
                        ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    EN → ES
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audio & Display Toggles */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Audio & Display Preferences
            </label>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-medium text-slate-200 block text-xs">
                    Auto-play Translated Audio
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Immediately stream spoken translation through speaker
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoPlayTranslation}
                  onChange={(e) => onUpdateSettings({ autoPlayTranslation: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-medium text-slate-200 block text-xs">
                    Microphone Noise Suppression
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Filter ambient background noise during active calls
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.noiseSuppression}
                  onChange={(e) => onUpdateSettings({ noiseSuppression: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-medium text-slate-200 block text-xs">
                    Show Original Speech Transcript
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Display speaker transcription column
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showOriginalTranscript}
                  onChange={(e) => onUpdateSettings({ showOriginalTranscript: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-medium text-slate-200 block text-xs">
                    Show Translated Speech Transcript
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Display translated text alongside audio
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showTranslationTranscript}
                  onChange={(e) => onUpdateSettings({ showTranslationTranscript: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
