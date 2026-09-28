import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ExternalLink,
  Headphones,
  Mic,
  Radio,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import { AudioDevice, AudioOutputDevice } from '../services/audioCapture';
import { AudioRuntimeStatus, LanguageDetectionState } from '../types/translation';

interface AudioRoutingPanelProps {
  devices: AudioDevice[];
  selectedDeviceId: string;
  outputDevices: AudioOutputDevice[];
  selectedVirtualOutputId: string;
  onSelectVirtualOutput: (deviceId: string) => void;
  onConnectVirtualMic: () => void;
  onDisconnectVirtualMic: () => void;
  virtualMicConnected: boolean;
  onSelectDevice: (deviceId: string) => void;
  onRefreshDevices: () => void;
  onCaptureCrmAudio: () => void;
  onStopCrmAudio: () => void;
  runtime: AudioRuntimeStatus;
  language: LanguageDetectionState;
  micVolume: number;
  crmVolume: number;
}

const statusText: Record<AudioRuntimeStatus['virtualMicrophone'], string> = {
  unavailable: 'Not active',
  'browser-stream': 'Browser stream ready',
  'system-device': 'System device available',
};

export const AudioRoutingPanel: React.FC<AudioRoutingPanelProps> = ({
  devices,
  selectedDeviceId,
  outputDevices,
  selectedVirtualOutputId,
  onSelectVirtualOutput,
  onConnectVirtualMic,
  onDisconnectVirtualMic,
  virtualMicConnected,
  onSelectDevice,
  onRefreshDevices,
  onCaptureCrmAudio,
  onStopCrmAudio,
  runtime,
  language,
  micVolume,
  crmVolume,
}) => {
  const languageLabel =
    language === 'spanish'
      ? 'Spanish detected'
      : language === 'english'
      ? 'English detected'
      : language === 'detecting'
      ? 'Detecting…'
      : language === 'offline'
      ? 'Detection unavailable'
      : 'Unknown / waiting for speech';

  const languageClass =
    language === 'spanish'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : language === 'english'
      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
      : 'border-slate-700 bg-slate-900 text-slate-400';

  const indicatorClass =
    language === 'spanish'
      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.65)]'
      : language === 'english'
      ? 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.65)]'
      : 'bg-slate-500';

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">Live Audio Routing</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Real microphone processing + CRM tab audio capture + automatic English/Spanish detection.
          </p>
        </div>

        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${languageClass}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${indicatorClass}`} />
          <span>{languageLabel}</span>

        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-slate-200">Microphone</span>
            </div>
            <span className="text-[10px] text-emerald-400">
              {runtime.microphonePermission === 'granted' ? 'Permission granted' : runtime.microphonePermission}
            </span>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedDeviceId}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="min-w-0 flex-1 px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Microphone input device"
            >
              <option value="">System default microphone</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRefreshDevices}
              className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900"
              title="Refresh microphone devices"
              aria-label="Refresh microphone devices"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[10px] text-slate-500 truncate">
            Active input: <span className="text-slate-300">{runtime.selectedDeviceLabel || 'Not started'}</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <span className="block h-full bg-blue-400" style={{ width: `${Math.round(micVolume * 100)}%` }} />
            </span>
            <span>Processed input</span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-slate-200">CRM / Remote Audio</span>
            </div>
            <span className={`text-[10px] ${runtime.crmAudio === 'connected' ? 'text-emerald-400' : 'text-slate-500'}`}>
              {runtime.crmAudio === 'connected' ? 'Connected' : runtime.crmAudio === 'requesting' ? 'Requesting' : 'Not connected'}
            </span>
          </div>

          <button
            type="button"
            onClick={runtime.crmAudio === 'connected' ? onStopCrmAudio : onCaptureCrmAudio}
            className={`w-full py-2 rounded-lg text-xs font-semibold border transition ${
              runtime.crmAudio === 'connected'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                : 'bg-violet-600/15 border-violet-500/30 text-violet-300 hover:bg-violet-600/25'
            }`}
          >
            {runtime.crmAudio === 'connected' ? 'Stop CRM Audio Capture' : 'Capture CRM Tab Audio'}
          </button>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <span className="block h-full bg-violet-400" style={{ width: `${Math.round(crmVolume * 100)}%` }} />
            </span>
            <span>Remote audio level</span>
          </div>

          <p className="text-[10px] leading-relaxed text-slate-500">
            In Chrome, choose the CRM calling tab and enable its audio. This is the supported browser route for receiving the other speaker’s tab audio.
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200">Linqua Translator</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {runtime.virtualMicrophone === 'browser-stream' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="text-slate-300">{statusText[runtime.virtualMicrophone]}</span>
          </div>

          <div className="text-[10px] leading-relaxed text-slate-500">
            The app creates a processed browser MediaStream named <strong className="text-slate-300">Linqua Translator</strong>.
          </div>

          <select
            value={selectedVirtualOutputId}
            onChange={(e) => onSelectVirtualOutput(e.target.value)}
            className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[10px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
            aria-label="Virtual audio output"
          >
            <option value="">Select virtual-audio output</option>
            {outputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={virtualMicConnected ? onDisconnectVirtualMic : onConnectVirtualMic}
            className={`w-full py-2 rounded-lg text-[10px] font-semibold border ${
              virtualMicConnected
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-cyan-600/10 border-cyan-500/30 text-cyan-300'
            }`}
          >
            {virtualMicConnected ? 'Disconnect Virtual-Mic Bridge' : 'Connect Virtual-Mic Bridge'}
          </button>

          <div className="flex items-start gap-2 pt-1 text-[10px] leading-relaxed text-amber-300/80">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              A browser cannot create the OS microphone itself. Install a virtual-audio driver/mixer first, select its playback endpoint here, then select the corresponding recording endpoint in the CRM.
            </span>
          </div>

          <a
            href="#virtual-mic-setup"
            className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
          >
            <ExternalLink className="w-3 h-3" />
            <span>See production routing requirements below</span>
          </a>
        </div>
      </div>
    </section>
  );
};
