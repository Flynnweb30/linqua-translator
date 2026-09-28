/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import {
  AppSettings,
  ConnectionState,
  DirectionMode,
  TranscriptItem,
  TranslationMode,
  AudioRuntimeStatus,
  LanguageDetectionState,
} from './types/translation';
import { CRMCallRecord, DEFAULT_CRM_RECORD } from './types/crm';
import { AudioCaptureEngine, CrmAudioCaptureEngine, VirtualMicBridge } from './services/audioCapture';
import { AudioPlaybackEngine } from './services/audioPlayback';
import { TranslationClient } from './services/translationClient';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { ActionControls } from './components/ActionControls';
import { TranscriptArea } from './components/TranscriptArea';
import { SettingsModal } from './components/SettingsModal';
import { MicrophonePermissionModal } from './components/MicrophonePermissionModal';
import { UserGuideModal } from './components/UserGuideModal';
import { CRMCallWorkspace } from './components/CRMCallWorkspace';
import { CommunicationCoach } from './components/CommunicationCoach';
import { AudioRoutingPanel } from './components/AudioRoutingPanel';
import type { AudioDevice, AudioOutputDevice } from './services/audioCapture';

const DEFAULT_SETTINGS: AppSettings = {
  voiceName: 'Fenrir',
  noiseSuppression: true,
  autoPlayTranslation: true,
  showOriginalTranscript: true,
  showTranslationTranscript: true,
  preferredInputDeviceId: '',
};

