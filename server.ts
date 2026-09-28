import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();
const server = http.createServer(app);

// Use WebSocketServer with distinct path
const wss = new WebSocketServer({ server, path: '/api/live' });

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json());

// API health and configuration check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey && apiKey.length > 5),
    model: 'gemini-3.8-live',
    timestamp: new Date().toISOString(),
  });
});

interface SessionOptions {
  mode: 'one-way' | 'two-way';
  direction: 'es-to-en' | 'en-to-es' | 'auto';
  voiceName?: string;
}

function normalizeLanguageCode(languageCode?: string): 'es' | 'en' | undefined {
  if (!languageCode) return undefined;
  const code = languageCode.toLowerCase();
  if (code === 'es' || code.startsWith('es-')) return 'es';
  if (code === 'en' || code.startsWith('en-')) return 'en';
  return undefined;
}

function buildSystemInstruction(opts: SessionOptions): string {
  const baseRules = `You are Linqua, an ultra-low-latency real-time voice interpreter for phone calls, video meetings, and face-to-face business conversations.
CRITICAL TRANSLATION RULES:
1. Translate immediately, naturally, and faithfully between Spanish and English.
2. NEVER act as a conversational chatbot, virtual assistant, or co-host.
3. NEVER reply to questions, offer unsolicited advice, or add conversational fillers (do not say "Sure!", "Here is the translation:", "I understand", "Translation:", etc.).
4. ONLY speak the exact translated words of what was heard.
5. PRESERVE ACCURACY: Keep all proper names, company names, brands, numbers, monetary amounts/prices, dates, times, phone numbers, addresses, sales details, and industry terminology 100% faithful without alteration.
6. Do NOT invent or hallucinate information that the speaker did not say.
7. Tone: Natural, fluent spoken language suitable for live telephone audio.`;

  if (opts.mode === 'one-way') {
    if (opts.direction === 'en-to-es') {
      return `${baseRules}
MODE: ONE-WAY (English Speaker -> Spanish Translation)
The user is speaking English. Your ONLY duty is to listen to English and immediately speak the natural, faithful Spanish translation.`;
    }
    return `${baseRules}
MODE: ONE-WAY (Spanish Speaker -> English Translation)
The speaker is speaking Spanish. Your ONLY duty is to listen to Spanish and immediately speak the natural, faithful English translation.`;
  }

  // Two-way mode
  if (opts.direction === 'es-to-en') {
    return `${baseRules}
MODE: TWO-WAY (Current Turn: Spanish -> English)
Listen to Spanish speech and immediately speak the natural, faithful English translation.`;
  } else if (opts.direction === 'en-to-es') {
    return `${baseRules}
MODE: TWO-WAY (Current Turn: English -> Spanish)
Listen to English speech and immediately speak the natural, faithful Spanish translation.`;
  } else {
    return `${baseRules}
MODE: TWO-WAY BILINGUAL INTERPRETER (Automatic Detection)
This is an active conversation between an English speaker and a Spanish speaker.
- If you hear SPANISH speech: immediately speak the natural, faithful ENGLISH translation.
- If you hear ENGLISH speech: immediately speak the natural, faithful SPANISH translation.
- Never output the original language back. Always output the other language.`;
  }
}

