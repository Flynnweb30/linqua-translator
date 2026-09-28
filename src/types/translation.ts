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
export type DetectedLanguage = 'es' | 'en' | 'unknown';

export interface TranscriptItem {
  id: string;
  timestamp: number;
  speakerLanguage: 'es' | 'en' | 'auto';
  originalText: string;
  translatedText: string;
  isInterimOriginal?: boolean;
  isInterimTranslation?: boolean;
}

export interface AppSettings {
  voiceName: string;
  noiseSuppression: boolean;
  autoPlayTranslation: boolean;
  showOriginalTranscript: boolean;
  showTranslationTranscript: boolean;
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
    | 'pong'
    | 'language_detected';
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
