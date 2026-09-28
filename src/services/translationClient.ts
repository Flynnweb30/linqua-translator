import {
  ConnectionState,
  DirectionMode,
  ServerMessage,
  TranslationMode,
} from '../types/translation';

export interface TranslationClientCallbacks {
  onStateChange: (state: ConnectionState, message?: string) => void;
  onAudioData: (base64Pcm: string) => void;
  onInterimInput: (text: string, lang?: string) => void;
  onInputTranscript: (text: string, finished: boolean, lang?: string) => void;
  onOutputTranscript: (text: string, finished: boolean, lang?: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onError: (errMessage: string) => void;
}

export class TranslationClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'idle';
  private callbacks: TranslationClientCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private isIntentionalStop = false;

  private currentMode: TranslationMode = 'one-way';
  private currentDirection: DirectionMode = 'es-to-en';
  private currentVoice = 'Fenrir';

  constructor(callbacks: TranslationClientCallbacks) {
    this.callbacks = callbacks;
  }

  getState(): ConnectionState {
    return this.state;
  }

  private setState(newState: ConnectionState, msg?: string) {
    this.state = newState;
    this.callbacks.onStateChange(newState, msg);
  }

  connect(
    mode: TranslationMode = 'one-way',
    direction: DirectionMode = 'es-to-en',
    voiceName = 'Fenrir'
  ) {
    if (this.state === 'connecting' || this.state === 'connected' || this.state === 'listening') {
      return;
    }

    this.currentMode = mode;
    this.currentDirection = direction;
    this.currentVoice = voiceName;
    this.isIntentionalStop = false;

    this.clearReconnectTimer();
    this.setState('connecting', 'Establishing secure translation channel...');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        // Send init message
        this.send({
          type: 'init',
          mode: this.currentMode,
          direction: this.currentDirection,
          voiceName: this.currentVoice,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (err) {
          console.error('Error parsing incoming WS message:', err);
        }
      };

      this.ws.onerror = (_e) => {
        if (!this.isIntentionalStop) {
          this.setState('error', 'Network or translation connection error.');
        }
      };

      this.ws.onclose = (e) => {
        this.ws = null;
        if (!this.isIntentionalStop) {
          this.handleUnexpectedClose(e.reason || 'Connection lost');
        } else {
          this.setState('idle', 'Translation stopped');
        }
      };
    } catch (err: any) {
      this.setState('error', err?.message || 'Could not connect to translation server.');
    }
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'session_connecting':
        this.setState('connecting', 'Connecting to Gemini Live Translation...');
        break;

      case 'session_ready':
        this.setState('listening', 'Listening for speech...');
        break;

      case 'audio':
        if (msg.pcm) {
          this.setState('translating', 'Translating audio live...');
          this.callbacks.onAudioData(msg.pcm);
        }
        break;

      case 'interim_input':
        if (msg.text) {
          this.callbacks.onInterimInput(msg.text, msg.lang);
        }
        break;

      case 'input_transcript':
        if (msg.text) {
          this.callbacks.onInputTranscript(msg.text, Boolean(msg.finished), msg.lang);
        }
        break;

      case 'output_transcript':
        if (msg.text) {
          this.callbacks.onOutputTranscript(msg.text, Boolean(msg.finished), msg.lang);
        }
        break;

      case 'interrupted':
        this.callbacks.onInterrupted();
        this.setState('listening', 'User interrupted; listening...');
        break;

      case 'turn_complete':
        this.callbacks.onTurnComplete();
        this.setState('listening', 'Listening for speech...');
        break;

      case 'error':
        this.callbacks.onError(msg.message || 'Gemini error');
        this.setState('error', msg.message || 'Gemini error');
        break;

      case 'stopped':
        this.setState('idle', 'Stopped');
        break;

      default:
        break;
    }
  }

  private handleUnexpectedClose(reason: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
      this.setState(
        'reconnecting',
        `Connection unstable — reconnecting in ${(delay / 1000).toFixed(1)}s (Attempt ${
          this.reconnectAttempts
        }/${this.maxReconnectAttempts})...`
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect(this.currentMode, this.currentDirection, this.currentVoice);
      }, delay);
    } else {
      this.setState(
        'error',
        `Connection lost: ${reason}. Please click Reconnect to resume translation.`
      );
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  sendAudio(base64Pcm: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'audio',
        pcm: base64Pcm,
      });
    }
  }

  switchDirection(direction: DirectionMode) {
    this.currentDirection = direction;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'switch_direction',
        direction,
        mode: this.currentMode,
      });
    }
  }

  switchMode(mode: TranslationMode) {
    this.currentMode = mode;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'switch_direction',
        direction: this.currentDirection,
        mode,
      });
    }
  }

  stop() {
    this.isIntentionalStop = true;
    this.clearReconnectTimer();

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'stop' });
      }
      this.ws.close();
      this.ws = null;
    }

    this.setState('idle', 'Ready to translate');
  }

  reconnect() {
    this.stop();
    this.reconnectAttempts = 0;
    setTimeout(() => {
      this.connect(this.currentMode, this.currentDirection, this.currentVoice);
    }, 200);
  }

  private send(payload: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
}
