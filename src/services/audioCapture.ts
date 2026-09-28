/**
 * Centralized live audio capture/routing.
 *
 * Important browser limitation:
 * createMediaStreamDestination() produces a real browser MediaStream that can be
 * consumed by WebRTC/MediaRecorder, but it does not create a new OS-level microphone
 * device. A system-wide "Linqua Translator" microphone still requires a native
 * virtual-audio driver/helper.
 */

export interface AudioCaptureCallbacks {
  onAudioChunk: (base64Pcm: string) => void;
  onVolumeChange?: (level: number) => void;
  onError?: (err: Error) => void;
  onDeviceEnded?: () => void;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface AudioOutputDevice {
  deviceId: string;
  label: string;
}

export interface AudioCaptureStatus {
  permission: 'unknown' | 'prompt' | 'granted' | 'denied';
  deviceId: string;
  deviceLabel: string;
  virtualMicrophone: 'unavailable' | 'browser-stream' | 'system-device';
  processing: 'idle' | 'processing' | 'unsupported';
}

const AudioContextCtor = () =>
  window.AudioContext ||
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

export class AudioCaptureEngine {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private highPassNode: BiquadFilterNode | null = null;
  private lowPassNode: BiquadFilterNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private silentGainNode: GainNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isMuted = false;
  private isCapturing = false;
  private animFrameId: number | null = null;
  private callbacks: AudioCaptureCallbacks | null = null;
  private status: AudioCaptureStatus = {
    permission: 'unknown',
    deviceId: '',
    deviceLabel: '',
    virtualMicrophone: 'unavailable',
    processing: 'idle',
  };

  static async enumerateDevices(): Promise<AudioDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === 'audioinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${index + 1}`,
      }));
  }

  static async enumerateOutputDevices(): Promise<AudioOutputDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === 'audiooutput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Audio output ${index + 1}`,
      }));
  }

  static async getPermissionState(): Promise<AudioCaptureStatus['permission']> {
    try {
      if (!navigator.permissions?.query) return 'prompt';
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      if (result.state === 'granted') return 'granted';
      if (result.state === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  async start(
    callbacks: AudioCaptureCallbacks,
    options: { noiseSuppression?: boolean; deviceId?: string } = {}
  ): Promise<MediaStream> {
    if (this.isCapturing && this.mediaStream) return this.mediaStream;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.status = { ...this.status, processing: 'unsupported' };
      throw new Error('This browser does not support microphone capture.');
    }

    this.callbacks = callbacks;

    try {
      const selectedDeviceId = options.deviceId || '';
      const constraints: MediaStreamConstraints = {
        audio: {
          channelCount: 1,
          ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: true,
        },
        video: false,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.status.permission = 'granted';

      const track = this.mediaStream.getAudioTracks()[0];
      const settings = track?.getSettings?.() || {};
      const devices = await AudioCaptureEngine.enumerateDevices();
      const deviceId = settings.deviceId || selectedDeviceId || devices[0]?.deviceId || '';
      const deviceLabel =
        track?.label ||
        devices.find((device) => device.deviceId === deviceId)?.label ||
        'Default microphone';

      this.status.deviceId = deviceId;
      this.status.deviceLabel = deviceLabel;

      track.addEventListener('ended', () => {
        this.callbacks?.onDeviceEnded?.();
      });

      const Ctor = AudioContextCtor();
      this.audioCtx = new Ctor({ latencyHint: 'interactive' });
      if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

      // Browser-level microphone processing. These are real capture constraints,
      // not simulated denoising.
      this.highPassNode = this.audioCtx.createBiquadFilter();
      this.highPassNode.type = 'highpass';
      this.highPassNode.frequency.value = 70;

      this.lowPassNode = this.audioCtx.createBiquadFilter();
      this.lowPassNode.type = 'lowpass';
      this.lowPassNode.frequency.value = 12000;

      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -36;
      this.compressorNode.knee.value = 18;
      this.compressorNode.ratio.value = 3;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.12;

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.25;

      this.destinationNode = this.audioCtx.createMediaStreamDestination();
      this.silentGainNode = this.audioCtx.createGain();
      this.silentGainNode.gain.value = 0;

      this.sourceNode
        .connect(this.highPassNode)
        .connect(this.lowPassNode)
        .connect(this.compressorNode);

      this.compressorNode.connect(this.analyserNode);
      this.compressorNode.connect(this.destinationNode);

      // Keep the processing graph alive without sending microphone audio to speakers.
      // ScriptProcessor is used only as a compatibility fallback for PCM extraction.
      this.processorNode = this.audioCtx.createScriptProcessor(2048, 1, 1);
      this.compressorNode.connect(this.processorNode);
      this.processorNode.connect(this.silentGainNode);
      this.silentGainNode.connect(this.audioCtx.destination);

      const sampleRate = this.audioCtx.sampleRate;
      this.processorNode.onaudioprocess = (event) => {
        if (!this.isCapturing || this.isMuted) return;
        const input = event.inputBuffer.getChannelData(0);
        const pcm = this.resampleAndEncodeTo16kPCM(input, sampleRate);
        if (pcm) callbacks.onAudioChunk(pcm);
      };

      this.isCapturing = true;
      this.status.processing = 'processing';
      this.status.virtualMicrophone = 'browser-stream';

      this.startVolumeLoop(callbacks.onVolumeChange);

      return this.mediaStream;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      if ((err as DOMException)?.name === 'NotAllowedError') {
        this.status.permission = 'denied';
      }
      this.stop();
      callbacks.onError?.(error);
      throw error;
    }
  }

  getProcessedStream(): MediaStream | null {
    return this.destinationNode?.stream || null;
  }

  getStatus(): AudioCaptureStatus {
    return { ...this.status };
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
      try { this.processorNode.disconnect(); } catch {}
      this.processorNode = null;
    }

    for (const node of [
      this.sourceNode,
      this.highPassNode,
      this.lowPassNode,
      this.compressorNode,
      this.analyserNode,
      this.destinationNode,
      this.silentGainNode,
    ]) {
      try { node?.disconnect(); } catch {}
    }

    this.sourceNode = null;
    this.highPassNode = null;
    this.lowPassNode = null;
    this.compressorNode = null;
    this.analyserNode = null;
    this.destinationNode = null;
    this.silentGainNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close().catch(() => undefined);
    }
    this.audioCtx = null;

    this.status.processing = 'idle';
    this.status.virtualMicrophone = 'unavailable';
    this.callbacks = null;
  }

  private startVolumeLoop(onVolumeChange?: (level: number) => void) {
    if (!onVolumeChange || !this.analyserNode) return;
    const update = () => {
      if (!this.isCapturing || !this.analyserNode) return;
      const data = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const centered = (value - 128) / 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / data.length);
      onVolumeChange(this.isMuted ? 0 : Math.min(1, rms * 3));
      this.animFrameId = requestAnimationFrame(update);
    };
    this.animFrameId = requestAnimationFrame(update);
  }

  private resampleAndEncodeTo16kPCM(inputData: Float32Array, inputSampleRate: number): string {
    const ratio = inputSampleRate / 16000;
    const targetLength = Math.max(1, Math.floor(inputData.length / ratio));
    const pcm16 = new Int16Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
      const srcIndex = i * ratio;
      const index = Math.floor(srcIndex);
      const nextIndex = Math.min(index + 1, inputData.length - 1);
      const frac = srcIndex - index;
      const value = inputData[index] * (1 - frac) + inputData[nextIndex] * frac;
      const s = Math.max(-1, Math.min(1, value));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return int16ToBase64(pcm16);
  }
}