export default function App() {
  // State machine
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [stateMessage, setStateMessage] = useState<string>('');

  // Mode and Direction
  const [mode, setMode] = useState<TranslationMode>('two-way');
  const [direction, setDirection] = useState<DirectionMode>('auto');

  // Mute flags
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Audio metrics
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [crmVolumeLevel, setCrmVolumeLevel] = useState(0);
  const [microphoneDevices, setMicrophoneDevices] = useState<AudioDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<AudioOutputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedVirtualOutputId, setSelectedVirtualOutputId] = useState('');
  const [languageDetection, setLanguageDetection] = useState<LanguageDetectionState>('unknown');
  const [audioRuntime, setAudioRuntime] = useState<AudioRuntimeStatus>({
    microphonePermission: 'unknown',
    selectedDeviceId: '',
    selectedDeviceLabel: '',
    virtualMicrophone: 'unavailable',
    crmAudio: 'unavailable',
    processing: 'idle',
  });

  // Transcripts
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [interimOriginal, setInterimOriginal] = useState('');
  const [interimTranslation, setInterimTranslation] = useState('');
  const [interimLang, setInterimLang] = useState<'es' | 'en' | 'auto'>('es');

  // Modals & settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isMicPermissionDenied, setIsMicPermissionDenied] = useState(false);
  const [isCRMOpen, setIsCRMOpen] = useState(true);

  // CRM Record State
  const [crmRecord, setCrmRecord] = useState<CRMCallRecord>(() => {
    try {
      const saved = localStorage.getItem('livevoice_crm_record');
      return saved ? JSON.parse(saved) : DEFAULT_CRM_RECORD;
    } catch {
      return DEFAULT_CRM_RECORD;
    }
  });

  const handleUpdateCrmRecord = (updated: CRMCallRecord) => {
    setCrmRecord(updated);
    try {
      localStorage.setItem('livevoice_crm_record', JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('livevoice_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Engines refs
  const captureEngineRef = useRef<AudioCaptureEngine | null>(null);
  const playbackEngineRef = useRef<AudioPlaybackEngine | null>(null);
  const clientRef = useRef<TranslationClient | null>(null);
  const crmCaptureRef = useRef<CrmAudioCaptureEngine | null>(null);
  const virtualMicBridgeRef = useRef<VirtualMicBridge | null>(null);

  const refreshMicrophoneDevices = useCallback(async () => {
    try {
      const devices = await AudioCaptureEngine.enumerateDevices();
      const outputs = await AudioCaptureEngine.enumerateOutputDevices();
      setMicrophoneDevices(devices);
      setAudioOutputDevices(outputs);
      setSelectedVirtualOutputId((current) => current || outputs.find((device) => /cable|virtual|voicemeeter|line/i.test(device.label))?.deviceId || '');
      setSelectedDeviceId((current) => {
        const preferred = settings.preferredInputDeviceId || current;
        if (preferred && devices.some((device) => device.deviceId === preferred)) return preferred;
        return devices[0]?.deviceId || '';
      });
    } catch {
      setMicrophoneDevices([]);
    }
  }, [settings.preferredInputDeviceId]);

  useEffect(() => {
    void refreshMicrophoneDevices();
    void AudioCaptureEngine.getPermissionState().then((permission) => {
      setAudioRuntime((prev) => ({ ...prev, microphonePermission: permission }));
    });
  }, [refreshMicrophoneDevices]);

  // Save settings on update
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('livevoice_settings', JSON.stringify(updated));
      } catch {
        // Ignored
      }
      return updated;
    });

    if (newSettings.autoPlayTranslation !== undefined && playbackEngineRef.current) {
      playbackEngineRef.current.setAutoPlay(newSettings.autoPlayTranslation);
    }
  }, []);

  // Update mute on playback engine
  useEffect(() => {
    if (playbackEngineRef.current) {
      playbackEngineRef.current.setMute(isAudioMuted);
    }
  }, [isAudioMuted]);

  // Update mute on capture engine
  useEffect(() => {
    if (captureEngineRef.current) {
      captureEngineRef.current.setMute(isMicMuted);
    }
  }, [isMicMuted]);

  // Flush interim into final transcript
  const commitTurn = useCallback(() => {
    setInterimOriginal((currOrig) => {
      setInterimTranslation((currTrans) => {
        if (currOrig.trim() || currTrans.trim()) {
          const newItem: TranscriptItem = {
            id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: Date.now(),
            speakerLanguage: direction === 'en-to-es' ? 'en' : 'es',
            originalText: currOrig.trim(),
            translatedText: currTrans.trim(),
          };
          setTranscripts((prev) => [...prev, newItem]);
        }
        return '';
      });
      return '';
    });
  }, [direction]);

  // Initialize translation client
  useEffect(() => {
    const captureEngine = new AudioCaptureEngine();
    const playbackEngine = new AudioPlaybackEngine();
    playbackEngine.setAutoPlay(settings.autoPlayTranslation);

    captureEngineRef.current = captureEngine;
    playbackEngineRef.current = playbackEngine;

    const client = new TranslationClient({
      onStateChange: (newState, msg) => {
        setConnectionState(newState);
        if (msg) setStateMessage(msg);
      },
      onAudioData: (base64Pcm) => {
        playbackEngine.enqueueChunk(base64Pcm);
      },
      onInterimInput: (text, lang) => {
        setInterimOriginal(text);
        if (text.trim()) setLanguageDetection('detecting');
        if (lang === 'en' || lang === 'es') {
          setInterimLang(lang);
          setLanguageDetection(lang === 'es' ? 'spanish' : 'english');
        }
      },
      onInputTranscript: (text, finished, lang) => {
        setInterimOriginal((prev) => {
          const combined = finished ? (prev ? `${prev} ${text}` : text) : text;
          return combined;
        });
        if (lang === 'en' || lang === 'es') {
          setInterimLang(lang);
          setLanguageDetection(lang === 'es' ? 'spanish' : 'english');
        }
      },
      onOutputTranscript: (text, _finished, _lang) => {
        setInterimTranslation((prev) => (prev ? `${prev} ${text}` : text));
      },
      onInterrupted: () => {
        // User barge-in! Stop queued audio immediately
        playbackEngine.flush();
      },
      onTurnComplete: () => {
        commitTurn();
      },
      onError: (errMsg) => {
        setStateMessage(errMsg);
      },
    });

    clientRef.current = client;

    // Online/Offline network events
    const handleOnline = () => {
      setStateMessage('Network connection restored.');
    };
    const handleOffline = () => {
      setConnectionState('offline');
      setLanguageDetection('offline');
      setStateMessage('Device is offline. Translation paused.');
      captureEngine.stop();
      playbackEngine.flush();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      client.stop();
      captureEngine.stop();
      crmCaptureRef.current?.stop();
      crmCaptureRef.current = null;
      virtualMicBridgeRef.current?.stop();
      virtualMicBridgeRef.current = null;
      playbackEngine.close();
    };
  }, [commitTurn, settings.autoPlayTranslation]);

  // Start Translation session
  const startTranslation = async () => {
    if (!clientRef.current || !captureEngineRef.current) return;

    try {
      setIsMicPermissionDenied(false);
      setLanguageDetection('detecting');

      const captureEngine = captureEngineRef.current;

      // Always request/initialize the user's microphone first. This creates the
      // browser-local processed "Linqua Translator" MediaStream.
      await captureEngine.start(
        {
          onAudioChunk: () => {
            // The user's microphone is intentionally NOT sent to the CRM-input
            // translation session by default. In CRM mode the incoming tab audio
            // represents the other speaker. The processed mic stream remains
            // available for WebRTC-compatible integrations.
          },
          onVolumeChange: setVolumeLevel,
          onError: (err) => {
            console.error('Audio capture error:', err);
          },
          onDeviceEnded: () => {
            setAudioRuntime((prev) => ({
              ...prev,
              microphonePermission: 'granted',
              processing: 'idle',
              virtualMicrophone: 'unavailable',
            }));
            setStateMessage('The selected microphone was disconnected. Select another input device.');
          },
        },
        {
          noiseSuppression: settings.noiseSuppression,
          deviceId: selectedDeviceId || settings.preferredInputDeviceId || undefined,
        }
      );

      const captureStatus = captureEngine.getStatus();
      setAudioRuntime((prev) => ({
        ...prev,
        microphonePermission: captureStatus.permission,
        selectedDeviceId: captureStatus.deviceId,
        selectedDeviceLabel: captureStatus.deviceLabel,
        virtualMicrophone: captureStatus.virtualMicrophone,
        processing: captureStatus.processing,
      }));

      await refreshMicrophoneDevices();

      // Optional OS virtual-audio bridge. If a virtual cable/virtual mixer is
      // installed, route the processed browser stream to its playback endpoint.
      if (selectedVirtualOutputId) {
        const bridge = new VirtualMicBridge();
        await bridge.connect(captureEngine.getProcessedStream()!, selectedVirtualOutputId);
        virtualMicBridgeRef.current = bridge;
      }

      // In the CRM workflow, capture the remote call/tab audio as the actual
      // translation input. The browser's explicit share picker is required.
      const crmCapture = new CrmAudioCaptureEngine();
      crmCaptureRef.current = crmCapture;
      setAudioRuntime((prev) => ({ ...prev, crmAudio: 'requesting' }));

      await crmCapture.start(
        (base64Pcm) => clientRef.current?.sendAudio(base64Pcm),
        setCrmVolumeLevel,
        () => {
          setAudioRuntime((prev) => ({ ...prev, crmAudio: 'ended' }));
          setLanguageDetection('unknown');
              setStateMessage('CRM audio capture ended. Reconnect the CRM tab audio to continue detecting the other speaker.');
        }
      );

      setAudioRuntime((prev) => ({ ...prev, crmAudio: 'connected' }));

      // Start the secure server-side translation channel only after the audio
      // source is ready, preventing a live session from starting with no input.
      clientRef.current.connect(mode, direction, settings.voiceName);
    } catch (err: any) {
      crmCaptureRef.current?.stop();
      crmCaptureRef.current = null;
      virtualMicBridgeRef.current?.stop();
      virtualMicBridgeRef.current = null;
      captureEngineRef.current?.stop();

      setAudioRuntime((prev) => ({
        ...prev,
        crmAudio: 'unavailable',
        virtualMicrophone: 'unavailable',
        processing: 'idle',
      }));

      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase?.().includes('permission')
      ) {
        setIsMicPermissionDenied(true);
        setLanguageDetection('offline');
        } else {
        setConnectionState('error');
        setLanguageDetection('offline');
          setStateMessage(
          err?.message ||
            'Unable to start live audio. Allow microphone access and select the CRM tab with audio sharing enabled.'
        );
      }
    }
  };

  const captureCrmAudio = async () => {
    const crmCapture = new CrmAudioCaptureEngine();
    crmCaptureRef.current?.stop();
    crmCaptureRef.current = crmCapture;
    setAudioRuntime((prev) => ({ ...prev, crmAudio: 'requesting' }));

    try {
      await crmCapture.start(
        (base64Pcm) => clientRef.current?.sendAudio(base64Pcm),
        setCrmVolumeLevel,
        () => {
          setAudioRuntime((prev) => ({ ...prev, crmAudio: 'ended' }));
          setLanguageDetection('unknown');
            }
      );
      setAudioRuntime((prev) => ({ ...prev, crmAudio: 'connected' }));
      setLanguageDetection('detecting');
    } catch (err: any) {
      crmCapture.stop();
      crmCaptureRef.current = null;
      setAudioRuntime((prev) => ({ ...prev, crmAudio: 'unavailable' }));
      setStateMessage(err?.message || 'CRM audio capture was not started.');
    }
  };

  const stopCrmAudio = () => {
    crmCaptureRef.current?.stop();
    crmCaptureRef.current = null;
    setAudioRuntime((prev) => ({ ...prev, crmAudio: 'unavailable' }));
    setCrmVolumeLevel(0);
    setLanguageDetection('unknown');
    setLanguageDetectionConfidence(0);
  };

  const connectVirtualMicBridge = async () => {
    const stream = captureEngineRef.current?.getProcessedStream();
    if (!stream) {
      setStateMessage('Start the microphone first, then connect the virtual microphone bridge.');
      return;
    }
    if (!selectedVirtualOutputId) {
      setStateMessage('Select a virtual-audio playback device first.');
      return;
    }

    try {
      const bridge = new VirtualMicBridge();
      await bridge.connect(stream, selectedVirtualOutputId);
      virtualMicBridgeRef.current?.stop();
      virtualMicBridgeRef.current = bridge;
      setStateMessage('Processed microphone is now routed to the selected virtual-audio output.');
    } catch (err: any) {
      setStateMessage(err?.message || 'Unable to connect the virtual microphone bridge.');
    }
  };

  const disconnectVirtualMicBridge = () => {
    virtualMicBridgeRef.current?.stop();
    virtualMicBridgeRef.current = null;
    setStateMessage('Virtual microphone bridge disconnected.');
  };

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    updateSettings({ preferredInputDeviceId: deviceId });
    if (captureEngineRef.current?.isActive()) {
      setStateMessage('Input device changed. Stop and start translation to apply the new microphone.');
    }
  };

  // Stop Translation session
  const stopTranslation = () => {
    captureEngineRef.current?.stop();
    crmCaptureRef.current?.stop();
    crmCaptureRef.current = null;
    virtualMicBridgeRef.current?.stop();
    virtualMicBridgeRef.current = null;
    playbackEngineRef.current?.flush();
    clientRef.current?.stop();
    commitTurn();

    setVolumeLevel(0);
    setCrmVolumeLevel(0);
    setLanguageDetection('unknown');
    setLanguageDetectionConfidence(0);
    setAudioRuntime((prev) => ({
      ...prev,
      crmAudio: 'unavailable',
      virtualMicrophone: 'unavailable',
      processing: 'idle',
    }));
    setConnectionState('idle');
    setStateMessage('Translation stopped');
  };

  const handleToggleStartStop = () => {
    const isRunning =
      connectionState === 'connecting' ||
      connectionState === 'connected' ||
      connectionState === 'listening' ||
      connectionState === 'translating';

    if (isRunning) {
      stopTranslation();
    } else {
      startTranslation();
    }
  };

  const handleReconnect = () => {
    stopTranslation();
    setTimeout(() => {
      startTranslation();
    }, 250);
  };

  const handleSelectMode = (newMode: TranslationMode) => {
    setMode(newMode);
    if (clientRef.current && connectionState !== 'idle') {
      clientRef.current.switchMode(newMode);
    }
  };

  const handleSelectDirection = (newDirection: DirectionMode) => {
    setDirection(newDirection);
    if (clientRef.current && connectionState !== 'idle') {
      clientRef.current.switchDirection(newDirection);
    }
  };

  const handleClearTranscript = () => {
    setTranscripts([]);
    setInterimOriginal('');
    setInterimTranslation('');
  };

  // Keyboard shortcut listener for power users on calls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input or modal
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isSettingsOpen ||
        isMicPermissionDenied
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleStartStop();
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMicMuted((prev) => !prev);
      } else if (e.key === 'a' || e.key === 'A') {
        setIsAudioMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectionState, isSettingsOpen, isMicPermissionDenied]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        state={connectionState}
        stateMessage={stateMessage}
        volumeLevel={volumeLevel}
        isMicMuted={isMicMuted}
        isAudioMuted={isAudioMuted}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUserGuide={() => setIsUserGuideOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-4">
        {/* Mode & Direction Selector */}
        <ModeSelector
          mode={mode}
          direction={direction}
          onSelectMode={handleSelectMode}
          onSelectDirection={handleSelectDirection}
          disabled={connectionState === 'connecting' || connectionState === 'stopping'}
        />

        <AudioRoutingPanel
          devices={microphoneDevices}
          outputDevices={audioOutputDevices}
          selectedVirtualOutputId={selectedVirtualOutputId}
          onSelectVirtualOutput={setSelectedVirtualOutputId}
          onConnectVirtualMic={connectVirtualMicBridge}
          onDisconnectVirtualMic={disconnectVirtualMicBridge}
          virtualMicConnected={Boolean(virtualMicBridgeRef.current?.isActive())}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={handleSelectDevice}
          onRefreshDevices={() => void refreshMicrophoneDevices()}
          onCaptureCrmAudio={() => void captureCrmAudio()}
          onStopCrmAudio={stopCrmAudio}
          runtime={audioRuntime}
          language={languageDetection}
          micVolume={volumeLevel}
          crmVolume={crmVolumeLevel}
        />

        {/* CRM Call Workspace (Active call context for two-way conversations) */}
        <CRMCallWorkspace
          record={crmRecord}
          onUpdateRecord={handleUpdateCrmRecord}
          transcripts={transcripts}
          isOpen={isCRMOpen}
          onToggleOpen={() => setIsCRMOpen((prev) => !prev)}
        />

        {/* Spanish Communication Coach & Advice */}
        <CommunicationCoach />

        {/* Action Controls (START/STOP, Mute, Reconnect, Clear) */}
        <ActionControls
          state={connectionState}
          isMicMuted={isMicMuted}
          isAudioMuted={isAudioMuted}
          onToggleStartStop={handleToggleStartStop}
          onToggleMuteMic={() => setIsMicMuted((prev) => !prev)}
          onToggleMuteAudio={() => setIsAudioMuted((prev) => !prev)}
          onReconnect={handleReconnect}
          onClearTranscript={handleClearTranscript}
          transcriptCount={transcripts.length}
        />

        {/* Live Conversation Transcript */}
        <TranscriptArea
          items={transcripts}
          interimOriginal={interimOriginal}
          interimTranslation={interimTranslation}
          interimLang={interimLang}
          showOriginal={settings.showOriginalTranscript}
          showTranslation={settings.showTranslationTranscript}
          onClear={handleClearTranscript}
          isTranslating={connectionState === 'translating'}
        />

        <section id="virtual-mic-setup" className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>CRM Virtual-Microphone Compatibility</span>
          </div>
          <p>
            Linqua creates and processes a real browser MediaStream named <strong className="text-slate-300">Linqua Translator</strong>.
            Chrome/Edge web pages cannot register that stream as a new Windows microphone device, so a CRM that only lists OS microphone devices cannot select it directly.
          </p>
          <p>
            For a true system-level <strong className="text-slate-300">Linqua Translator</strong> microphone, use a native virtual-audio driver/helper and route this processed stream into that device. The browser app does not claim that capability by itself.
          </p>
          <p>
            For incoming CRM audio, use <strong className="text-slate-300">Capture CRM Tab Audio</strong>. A Chrome extension using tab capture can automate that routing for supported CRM workflows.
          </p>
        </section>

        {/* Helper Footer note */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-900 gap-2">
          <div className="flex items-center space-x-2">
            <span>Shortcuts:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
              Space
            </kbd>
            <span>Start/Stop</span>
            <span className="text-slate-700">•</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
              M
            </kbd>
            <span>Mute Mic</span>
            <span className="text-slate-700">•</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
              A
            </kbd>
            <span>Mute Audio</span>
          </div>

          <div className="flex items-center space-x-2">
            <span>Engine: Live PCM + automatic language detection ↔ Gemini Live (Voice: {settings.voiceName})</span>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        mode={mode}
        direction={direction}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={updateSettings}
        onUpdateMode={handleSelectMode}
        onUpdateDirection={handleSelectDirection}
      />

      {/* User Guide Modal */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
      />

      {/* Microphone Permission Required Modal */}
      <MicrophonePermissionModal
        isOpen={isMicPermissionDenied}
        onTryAgain={() => {
          setIsMicPermissionDenied(false);
          startTranslation();
        }}
        onDismiss={() => setIsMicPermissionDenied(false)}
      />
    </div>
  );
}
