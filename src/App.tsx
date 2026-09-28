/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppSettings,
  ConnectionState,
  DirectionMode,
  TranscriptItem,
  TranslationMode,
} from './types/translation';
import { CRMCallRecord, DEFAULT_CRM_RECORD } from './types/crm';
import { AudioCaptureEngine } from './services/audioCapture';
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

const DEFAULT_SETTINGS: AppSettings = {
  voiceName: 'Fenrir',
  noiseSuppression: true,
  autoPlayTranslation: true,
  showOriginalTranscript: true,
  showTranslationTranscript: true,
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
        if (lang === 'en' || lang === 'es') {
          setInterimLang(lang);
        }
      },
      onInputTranscript: (text, finished, lang) => {
        setInterimOriginal((prev) => {
          const combined = finished ? (prev ? `${prev} ${text}` : text) : text;
          return combined;
        });
        if (lang === 'en' || lang === 'es') {
          setInterimLang(lang);
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
      playbackEngine.close();
    };
  }, [commitTurn, settings.autoPlayTranslation]);

  // Start Translation session
  const startTranslation = async () => {
    if (!clientRef.current || !captureEngineRef.current) return;

    try {
      setIsMicPermissionDenied(false);

      // Start audio capture
      await captureEngineRef.current.start(
        {
          onAudioChunk: (base64Pcm) => {
            if (clientRef.current) {
              clientRef.current.sendAudio(base64Pcm);
            }
          },
          onVolumeChange: (vol) => {
            setVolumeLevel(vol);
          },
          onError: (err) => {
            console.error('Audio capture error:', err);
          },
        },
        { noiseSuppression: settings.noiseSuppression }
      );

      // Connect to Gemini Live
      clientRef.current.connect(mode, direction, settings.voiceName);
    } catch (err: any) {
      console.error('Failed to start translation:', err);
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes('denied')
      ) {
        setIsMicPermissionDenied(true);
      } else {
        setConnectionState('error');
        setStateMessage(err?.message || 'Failed to start microphone or connect.');
      }
    }
  };

  // Stop Translation session
  const stopTranslation = () => {
    if (captureEngineRef.current) {
      captureEngineRef.current.stop();
    }
    if (playbackEngineRef.current) {
      playbackEngineRef.current.flush();
    }
    if (clientRef.current) {
      clientRef.current.stop();
    }
    commitTurn();
    setVolumeLevel(0);
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
            <span>Engine: 16-bit PCM streaming ↔ Gemini 3.8 Live (Voice: {settings.voiceName})</span>
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