/**
 * Routes the processed microphone MediaStream to an OS audio-output device.
 *
 * With a virtual audio driver installed (for example a virtual cable), this
 * provides a browser-to-driver bridge:
 * processed mic → virtual cable playback endpoint → CRM recording endpoint.
 *
 * The browser still does not create/rename the OS device.
 */
export class VirtualMicBridge {
  private audioElement: HTMLAudioElement | null = null;
  private stream: MediaStream | null = null;

  async connect(stream: MediaStream, sinkId: string): Promise<void> {
    if (!sinkId) {
      throw new Error('Select a virtual-audio playback device before connecting the microphone bridge.');
    }

    if (!('setSinkId' in HTMLMediaElement.prototype)) {
      throw new Error('This browser does not support selecting an audio output device.');
    }

    this.stop();

    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.controls = false;
    audio.muted = false;
    audio.volume = 1;
    audio.setAttribute('aria-hidden', 'true');
    audio.style.position = 'fixed';
    audio.style.width = '1px';
    audio.style.height = '1px';
    audio.style.opacity = '0';
    audio.style.pointerEvents = 'none';

    audio.srcObject = stream;

    const setSinkId = (audio as HTMLAudioElement & {
      setSinkId: (id: string) => Promise<void>;
    }).setSinkId.bind(audio);

    await setSinkId(sinkId);
    document.body.appendChild(audio);

    try {
      await audio.play();
    } catch {
      audio.remove();
      audio.srcObject = null;
      throw new Error('The virtual microphone bridge could not start audio playback. Start it from a user action and allow audio output access.');
    }

    this.audioElement = audio;
    this.stream = stream;
  }

  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement.remove();
      this.audioElement = null;
    }
    this.stream = null;
  }

  isActive() {
    return Boolean(this.audioElement && this.stream);
  }
}

/**
 * Captures CRM/remote tab audio using the browser's explicit screen/tab sharing flow.
 * This is the browser-supported route for getting the other party's call audio.
 */
