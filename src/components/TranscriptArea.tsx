import React, { useEffect, useRef, useState } from 'react';
import { TranscriptItem } from '../types/translation';
import {
  Check,
  ChevronDown,
  Copy,
  Languages,
  Radio,
  Trash2,
  Volume2,
} from 'lucide-react';

interface TranscriptAreaProps {
  items: TranscriptItem[];
  interimOriginal: string;
  interimTranslation: string;
  interimLang: 'es' | 'en' | 'auto';
  showOriginal: boolean;
  showTranslation: boolean;
  onClear: () => void;
  isTranslating: boolean;
}

export const TranscriptArea: React.FC<TranscriptAreaProps> = ({
  items,
  interimOriginal,
  interimTranslation,
  interimLang,
  showOriginal,
  showTranslation,
  onClear,
  isTranslating,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  // Keep newest transcript visible automatically if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [items, interimOriginal, interimTranslation, autoScroll]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If user scrolled up by more than 80px, pause auto-scroll
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 80;
    setAutoScroll(isAtBottom);
  };

  const handleCopyTranscript = () => {
    if (items.length === 0) return;
    const formatted = items
      .map((item) => {
        const time = new Date(item.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const langLabel = item.speakerLanguage === 'es' ? 'SPANISH' : 'ENGLISH';
        const targetLabel = item.speakerLanguage === 'es' ? 'ENGLISH TRANSLATION' : 'SPANISH TRANSLATION';
        return `[${time}] ${langLabel}:\n${item.originalText}\n${targetLabel}:\n${item.translatedText}\n`;
      })
      .join('\n');

    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasInterim = Boolean(interimOriginal.trim() || interimTranslation.trim());
  const isEmpty = items.length === 0 && !hasInterim;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col flex-1 shadow-sm min-h-[420px] max-h-[calc(100vh-280px)]">
      {/* Transcript Header Bar */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Languages className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200">Live Conversation Transcript</h2>
          {isTranslating && (
            <span className="flex items-center space-x-1 text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              <span>Real-time</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {items.length > 0 && (
            <button
              onClick={handleCopyTranscript}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-700 text-xs flex items-center gap-1 transition"
              title="Copy All Transcripts"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          )}

          {items.length > 0 && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800 border border-transparent hover:border-rose-500/30 text-xs flex items-center gap-1 transition"
              title="Clear transcript history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
              }}
              className="px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 text-xs flex items-center gap-1 animate-bounce"
              title="Scroll to bottom"
            >
              <ChevronDown className="w-3 h-3" />
              <span>Latest</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm scroll-smooth"
      >
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3 my-auto">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 border border-slate-700/50">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div className="max-w-md">
              <p className="font-medium text-slate-300">Ready for Live Speech</p>
              <p className="text-xs text-slate-400 mt-1">
                Press <strong className="text-emerald-400">START TRANSLATION</strong> and speak
                naturally in Spanish or English. Translations and transcripts will appear here with
                minimal latency.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Committed Dialogue History */}
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3 transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/60 pb-2">
                  <span className="font-mono">
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="text-slate-400 font-medium">
                    {item.speakerLanguage === 'es' ? 'Spanish → English' : 'English → Spanish'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Original Speech Segment */}
                  {showOriginal && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                          {item.speakerLanguage === 'es' ? 'SPANISH' : 'ENGLISH'}
                        </span>
                        <span className="text-[10px] text-slate-500">Original</span>
                      </div>
                      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                        {item.originalText || '...'}
                      </p>
                    </div>
                  )}

                  {/* Translated Speech Segment */}
                  {showTranslation && (
                    <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-blue-400 flex items-center gap-1.5">
                          <Volume2 className="w-3 h-3 text-blue-400" />
                          {item.speakerLanguage === 'es' ? 'ENGLISH' : 'SPANISH'}
                        </span>
                        <span className="text-[10px] text-blue-400/80 font-medium">Translated</span>
                      </div>
                      <p className="text-blue-100 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                        {item.translatedText || '...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live In-Progress / Partial Interim Item */}
            {hasInterim && (
              <div className="bg-slate-950/90 border border-blue-500/40 rounded-xl p-4 space-y-3 ring-1 ring-blue-500/20 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px] text-blue-400 border-b border-blue-500/20 pb-2">
                  <div className="flex items-center space-x-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    <span>Live In-Progress Translation</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Now</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Interim Original */}
                  {showOriginal && (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
                          {interimLang === 'en' ? 'ENGLISH (Original)' : 'SPANISH (Original)'}
                        </span>
                        <span className="text-[10px] text-amber-400/90 font-medium animate-pulse">
                          Speaking...
                        </span>
                      </div>
                      <p className="text-slate-100 text-sm leading-relaxed italic whitespace-pre-wrap">
                        {interimOriginal || 'Listening to speech...'}
                      </p>
                    </div>
                  )}

                  {/* Interim Translation */}
                  {showTranslation && (
                    <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-blue-400 flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                          {interimLang === 'en' ? 'SPANISH TRANSLATION' : 'ENGLISH TRANSLATION'}
                        </span>
                        <span className="text-[10px] text-blue-400 font-medium animate-pulse">
                          Streaming...
                        </span>
                      </div>
                      <p className="text-blue-200 text-sm font-semibold leading-relaxed whitespace-pre-wrap">
                        {interimTranslation || 'Translating...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
