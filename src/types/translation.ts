export type LanguageDetectionState = 'unknown' | 'detecting' | 'spanish' | 'english' | 'offline';

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'translating'
  | 'reconnecting'
  | 'stopping'
  | 'offline'
  | 'error';

export type TranslationMode = 'one-way' | 'two-way';

export type DirectionMode = 'es-to-en' | 'en-to-es' | 'auto';

export interface TranscriptItem {
  id: string;
  timestamp: number;
  speakerLanguage: 'es' | 'en' | 'auto';
  originalText: string;
  translatedText: string;
  isInterimOriginal?: boolean;
  isInterimTranslation?: boolean;
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
}

export interface AudioRuntimeStatus {
  microphonePermission: 'unknown' | 'prompt' | 'granted' | 'denied';
  selectedDeviceId: string;
  selectedDeviceLabel: string;
  virtualMicrophone: 'unavailable' | 'browser-stream' | 'system-device';
  crmAudio: 'unavailable' | 'requesting' | 'connected' | 'ended';
  processing: 'idle' | 'processing' | 'unsupported';
}

export interface AppSettings {
  voiceName: string;
  noiseSuppression: boolean;
  autoPlayTranslation: boolean;
  showOriginalTranscript: boolean;
  showTranslationTranscript: boolean;
  preferredInputDeviceId: string;
}

export interface ServerMessage {
  type:
    | 'session_connecting'
    | 'session_ready'
    | 'session_closed'
    | 'audio'
    | 'output_text'
    | 'interim_input'
    | 'input_transcript'
    | 'output_transcript'
    | 'interrupted'
    | 'turn_complete'
    | 'error'
    | 'stopped'
    | 'pong';
  mode?: TranslationMode;
  direction?: DirectionMode;
  pcm?: string;
  text?: string;
  finished?: boolean;
  lang?: string;
  message?: string;
  reason?: string;
  code?: number;
  timestamp?: number;
}
