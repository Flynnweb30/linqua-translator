/**
 * Audio capture engine using Web Audio API and MediaStream.
 * Captures microphone audio, resamples to 16kHz mono, and encodes to 16-bit PCM.
 */

export interface AudioCaptureCallbacks {
  onAudioChunk: (base64Pcm: string) => void;
  onVolumeChange?: (level: number) => void;
  onError?: (err: Error) => void;
}

export class AudioCaptureEngine {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isMuted = false;
  private isCapturing = false;
  private animFrameId: number | null = null;

  async start(
    callbacks: AudioCaptureCallbacks,
    options: { noiseSuppression?: boolean } = {}
  ): Promise<void> {
    if (this.isCapturing) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: true,
        },
        video: false,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      // Try requesting 16000Hz, browser will set actual sampleRate
      this.audioCtx = new AudioContextClass({
        sampleRate: 16000,
        latencyHint: 'interactive',
      });

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

      // Volume analyser for live microphone level UI
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.3;
      this.sourceNode.connect(this.analyserNode);

      // ScriptProcessor with 2048 buffer size = 128ms at 16kHz for fast streaming
      this.processorNode = this.audioCtx.createScriptProcessor(2048, 1, 1);
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioCtx.destination);

      const sampleRate = this.audioCtx.sampleRate;

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isCapturing || this.isMuted) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        const base64Pcm = this.resampleAndEncodeTo16kPCM(inputChannelData, sampleRate);
        if (base64Pcm) {
          callbacks.onAudioChunk(base64Pcm);
        }
      };

      // Poll volume level for reactive UI
      if (callbacks.onVolumeChange) {
        const updateVolume = () => {
          if (!this.isCapturing || !this.analyserNode) return;
          const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
          this.analyserNode.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1, avg / 128);
          callbacks.onVolumeChange?.(this.isMuted ? 0 : normalized);

          this.animFrameId = requestAnimationFrame(updateVolume);
        };
        this.animFrameId = requestAnimationFrame(updateVolume);
      }

      this.isCapturing = true;
    } catch (err: unknown) {
      this.stop();
      throw err;
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  isActive(): boolean {
    return this.isCapturing;
  }

  stop() {
    this.isCapturing = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      try {
        this.processorNode.disconnect();
      } catch {
        // Ignored
      }
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Ignored
      }
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch {
        // Ignored
      }
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // Ignored
      }
      this.audioCtx = null;
    }
  }

  /**
   * Resamples Float32 audio to 16kHz mono and converts to signed 16-bit PCM (little endian) in base64.
   */
  private resampleAndEncodeTo16kPCM(inputData: Float32Array, inputSampleRate: number): string {
    let pcm16: Int16Array;

    if (inputSampleRate === 16000) {
      pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
    } else {
      const ratio = inputSampleRate / 16000;
      const targetLength = Math.floor(inputData.length / ratio);
      pcm16 = new Int16Array(targetLength);

      for (let i = 0; i < targetLength; i++) {
        const srcIndex = i * ratio;
        const index = Math.floor(srcIndex);
        const nextIndex = Math.min(index + 1, inputData.length - 1);
        const frac = srcIndex - index;
        const interpolated = inputData[index] * (1 - frac) + inputData[nextIndex] * frac;
        const s = Math.max(-1, Math.min(1, interpolated));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
    }

    const uint8 = new Uint8Array(pcm16.buffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  }
}
