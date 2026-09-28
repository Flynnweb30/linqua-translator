import React, { useState } from 'react';
import { CRMCallRecord } from '../types/crm';
import { TranscriptItem } from '../types/translation';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  Phone,
  PhoneCall,
  Save,
  Send,
  Sparkles,
  User,
} from 'lucide-react';

interface CRMCallWorkspaceProps {
  record: CRMCallRecord;
  onUpdateRecord: (updated: CRMCallRecord) => void;
  transcripts: TranscriptItem[];
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const CRMCallWorkspace: React.FC<CRMCallWorkspaceProps> = ({
  record,
  onUpdateRecord,
  transcripts,
  isOpen,
  onToggleOpen,
}) => {
  const [leadName, setLeadName] = useState(record.leadName);
  const [company, setCompany] = useState(record.company);
  const [phone, setPhone] = useState(record.phone);
  const [dealSize, setDealSize] = useState(record.dealSize);
  const [status, setStatus] = useState(record.status);
  const [notes, setNotes] = useState(record.notes);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onUpdateRecord({
      ...record,
      leadName,
      company,
      phone,
      dealSize,
      status,
      notes,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAppendTranscript = () => {
    if (transcripts.length === 0) return;
    const conversationSummary = transcripts
      .map((t) => {
        const lang = t.speakerLanguage === 'es' ? 'Spanish Speaker' : 'English Speaker';
        return `[${lang}]: ${t.originalText}\n[Translated]: ${t.translatedText}`;
      })
      .join('\n\n');

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const appended = `${notes}\n\n--- Call Log (${timestamp}) ---\n${conversationSummary}`;
    setNotes(appended);
    onUpdateRecord({
      ...record,
      leadName,
      company,
      phone,
      dealSize,
      status,
      notes: appended,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all">
      {/* Header bar with toggle */}
      <div
        onClick={onToggleOpen}
        className="px-4 py-3 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-950 transition"
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-100">
                CRM Call Workspace (Two-Way Setup)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Active Prospect Call
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {record.leadName} • {record.company} • {record.dealSize}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 hidden sm:inline">
            {isOpen ? 'Collapse CRM details' : 'Expand CRM workflow'}
          </span>
          <button className="p-1 rounded-lg text-slate-400 hover:text-white">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded CRM Panel */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Top Row: Lead Quick Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" /> Contact Name
              </label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-500" /> Company / Organization
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" /> Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-slate-500" /> Deal Value & Status
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={dealSize}
                  onChange={(e) => setDealSize(e.target.value)}
                  className="w-24 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Closed Won">Closed Won</option>
                </select>
              </div>
            </div>
          </div>

          {/* CRM Call Notes & Live Sync */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-500" /> Live Call Notes & Objections
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAppendTranscript}
                  disabled={transcripts.length === 0}
                  className={`text-[11px] px-2.5 py-1 rounded-md border flex items-center gap-1 transition ${
                    transcripts.length > 0
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30'
                      : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  title="Append translated transcript turns into CRM notes"
                >
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span>Append Call Transcript ({transcripts.length})</span>
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record lead requirements, agreed prices, delivery timeline, or objection handling here during call..."
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs leading-relaxed focus:ring-1 focus:ring-blue-500 focus:outline-none resize-y font-sans"
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>Two-way Spanish ↔ English speech automatically translates while CRM call is open.</span>
            </div>

            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved to CRM</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Record</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
