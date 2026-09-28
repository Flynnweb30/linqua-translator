# Linqua — Real-Time Spanish ↔ English CRM Translator

Developer: **Flynn J.P.**

Linqua is a browser-based real-time Spanish ↔ English speech translator for CRM calling workflows. It uses live browser audio capture, Web Audio processing, a secure server-side Gemini Live connection, automatic language identification, and live translated audio.

## Important platform boundary

A normal web page **cannot register a new Windows/macOS system microphone device**. Linqua therefore does not fake a system device.

The application creates a real, processed browser `MediaStream` for the user's microphone and identifies that stream in the UI as **Linqua Translator**. This stream can be consumed by WebRTC-compatible application code, but a CRM that only exposes OS microphone devices cannot select it directly.

For a true CRM-selectable microphone path, install a virtual-audio driver/mixer on the operating system. Linqua can route its processed browser stream to an authorized audio-output endpoint; the CRM then selects the driver's corresponding recording endpoint. The browser itself still does not create or rename that OS device.

## Audio workflow

```text
User microphone
    ↓
getUserMedia() + browser echo cancellation/noise suppression
    ↓
Web Audio high-pass / low-pass / dynamics conditioning
    ├──→ Browser-local processed MediaStream ("Linqua Translator")
    └──→ microphone level monitor

CRM call tab
    ↓
Chrome/Edge explicit tab-audio capture
    ↓
Web Audio conditioning
    ↓
16 kHz mono PCM
    ↓
Secure WebSocket /api/live
    ↓
Gemini Live API
    ├──→ automatic English/Spanish input transcription
    ├──→ translated live transcript
    └──→ 24 kHz translated audio
```

### Why CRM tab capture is used

A normal web page cannot silently read audio from another browser tab. Linqua therefore uses the browser's explicit display/tab-audio sharing flow. Select the CRM calling tab and enable its audio.

For a more automated Chrome CRM workflow, a companion extension using Chrome `tabCapture` can provide controlled tab-audio routing. The extension still cannot manufacture a system microphone; the OS virtual-audio driver provides that device.

## Language detection

Gemini Live input transcription is configured for automatic language detection by leaving the language-code hint list empty. Linqua only changes the live indicator when the live transcription service reports a recognized language:

- **Green — Spanish detected**
- **Red — English detected**
- **Neutral — Unknown / Detecting / unavailable**

No keyword matching, prerecorded samples, random switching, or simulated detection is used.

## Browser microphone processing

The microphone requests browser-supported:

- Echo cancellation
- Noise suppression
- Automatic gain control

Linqua then applies deterministic Web Audio conditioning for stable PCM streaming. The CRM/tab audio path uses high-pass, low-pass, and dynamics conditioning. These are real signal-processing stages; they are not presented as AI noise cancellation.

## Local development

Requirements:

- Node.js 20+ recommended
- Chrome or Edge recommended
- Gemini API key

Install:

```text
npm install
```

Create `.env`:

```text
GEMINI_API_KEY=your_key
PORT=3000
```

Run:

```text
npm run dev
```

Open the HTTPS deployment or local development URL in Chrome/Edge.

## Production deployment

### Render

**Use a Render Web Service, not a Render Static Site, for the full application.**

The translation backend uses a persistent WebSocket endpoint (`/api/live`) and keeps the Gemini API key server-side. A static-only deployment cannot provide that secure WebSocket gateway.

Recommended configuration:

- Service type: **Web Service**
- Runtime: **Node**
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment:
  - `NODE_ENV=production`
  - `GEMINI_API_KEY=<set in Render secret environment variables>`
  - `PORT=10000`
- Publish directory: **not used by the Web Service**
- Health endpoint: `/api/health`

The included `render.yaml` contains the production service configuration.

### Static frontend limitation

The generated `dist/` directory is a valid Vite static frontend and can be hosted separately, but the live translation functionality will not operate against a static host unless it connects to a separately deployed secure WebSocket/API backend.

Do not place `GEMINI_API_KEY` in Vite client environment variables.

## GitHub

Push the project root including:

- `src/`
- `server.ts`
- `package.json`
- `render.yaml`
- `vite.config.ts`
- `tsconfig.json`
- `.env.example`
- `README.md`

Do not commit `.env` or API credentials.

## CRM production architecture

For a CRM that only accepts operating-system microphone devices, use the included browser bridge with an installed virtual-audio driver:

```text
Linqua Web App
    ↓
Processed browser MediaStream
    ↓
HTML audio output sink
    ↓
Virtual-audio driver playback endpoint
    ↓
Virtual-audio driver recording endpoint
    ↓
CRM microphone selector
```

On Windows, VB-AUDIO VB-CABLE or Voicemeeter can provide the operating-system virtual audio endpoints. Linqua does not rename those endpoints; if an exact device name **Linqua Translator** is mandatory, that name must be provided by the native virtual-audio layer.

For incoming CRM audio:

```text
CRM call tab
    ↓
Chrome tabCapture / explicit tab-audio capture
    ↓
Linqua remote-audio processor
    ↓
Gemini Live language detection + translation
    ↓
Translated audio to user's playback device
```

The native helper is required only for the system-microphone injection portion. The web app deliberately reports the browser-local stream as a browser stream rather than falsely claiming it is an OS microphone.

## Reliability

The implementation includes:

- microphone permission handling
- input-device enumeration and selection
- microphone disconnect handling
- CRM capture cancellation/termination handling
- network offline state
- WebSocket reconnect logic
- audio-engine cleanup
- duplicate capture prevention
- translation-session cleanup
- browser capability checks
- neutral language state when detection is unavailable
- responsive desktop/mobile UI

## Shortcuts

- `Space` — Start/Stop
- `M` — Mute microphone processing
- `A` — Mute translated playback

## License

Apache-2.0