export class CrmAudioCaptureEngine {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private highPassNode: BiquadFilterNode | null = null;
  private lowPassNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private silentGainNode: GainNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isCapturing = false;
  private animFrameId: number | null = null;

  async start(
    onAudioChunk: (base64Pcm: string) => void,
    onVolumeChange?: (level: number) => void,
    onEnded?: () => void
  ): Promise<void> {
    this.stop();

    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('This browser does not support tab/window audio capture.');
    }

    this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
      preferCurrentTab: false,
      selfBrowserSurface: 'exclude',
      surfaceSwitching: 'include',
    } as DisplayMediaStreamOptions & {
      preferCurrentTab?: boolean;
      selfBrowserSurface?: string;
      surfaceSwitching?: string;
    });

    const audioTrack = this.mediaStream.getAudioTracks()[0];
    if (!audioTrack) {
      this.stop();
      throw new Error('No shared tab audio track was provided. Select the CRM tab and enable its audio.');
    }

    audioTrack.addEventListener('ended', () => {
      this.stop();
      onEnded?.();
    });

    // Video is not needed after the browser grants the capture; stop it immediately.
    this.mediaStream.getVideoTracks().forEach((track) => track.stop());

    const Ctor = AudioContextCtor();
    this.audioCtx = new Ctor({ latencyHint: 'interactive' });
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

    this.sourceNode = this.audioCtx.createMediaStreamSource(
      new MediaStream([audioTrack])
    );

    // Remote/tab audio cleanup. This is deterministic Web Audio conditioning,
    // not a claim of AI denoising.
    this.highPassNode = this.audioCtx.createBiquadFilter();
    this.highPassNode.type = 'highpass';
    this.highPassNode.frequency.value = 60;

    this.lowPassNode = this.audioCtx.createBiquadFilter();
    this.lowPassNode.type = 'lowpass';
    this.lowPassNode.frequency.value = 12000;

    this.compressorNode = this.audioCtx.createDynamicsCompressor();
    this.compressorNode.threshold.value = -34;
    this.compressorNode.knee.value = 20;
    this.compressorNode.ratio.value = 3;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.15;

    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.25;

    this.sourceNode
      .connect(this.highPassNode)
      .connect(this.lowPassNode)
      .connect(this.compressorNode)
      .connect(this.analyserNode);

    // Restore CRM audio locally because display/tab capture may otherwise suppress it.
    this.compressorNode.connect(this.audioCtx.destination);

    this.processorNode = this.audioCtx.createScriptProcessor(2048, 1, 1);
    this.silentGainNode = this.audioCtx.createGain();
    this.silentGainNode.gain.value = 0;
    this.compressorNode.connect(this.processorNode);
    this.processorNode.connect(this.silentGainNode);
    this.silentGainNode.connect(this.audioCtx.destination);

    const sampleRate = this.audioCtx.sampleRate;
    this.processorNode.onaudioprocess = (event) => {
      if (!this.isCapturing) return;
      const input = event.inputBuffer.getChannelData(0);
      onAudioChunk(resampleAndEncodeTo16kPCM(input, sampleRate));
    };

    this.isCapturing = true;

    if (onVolumeChange) {
      const update = () => {
        if (!this.isCapturing || !this.analyserNode) return;
        const data = new Uint8Array(this.analyserNode.frequencyBinCount);
        this.analyserNode.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
          const centered = (value - 128) / 128;
          sum += centered * centered;
        }
        onVolumeChange(Math.min(1, Math.sqrt(sum / data.length) * 3));
        this.animFrameId = requestAnimationFrame(update);
      };
      this.animFrameId = requestAnimationFrame(update);
    }
  }

  isActive() {
    return this.isCapturing;
  }

  stop() {
    this.isCapturing = false;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = null;

    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      try { this.processorNode.disconnect(); } catch {}
    }

    for (const node of [
      this.sourceNode,
      this.highPassNode,
      this.lowPassNode,
      this.compressorNode,
      this.analyserNode,
      this.silentGainNode,
    ]) {
      try { node?.disconnect(); } catch {}
    }

    this.processorNode = null;
    this.sourceNode = null;
    this.highPassNode = null;
    this.lowPassNode = null;
    this.compressorNode = null;
    this.analyserNode = null;
    this.silentGainNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close().catch(() => undefined);
    }
    this.audioCtx = null;
  }
}

function resampleAndEncodeTo16kPCM(inputData: Float32Array, inputSampleRate: number): string {
  const ratio = inputSampleRate / 16000;
  const targetLength = Math.max(1, Math.floor(inputData.length / ratio));
  const pcm16 = new Int16Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const index = Math.floor(srcIndex);
    const nextIndex = Math.min(index + 1, inputData.length - 1);
    const frac = srcIndex - index;
    const value = inputData[index] * (1 - frac) + inputData[nextIndex] * frac;
    const s = Math.max(-1, Math.min(1, value));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return int16ToBase64(pcm16);
}

function int16ToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
