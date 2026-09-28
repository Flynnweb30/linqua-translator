import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Headphones,
  Lightbulb,
  MessageSquare,
  Mic,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';

interface CommunicationCoachProps {
  isOpen?: boolean;
}

export const CommunicationCoach: React.FC<CommunicationCoachProps> = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);

  const PHRASES = [
    {
      label: 'Call Introduction / Greeting',
      es: 'Hola, un gusto saludarle. Estoy usando un intérprete de voz en tiempo real para que podamos conversar fluidamente.',
      en: 'Hello, great to speak with you. I am using a real-time voice interpreter so we can converse smoothly.',
    },
    {
      label: 'Pacing / Audio Check',
      es: '¿Me escucha bien y con claridad? Podemos conversar a un ritmo normal.',
      en: 'Can you hear me clearly? We can speak at our normal pace.',
    },
    {
      label: 'Pricing & Quotation',
      es: 'El presupuesto incluye implementación completa, soporte técnico en español y garantía de servicio.',
      en: 'The proposal includes full implementation, Spanish technical support, and service guarantee.',
    },
    {
      label: 'Clarification / Repeat Request',
      es: '¿Podría confirmarme por favor ese número o fecha nuevamente?',
      en: 'Could you please confirm that number or date once more?',
    },
  ];

  const copyPhrase = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhrase(text);
    setTimeout(() => setCopiedPhrase(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="px-4 py-3 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border-b border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition"
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-100">
                Spanish Communication Coach & Best Practices
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium hidden sm:inline">
                Live Call Advice
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pro tips for speaking with Spanish clients, pacing advice & verified bilingual phrases
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 hidden sm:inline">
            {isExpanded ? 'Collapse Advice' : 'View Advice & Phrases'}
          </span>
          <button className="p-1 rounded-lg text-slate-400 hover:text-white">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5 text-xs text-slate-300">
          {/* 3 Golden Rules for Spanish Calls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-300 font-semibold text-xs">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                <span>1. Speak in Complete Thoughts</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Speak in natural, complete clauses. Pause 1 second at the end of each thought so the AI interpreter delivers natural Spanish grammar with proper gender and conjugation.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
                <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>2. Wear Headsets / Earbuds</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Wearing headphones prevents the other speaker's translated voice from leaking back into your microphone, eliminating acoustic echo and audio loops.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>3. Let Numbers & Names Stand Out</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Gemini 3.8 Live is trained to keep monetary prices, product SKU codes, phone numbers, and addresses 100% faithful without rounding or guessing.
              </p>
            </div>
          </div>

          {/* Quick-Click Spanish Phrases */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Key Bilingual Call Phrases (Click to copy)</span>
              </span>
              <span className="text-[10px] text-slate-500">
                You can say these in English, or copy Spanish text into chat
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PHRASES.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => copyPhrase(item.es)}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:text-blue-300">
                      {item.label}
                    </span>
                    <button
                      className="text-[10px] text-slate-500 group-hover:text-blue-400 flex items-center gap-1"
                      title="Copy Spanish text"
                    >
                      {copiedPhrase === item.es ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <span>Copy ES</span>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-blue-200 font-medium leading-relaxed">"{item.es}"</p>
                  <p className="text-[11px] text-slate-400 italic leading-snug">"{item.en}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
