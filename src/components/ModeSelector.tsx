import React from 'react';
import { DirectionMode, TranslationMode } from '../types/translation';
import { ArrowLeftRight, ArrowRight, Sparkles, User, Users } from 'lucide-react';

interface ModeSelectorProps {
  mode: TranslationMode;
  direction: DirectionMode;
  onSelectMode: (mode: TranslationMode) => void;
  onSelectDirection: (direction: DirectionMode) => void;
  disabled?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  direction,
  onSelectMode,
  onSelectDirection,
  disabled = false,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      {/* Top Row: Mode Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Operating Mode
          </span>
          <span className="text-sm text-slate-300">
            {mode === 'one-way'
              ? 'One-Way: Continuous listening interpreter for incoming speech'
              : 'Two-Way: Conversational interpreter for bilateral dialogue'}
          </span>
        </div>

        <div className="inline-flex p-1 rounded-lg bg-slate-950 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => onSelectMode('one-way')}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center space-x-1.5 ${
              mode === 'one-way'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            aria-pressed={mode === 'one-way'}
          >
            <User className="w-3.5 h-3.5" />
            <span>ONE-WAY</span>
          </button>

          <button
            onClick={() => onSelectMode('two-way')}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center space-x-1.5 ${
              mode === 'two-way'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            aria-pressed={mode === 'two-way'}
          >
            <Users className="w-3.5 h-3.5" />
            <span>TWO-WAY</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Language Direction Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-slate-400">Languages:</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/60 flex items-center gap-1.5">
            Spanish <ArrowLeftRight className="w-3 h-3 text-slate-400" /> English
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === 'one-way' ? (
            <>
              <button
                onClick={() => onSelectDirection('es-to-en')}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 ${
                  direction === 'es-to-en'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="font-semibold text-slate-200">Spanish</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="font-semibold text-blue-400">English</span>
              </button>

              <button
                onClick={() => onSelectDirection('en-to-es')}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 ${
                  direction === 'en-to-es'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="font-semibold text-slate-200">English</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="font-semibold text-amber-400">Spanish</span>
              </button>
            </>
          ) : (
            <>
              {/* For Two-Way: AUTO / SPANISH -> ENGLISH / ENGLISH -> SPANISH */}
              <button
                onClick={() => onSelectDirection('auto')}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 ${
                  direction === 'auto'
                    ? 'bg-blue-600/25 border-blue-500 text-blue-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold">AUTO (Bilingual)</span>
              </button>

              <button
                onClick={() => onSelectDirection('es-to-en')}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 ${
                  direction === 'es-to-en'
                    ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>Spanish</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-blue-400">English</span>
              </button>

              <button
                onClick={() => onSelectDirection('en-to-es')}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 ${
                  direction === 'en-to-es'
                    ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>English</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-amber-400">Spanish</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