wss.on('connection', (clientWs: WebSocket) => {
  let geminiSession: any = null;
  let isClosing = false;
  let currentOptions: SessionOptions = {
    mode: 'one-way',
    direction: 'es-to-en',
    voiceName: 'Fenrir',
  };

  const safeSend = (payload: object) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(JSON.stringify(payload));
      } catch (err) {
        console.error('Failed to send message to client:', err);
      }
    }
  };

  const closeGeminiSession = async () => {
    if (geminiSession) {
      try {
        const s = geminiSession;
        geminiSession = null;
        await s.close();
      } catch (e) {
        // Ignore session close error
      }
    }
  };

  const initGemini = async (opts: SessionOptions) => {
    await closeGeminiSession();
    currentOptions = opts;

    if (!apiKey) {
      safeSend({
        type: 'error',
        message: 'GEMINI_API_KEY is not configured in the server environment.',
      });
      return;
    }

    try {
      safeSend({ type: 'session_connecting' });
      const systemInstruction = buildSystemInstruction(opts);
      const voice = opts.voiceName || 'Fenrir';

      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: ['AUDIO' as any],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
          systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            safeSend({
              type: 'session_ready',
              mode: opts.mode,
              direction: opts.direction,
            });
          },
          onclose: (e: any) => {
            if (!isClosing) {
              safeSend({
                type: 'session_closed',
                code: e?.code,
                reason: e?.reason || 'Connection closed by remote service',
              });
            }
          },
          onerror: (err: any) => {
            console.error('Gemini Live session error:', err);
            safeSend({
              type: 'error',
              message: err?.message || 'Error occurred in Gemini Live stream',
            });
          },
          onmessage: (msg: any) => {
            const serverContent = msg.serverContent;
            if (!serverContent) {
              return;
            }

            // Audio parts from modelTurn
            if (serverContent.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  safeSend({
                    type: 'audio',
                    pcm: part.inlineData.data,
                  });
                }
                if (part.text) {
                  safeSend({
                    type: 'output_text',
                    text: part.text,
                  });
                }
              }
            }

            // Interruption (barge-in detected by Gemini Live)
            if (serverContent.interrupted) {
              safeSend({ type: 'interrupted' });
            }

            // Interim live transcription (while user speaks)
            if (serverContent.interimInputTranscription?.text) {
              const languageCode = normalizeLanguageCode(serverContent.interimInputTranscription.languageCode);
              safeSend({
                type: 'interim_input',
                text: serverContent.interimInputTranscription.text,
                lang: languageCode,
              });
              if (languageCode) {
                safeSend({ type: 'language_detected', lang: languageCode });
              }
            }

            // Final / segment input transcription
            if (serverContent.inputTranscription?.text) {
              const languageCode = normalizeLanguageCode(serverContent.inputTranscription.languageCode);
              safeSend({
                type: 'input_transcript',
                text: serverContent.inputTranscription.text,
                finished: Boolean(serverContent.inputTranscription.finished),
                lang: languageCode,
              });
              if (languageCode) {
                safeSend({ type: 'language_detected', lang: languageCode });
              }
            }

            // Output transcription (the spoken translation text)
            if (serverContent.outputTranscription?.text) {
              safeSend({
                type: 'output_transcript',
                text: serverContent.outputTranscription.text,
                finished: Boolean(serverContent.outputTranscription.finished),
                lang: serverContent.outputTranscription.languageCode,
              });
            }

            // Turn complete signal
            if (serverContent.turnComplete) {
              safeSend({ type: 'turn_complete' });
            }
          },
        },
      });

      geminiSession = session;
    } catch (err: any) {
      console.error('Failed to connect to Gemini Live API:', err);
      safeSend({
        type: 'error',
        message: err?.message || 'Unable to establish Gemini Live translation session.',
      });
    }
  };

  clientWs.on('message', async (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'init': {
          await initGemini({
            mode: msg.mode || 'one-way',
            direction: msg.direction || 'es-to-en',
            voiceName: msg.voiceName || 'Zephyr',
          });
          break;
        }

        case 'switch_direction': {
          if (geminiSession) {
            await initGemini({
              ...currentOptions,
              direction: msg.direction,
              mode: msg.mode || currentOptions.mode,
            });
          }
          break;
        }

        case 'audio': {
          if (geminiSession && msg.pcm) {
            geminiSession.sendRealtimeInput({
              audio: {
                data: msg.pcm,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          }
          break;
        }

        case 'stop': {
          await closeGeminiSession();
          safeSend({ type: 'stopped' });
          break;
        }

        case 'ping': {
          safeSend({ type: 'pong', timestamp: Date.now() });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling client message:', err);
    }
  });

  clientWs.on('close', async () => {
    isClosing = true;
    await closeGeminiSession();
  });

  clientWs.on('error', async (err) => {
    console.error('Client WebSocket error:', err);
    isClosing = true;
    await closeGeminiSession();
  });
});

// Configure Vite integration for dev, static serving for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`LiveVoice Translation Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
