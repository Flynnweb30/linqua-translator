/**
 * Central live-audio engine for Linqua.
 *
 * Important browser limitation:
 * - The processed output is a real MediaStream produced by Web Audio.
 * - A normal website cannot register that stream as a system-wide microphone device.
 * - A CRM can use it only if the CRM/browser integration accepts a MediaStream directly.
 * - A system-level "Linqua Translator" microphone requires a native audio driver/helper.
 */
export interface AudioCaptureCallbacks {
  onAudioChunk: (base64Pcm: string) => void;
  onVolumeChange?: (level: number) => void;
  onError?: (err: Error) => void;
  onStatus?: (status: AudioEngineStatus) => void;
}

export type AudioEngineStatus =
  | 'idle'
  | 'requesting-permission'
  | 'ready'
  | 'capturing'
  | 'device-disconnected'
  | 'unsupported'
  | 'error';

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
}

type AudioContextWithSink = AudioContext & {
  setSinkId?: (sinkId: string) => Promise<void>;
};

export class AudioCaptureEngine {
  protected mediaStream: MediaStream | null = null;
  protected processedStream: MediaStream | null = null;
  protected audioCtx: AudioContextWithSink | null = null;
  protected sourceNode: MediaStreamAudioSourceNode | null = null;
  protected processingNode: GainNode | null = null;
  protected highPassNode: BiquadFilterNode | null = null;
  protected lowPassNode: BiquadFilterNode | null = null;
  protected compressorNode: DynamicsCompressorNode | null = null;
  protected analyserNode: AnalyserNode | null = null;
  protected destinationNode: MediaStreamAudioDestinationNode | null = null;
  protected processorNode: ScriptProcessorNode | null = null;
  protected monitorGainNode: GainNode | null = null;
  protected isMuted = false;
  protected isCapturing = false;
  protected animFrameId: number | null = null;
  private deviceChangeHandler: (() => void) | null = null;
  protected selectedDeviceId = 'default';
  private status: AudioEngineStatus = 'idle';

