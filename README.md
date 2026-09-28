# Linqua - Real-Time Spanish ↔ English Speech-to-Speech Translator

Linqua is an ultra-low-latency bidirectional Spanish ↔ English voice translation application engineered for live phone calls, video conferences (Zoom/Meet/Teams), and face-to-face conversations.

---

## Architecture Overview

```
User / Prospect Microphone
            ↓
Browser Native Audio API (16kHz mono, 16-bit signed PCM)
            ↓
Streaming WebSocket (/api/live)
            ↓
Linqua Backend Gateway (Node.js/Express)
            ↓
Google Gemini 3.8 Live API (Bilingual Speech-to-Speech Session)
            ↓
24kHz Gapless PCM Audio Stream + Live Transcripts
            ↓
Continuous Audio Output (Natural Male Voice: Fenrir) + Conversation History
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Google Gemini API Key**: [Get API Key from Google AI Studio](https://aistudio.google.com/)

---

## Local Development Setup

1. **Clone repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/linqua.git
   cd linqua
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   PORT=3000
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in Google Chrome, Edge, or Brave.

---

## GitHub & Render Deployment Guide

### Why Render Web Service (Instead of Static Site Only)

Linqua uses **real-time bidirectional audio streaming via WebSockets** (`ws://` / `wss://`) and server-side secret handling so your `GEMINI_API_KEY` is **never exposed** in client-side JavaScript. 

A purely static site (e.g. GitHub Pages or Render Static Site alone) cannot host WebSocket servers or proxy live audio streams to Gemini without exposing private API keys.

Linqua provides a **unified full-stack architecture** where:
- In production, `npm start` serves both the static Vite frontend (`/dist`) AND the real-time WebSocket translation gateway on the same origin and port.

### Step-by-Step Render Deployment

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Linqua real-time translator"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/linqua.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Log in to [Render Dashboard](https://dashboard.render.com/).
   - Click **New +** → **Web Service**.
   - Connect your GitHub repository `linqua`.
   - Set the following settings:
     - **Name**: `linqua-translator`
     - **Runtime**: `Node`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Plan**: `Free` or `Starter` (Starter recommended for persistent WebSocket connections)

3. **Add Environment Variables in Render**:
   - In your Render Web Service settings, go to **Environment**:
     - `NODE_ENV`: `production`
     - `GEMINI_API_KEY`: *(Paste your Google Gemini API key)*
     - `PORT`: `10000` (Render's default)

4. **Launch**:
   - Click **Deploy Web Service**.
   - Render will build the Vite assets, launch `server.ts`, and provide an HTTPS URL (e.g., `https://linqua-translator.onrender.com`).
   - WebSockets automatically upgrade over `wss://`.

---

## Operating Modes

### 1. One-Way Mode
- **Goal**: Listen to a Spanish speaker and hear continuous English speech (or speak English and have Spanish played).
- **Behavior**: No button presses needed per sentence. Continuous stream.

### 2. Two-Way Mode (CRM & Live Conversation)
- **Goal**: Dynamic bilingual sales calls and meetings.
- **Direction Options**:
  - `AUTO`: Automatic language detection and reciprocal translation.
  - `Spanish → English`: Strict listening turn.
  - `English → Spanish`: Strict speaking turn.
- **CRM Integration**: Record lead details, track deal value, and click **Append Call Transcript** to log dialogue into notes.

---

## Keyboard Shortcuts

- `Space`: Start / Stop translation
- `M`: Toggle microphone mute
- `A`: Toggle translated speaker audio mute

---

## License

Apache-2.0
