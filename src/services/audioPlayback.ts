/**
 * Audio playback engine for 24kHz 16-bit PCM translated audio from Gemini Live.
 * Implements gapless sequential scheduling, interruption flushing, and volume/mute control.
 */

export class AudioPlaybackEngine {
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isMuted = false;
  private autoPlay = true;

  private initContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.audioCtx = new AudioContextClass({
        sampleRate: 24000,
        latencyHint: 'interactive',
      });

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : 1, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  setAutoPlay(enabled: boolean) {
    this.autoPlay = enabled;
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(mute ? 0 : 1, this.audioCtx.currentTime);
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Enqueues a base64 encoded 24kHz 16-bit signed PCM audio chunk.
   */
  enqueueChunk(base64Pcm: string): void {
    if (!this.autoPlay || this.isMuted) return;

    try {
      this.initContext();
      if (!this.audioCtx || !this.gainNode) return;

      const binary = atob(base64Pcm);
      const byteLen = binary.length;
      const bytes = new Uint8Array(byteLen);
      for (let i = 0; i < byteLen; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Convert 16-bit PCM to Float32 [-1.0, 1.0]
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] < 0 ? int16[i] / 32768 : int16[i] / 32767;
      }

      const buffer = this.audioCtx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);

      const now = this.audioCtx.currentTime;
      // Schedule gapless: if nextStartTime is behind now, schedule immediately with slight buffer
      if (this.nextStartTime < now) {
        this.nextStartTime = now + 0.015;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;

      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
      };
    } catch (err) {
      console.error('Failed to enqueue audio chunk for playback:', err);
    }
  }

  /**
   * Flushes all currently scheduled or playing audio.
   * Call when user interrupts (barge-in) or presses Stop/Reconnect.
   */
  flush(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source may already have ended
      }
    }
    this.activeSources.clear();

    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
  }

  close(): void {
    this.flush();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // Ignored
      }
      this.audioCtx = null;
    }
  }
}
