# Linqua — Real-Time Spanish ↔ English Translator

**Developer:** Flynn J.P.

Linqua is a browser-based real-time Spanish ↔ English speech-to-speech translator designed for CRM calling and live conversations. The implementation uses genuine browser audio capture, Web Audio processing, Gemini Live transcription/language detection, and a server-side WebSocket gateway.

## Important browser/OS limitation

A normal website **cannot create or register a true system-wide microphone device** that appears in Chrome's microphone picker as a physical/virtual OS microphone.

This project therefore does **not** fake that capability.

After microphone permission is granted, Linqua creates a real processed `MediaStream` through Web Audio and labels the workflow **Linqua Translator** in the UI. That stream can be consumed by browser APIs that accept a `MediaStream`, but it cannot be selected as a microphone by an unrelated CRM website.

For a CRM that requires a system microphone device named **Linqua Translator**, use:

1. Linqua browser app for processing/detection.
2. A native audio-routing helper.
3. An OS-level virtual audio device/driver.
4. Route the processed Linqua stream from the helper into the virtual microphone.
5. Select that OS device inside the CRM.

Do not rely on an extension alone to manufacture an OS microphone. Chrome extensions can add browser capabilities such as tab/audio capture, but OS-level microphone registration still requires an appropriate native audio-routing layer.

## Live audio workflow

```text
Selected/default microphone
        ↓
Browser permission
        ↓
Web Audio processing
  • echo cancellation
  • browser noise suppression
  • high-pass filtering
  • low-pass filtering
  • dynamics compression
        ↓
Real processed MediaStream
        ↓
"Linqua Translator" browser audio stream
        ↓
16 kHz mono PCM
        ↓
WebSocket /api/live
        ↓
Gemini 3.8 Live
        ↓
Live input transcription + language code
        ↓
English / Spanish indicator
        ↓
Translated audio + transcript
```

### CRM/remote-speaker audio

Chrome can provide selected tab audio through `getDisplayMedia()` when the user explicitly chooses a tab/window and enables audio sharing.

Linqua includes a **Capture CRM tab audio** workflow. It does not silently capture another website.

When CRM tab audio is active, the captured tab audio becomes the translation/detection input. The microphone continues to be processed independently so the browser-side Linqua Translator stream remains available.

## Language detection

The language indicator uses the language information returned by the live speech-recognition/transcription engine.

- **Green:** Spanish detected.
- **Red:** English detected.
- **Neutral:** no reliable speech/language result, silence, unavailable input, permission failure, or disconnected capture.

The application does not use keyword guessing, prerecorded audio, simulated speech, or arbitrary language switching.

## Local development

Requirements:

- Node.js 20+ recommended.
- Google Gemini API key.
- Chrome/Edge/another modern browser with microphone support.

Create `.env`:

```env
GEMINI_API_KEY=your_key_here
PORT=3000
NODE_ENV=development
```

Install and run:

```text
npm install
npm run dev
```

The development server serves the Vite application and `/api/live` WebSocket endpoint from the same origin.

## Production / Render

### Use Render Web Service — not Render Static Site

The application requires:

- Node/Express server.
- WebSocket endpoint `/api/live`.
- Server-side Gemini API authentication.

A pure Render Static Site cannot provide that server-side WebSocket gateway or securely hold the Gemini API key.

Use **New → Web Service** with:

- Runtime: Node
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Environment variables:

```text
NODE_ENV=production
GEMINI_API_KEY=<your private Gemini API key>
PORT=10000
```

`GEMINI_API_KEY` must be configured in Render's environment settings and must never be committed to GitHub.

The included `render.yaml` contains the deployment definition.

## GitHub

Upload the project root as the repository root. Do not commit:

- `.env`
- API keys
- local build output
- `node_modules`

`.gitignore` is included.

## Production checks

Before deployment, verify:

1. `npm install`
2. `npm run lint`
3. `npm run build`
4. `npm start`
5. Open `/api/health`
6. Grant microphone permission.
7. Confirm the selected microphone appears.
8. Start translation.
9. Confirm the processed browser stream becomes available.
10. Speak Spanish and verify the green language state.
11. Speak English and verify the red language state.
12. Stop speaking and verify the state can return to neutral.
13. Test CRM tab-audio capture from a user gesture.
14. Disconnect/reconnect the microphone.
15. Test the app with temporary network loss.
16. Confirm existing CRM, transcript, settings, playback, reconnect, and mute controls remain usable.

## Deployment architecture

The production topology is intentionally:

```text
Browser
  ├── Microphone → Web Audio → processed MediaStream
  ├── Optional CRM tab audio → Web Audio
  └── WebSocket over HTTPS/WSS
                  ↓
           Render Web Service
                  ↓
            Gemini Live API
```

This preserves the Gemini API key on the server and avoids exposing private credentials in the browser.

## Native virtual-microphone architecture

For a true CRM-selectable microphone named **Linqua Translator**, the recommended production architecture is:

```text
Linqua Web App
      ↓
Processed browser MediaStream
      ↓
Native bridge / WebRTC or local IPC transport
      ↓
OS virtual audio input
      ↓
"Linqua Translator" microphone device
      ↓
CRM browser dialer
```

The exact native bridge depends on the target operating system and CRM. The web application must not claim that this OS device exists until the native audio layer has actually installed and exposed it.

## Security

- Never place `GEMINI_API_KEY` in client-side source.
- Use HTTPS/WSS in production.
- Microphone and tab capture always require browser permission.
- Tab capture is explicit and user initiated.
- No hidden microphone capture is attempted.

## License

Apache-2.0
