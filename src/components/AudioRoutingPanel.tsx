import React from 'react';
import { Circle, Headphones, Mic, MonitorUp, Radio, RefreshCw } from 'lucide-react';
import { AudioEngineStatus, AudioDeviceInfo } from '../services/audioCapture';
import { DetectedLanguage } from '../types/translation';

interface AudioRoutingPanelProps {
  devices: AudioDeviceInfo[];
  selectedDeviceId: string;
  audioStatus: AudioEngineStatus;
  processedStreamReady: boolean;
  remoteCaptureActive: boolean;
  remoteCaptureSupported: boolean;
  detectedLanguage: DetectedLanguage;
  onSelectDevice: (deviceId: string) => void;
  onStartRemoteCapture: () => void;
  onStopRemoteCapture: () => void;
  onRefreshDevices: () => void;
}

const languageConfig = {
  es: { label: 'Spanish detected', dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  en: { label: 'English detected', dot: 'bg-rose-400', text: 'text-rose-300', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
  unknown: { label: 'Detecting / Unknown', dot: 'bg-slate-500', text: 'text-slate-300', border: 'border-slate-700', bg: 'bg-slate-900' },
} as const;

export const AudioRoutingPanel: React.FC<AudioRoutingPanelProps> = ({
  devices,
  selectedDeviceId,
  audioStatus,
  processedStreamReady,
  remoteCaptureActive,
  remoteCaptureSupported,
  detectedLanguage,
  onSelectDevice,
  onStartRemoteCapture,
  onStopRemoteCapture,
  onRefreshDevices,
}) => {
  const language = languageConfig[detectedLanguage];
  const active = audioStatus === 'capturing';

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">Live Audio Routing</h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Real microphone processing, browser audio routing, and live English/Spanish detection.
          </p>
        </div>

        <div className={`px-3 py-1.5 rounded-full border ${language.border} ${language.bg} flex items-center gap-2`}>
          <span className={`w-2.5 h-2.5 rounded-full ${language.dot}`} />
          <span className={`text-xs font-semibold ${language.text}`}>{language.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Microphone</span>
            <Mic className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-600'}`} />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedDeviceId}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="min-w-0 flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none"
              aria-label="Select microphone"
            >
              <option value="default">Default microphone</option>
              {devices.filter((d) => d.deviceId !== 'default').map((device) => (
                <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
              ))}
            </select>
            <button
              onClick={onRefreshDevices}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
              title="Refresh microphones"
              aria-label="Refresh microphones"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Permission status: {active ? 'Granted' : audioStatus === 'requesting-permission' ? 'Requesting…' : 'Not active'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 border border-cyan-500/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Browser Virtual Mic</span>
            <Radio className={`w-4 h-4 ${processedStreamReady ? 'text-cyan-400' : 'text-slate-600'}`} />
          </div>
          <div className="text-sm font-semibold text-slate-100">Linqua Translator</div>
          <p className="text-[10px] text-slate-400 mt-1">
            {processedStreamReady
              ? 'Processed MediaStream is live.'
              : 'Starts after microphone permission is granted.'}
          </p>
          <p className="text-[10px] text-amber-300/80 mt-2">
            Browser stream only — a system microphone device requires a native virtual-audio driver.
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">CRM / Tab Audio</span>
            <MonitorUp className={`w-4 h-4 ${remoteCaptureActive ? 'text-blue-400' : 'text-slate-600'}`} />
          </div>
          {remoteCaptureActive ? (
            <button onClick={onStopRemoteCapture} className="w-full py-2 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              Stop captured CRM audio
            </button>
          ) : (
            <button
              onClick={onStartRemoteCapture}
              disabled={!remoteCaptureSupported}
              className="w-full py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-semibold disabled:opacity-40"
            >
              Capture CRM tab audio
            </button>
          )}
          <p className="text-[10px] text-slate-500 mt-2">
            Select the CRM tab and enable its audio when Chrome prompts you. No silent cross-site capture is attempted.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <Circle className="w-2.5 h-2.5 fill-current" />
        <span>Language status is based on live speech recognition returned by the translation engine; silence or insufficient speech remains Unknown.</span>
      </div>
    </section>
  );
};