  async listInputDevices(): Promise<AudioDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, index) => ({
        deviceId: d.deviceId || `audioinput-${index}`,
        label: d.label || `Microphone ${index + 1}`,
      }));
  }

  getSelectedDeviceId(): string {
    return this.selectedDeviceId;
  }

  getStatus(): AudioEngineStatus {
    return this.status;
  }

  getProcessedStream(): MediaStream | null {
    return this.processedStream;
  }

  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  isActive(): boolean {
    return this.isCapturing;
  }

  async start(
    callbacks: AudioCaptureCallbacks,
    options: {
      noiseSuppression?: boolean;
      deviceId?: string;
    } = {},
  ): Promise<void> {
    if (this.isCapturing) return;
    this.setStatus('requesting-permission', callbacks);

    if (!navigator.mediaDevices?.getUserMedia) {
      this.setStatus('unsupported', callbacks);
      throw new Error('This browser does not support microphone capture.');
    }

    try {
      const deviceId = options.deviceId && options.deviceId !== 'default'
        ? { exact: options.deviceId }
        : undefined;

      const constraints: MediaStreamConstraints = {
        audio: {
          ...(deviceId ? { deviceId } : {}),
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: true,
        },
        video: false,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = this.mediaStream.getAudioTracks()[0];
      if (!track) throw new Error('No usable microphone audio track was returned.');

      this.selectedDeviceId = track.getSettings().deviceId || options.deviceId || 'default';

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' }) as AudioContextWithSink;
      if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.highPassNode = this.audioCtx.createBiquadFilter();
      this.highPassNode.type = 'highpass';
      this.highPassNode.frequency.value = 70;
      this.lowPassNode = this.audioCtx.createBiquadFilter();
      this.lowPassNode.type = 'lowpass';
      this.lowPassNode.frequency.value = 11500;

      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -30;
      this.compressorNode.knee.value = 20;
      this.compressorNode.ratio.value = 4;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.12;

      this.processingNode = this.audioCtx.createGain();
      this.processingNode.gain.value = 1;

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.25;

      // This is the browser-side "virtual microphone" stream.
      this.destinationNode = this.audioCtx.createMediaStreamDestination();

      this.sourceNode
        .connect(this.highPassNode)
        .connect(this.lowPassNode)
        .connect(this.compressorNode)
        .connect(this.processingNode)
        .connect(this.analyserNode);

      this.processingNode.connect(this.destinationNode);

      // ScriptProcessor is retained for broad browser compatibility.
      // The processed signal is used, not the raw microphone signal.
      this.processorNode = this.audioCtx.createScriptProcessor(2048, 1, 1);
      this.monitorGainNode = this.audioCtx.createGain();
      this.monitorGainNode.gain.value = 0;
      this.processingNode.connect(this.processorNode);
      // Keep ScriptProcessor alive without monitoring the microphone through speakers.
      this.processorNode.connect(this.monitorGainNode).connect(this.audioCtx.destination);

      const sampleRate = this.audioCtx.sampleRate;
      this.processorNode.onaudioprocess = (event) => {
        if (!this.isCapturing || this.isMuted) return;
        const input = event.inputBuffer.getChannelData(0);
        const pcm = this.resampleAndEncodeTo16kPCM(input, sampleRate);
        if (pcm) callbacks.onAudioChunk(pcm);
      };

      this.processedStream = this.destinationNode.stream;
      this.isCapturing = true;
      this.setStatus('capturing', callbacks);

      const updateVolume = () => {
        if (!this.isCapturing || !this.analyserNode) return;
        const data = new Uint8Array(this.analyserNode.frequencyBinCount);
        this.analyserNode.getByteFrequencyData(data);
        let sum = 0;
        for (const value of data) sum += value;
        const average = data.length ? sum / data.length : 0;
        callbacks.onVolumeChange?.(this.isMuted ? 0 : Math.min(1, average / 128));
        this.animFrameId = requestAnimationFrame(updateVolume);
      };
      this.animFrameId = requestAnimationFrame(updateVolume);

      this.deviceChangeHandler = () => {
        const currentTrack = this.mediaStream?.getAudioTracks()[0];
        if (!currentTrack || currentTrack.readyState === 'ended') {
          this.setStatus('device-disconnected', callbacks);
        }
      };
      navigator.mediaDevices.addEventListener?.('devicechange', this.deviceChangeHandler);
      track.addEventListener('ended', () => this.setStatus('device-disconnected', callbacks));
    } catch (error) {
      this.stop();
      const err = error instanceof Error ? error : new Error(String(error));
      this.setStatus('error', callbacks);
      callbacks.onError?.(err);
      throw err;
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !mute;
      });
    }
  }

  getMuted() {
    return this.isMuted;
  }

  stop() {
    this.isCapturing = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.deviceChangeHandler) {
      navigator.mediaDevices?.removeEventListener?.('devicechange', this.deviceChangeHandler);
      this.deviceChangeHandler = null;
    }

    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      try { this.processorNode.disconnect(); } catch {}
      this.processorNode = null;
    }

    [this.sourceNode, this.processingNode, this.highPassNode, this.lowPassNode,
      this.compressorNode, this.analyserNode, this.destinationNode].forEach((node) => {
      if (node) {
        try { node.disconnect(); } catch {}
      }
    });

    this.sourceNode = null;
    this.processingNode = null;
    this.highPassNode = null;
    this.lowPassNode = null;
    this.compressorNode = null;
    this.analyserNode = null;
    this.destinationNode = null;
    this.monitorGainNode = null;

    this.processedStream?.getTracks().forEach((track) => track.stop());
    this.processedStream = null;

    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try { void this.audioCtx.close(); } catch {}
    }
    this.audioCtx = null;
    this.status = 'idle';
  }

  private setStatus(status: AudioEngineStatus, callbacks?: AudioCaptureCallbacks) {
    this.status = status;
    callbacks?.onStatus?.(status);
  }

  private resampleAndEncodeTo16kPCM(input: Float32Array, inputSampleRate: number): string {
    const targetRate = 16000;
    const ratio = inputSampleRate / targetRate;
    const targetLength = inputSampleRate === targetRate
      ? input.length
      : Math.max(1, Math.floor(input.length / ratio));
    const pcm16 = new Int16Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
      const sourceIndex = inputSampleRate === targetRate ? i : i * ratio;
      const index = Math.min(Math.floor(sourceIndex), input.length - 1);
      const nextIndex = Math.min(index + 1, input.length - 1);
      const fraction = sourceIndex - index;
      const sample = input[index] * (1 - fraction) + input[nextIndex] * fraction;
      const clamped = Math.max(-1, Math.min(1, sample));
      pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }
}

/**
 * Optional CRM/meeting tab audio capture.
 *
 * Chrome requires a user gesture and explicit tab/window selection.
 * The app never pretends it can silently capture another website's audio.
 */
export class RemoteAudioCaptureEngine extends AudioCaptureEngine {
  async startRemote(
    callbacks: AudioCaptureCallbacks,
  ): Promise<void> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('This browser does not support tab audio capture.');
    }

    // The browser requires a video selection for getDisplayMedia even when
    // the application only needs the selected tab's audio.
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const videoTrack = stream.getVideoTracks()[0];
    videoTrack?.stop();

    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error('No tab audio was shared. Select a browser tab and enable Share tab audio.');
    }

    await this.startWithStream(stream, callbacks);
  }

  private async startWithStream(
    stream: MediaStream,
    callbacks: AudioCaptureCallbacks,
  ) {
    // Reuse the exact same processing graph as microphone capture.
    this.mediaStream = stream;
    this.selectedDeviceId = 'crm-tab-audio';

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' }) as AudioContextWithSink;
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

    this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
    this.highPassNode = this.audioCtx.createBiquadFilter();
    this.highPassNode.type = 'highpass';
    this.highPassNode.frequency.value = 70;
    this.lowPassNode = this.audioCtx.createBiquadFilter();
    this.lowPassNode.type = 'lowpass';
    this.lowPassNode.frequency.value = 11500;
    this.compressorNode = this.audioCtx.createDynamicsCompressor();
    this.compressorNode.threshold.value = -30;
    this.compressorNode.knee.value = 20;
    this.compressorNode.ratio.value = 4;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.12;
    this.processingNode = this.audioCtx.createGain();
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.destinationNode = this.audioCtx.createMediaStreamDestination();
    this.sourceNode
      .connect(this.highPassNode)
      .connect(this.lowPassNode)
      .connect(this.compressorNode)
      .connect(this.processingNode)
      .connect(this.analyserNode);
    this.processingNode.connect(this.destinationNode);

    this.processorNode = this.audioCtx.createScriptProcessor(2048, 1, 1);
    this.monitorGainNode = this.audioCtx.createGain();
    this.monitorGainNode.gain.value = 0;
    this.processingNode.connect(this.processorNode);
    this.processorNode.connect(this.monitorGainNode).connect(this.audioCtx.destination);

    const sampleRate = this.audioCtx.sampleRate;
    this.processorNode.onaudioprocess = (event) => {
      if (!this.isCapturing || this.isMuted) return;
      callbacks.onAudioChunk(this.resampleAndEncodeForRemote(event.inputBuffer.getChannelData(0), sampleRate));
    };

    this.processedStream = this.destinationNode.stream;
    this.isCapturing = true;

    const updateVolume = () => {
      if (!this.isCapturing || !this.analyserNode) return;
      const data = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(data);
      let sum = 0;
      for (const value of data) sum += value;
      callbacks.onVolumeChange?.(Math.min(1, (sum / Math.max(1, data.length)) / 128));
      this.animFrameId = requestAnimationFrame(updateVolume);
    };
    this.animFrameId = requestAnimationFrame(updateVolume);
    callbacks.onStatus?.('capturing');

    stream.getAudioTracks()[0]?.addEventListener('ended', () => callbacks.onStatus?.('device-disconnected'));
  }

  private resampleAndEncodeForRemote(input: Float32Array, sampleRate: number): string {
    const targetRate = 16000;
    const ratio = sampleRate / targetRate;
    const targetLength = sampleRate === targetRate ? input.length : Math.max(1, Math.floor(input.length / ratio));
    const pcm = new Int16Array(targetLength);
    for (let i = 0; i < targetLength; i++) {
      const sourceIndex = sampleRate === targetRate ? i : i * ratio;
      const index = Math.min(Math.floor(sourceIndex), input.length - 1);
      const next = Math.min(index + 1, input.length - 1);
      const frac = sourceIndex - index;
      const sample = input[index] * (1 - frac) + input[next] * frac;
      const clamped = Math.max(-1, Math.min(1, sample));
      pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    const bytes = new Uint8Array(pcm.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
    }
    return btoa(binary);
  }
}
