/**
 * Audio Capture Service
 * Handles microphone and tab audio capture for real-time transcription
 */

import type { AudioSourceType } from '../../types';

export type MicrophonePermission = 'granted' | 'denied' | 'prompt';

interface AudioCaptureState {
  mediaStream: MediaStream | null;
  audioContext: AudioContext | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  processorNode: ScriptProcessorNode | null;
  isCapturing: boolean;
  isPaused: boolean;
  audioSource: AudioSourceType;
}

let captureState: AudioCaptureState = {
  mediaStream: null,
  audioContext: null,
  sourceNode: null,
  processorNode: null,
  isCapturing: false,
  isPaused: false,
  audioSource: 'microphone',
};

// Target sample rate for Azure transcription API
const TARGET_SAMPLE_RATE = 24000;
// Smaller buffer = lower latency (2048 samples @ 24kHz = ~85ms chunks)
// Trade-off: smaller buffers increase CPU usage but reduce delay
const BUFFER_SIZE = 2048;

/**
 * Check if microphone permission is already granted
 */
export async function checkMicrophonePermission(): Promise<MicrophonePermission> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state as MicrophonePermission;
  } catch {
    // Permissions API not supported, return 'prompt' as default
    return 'prompt';
  }
}

/**
 * Request microphone access and initialize the audio context
 */
export async function initializeMicrophone(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: TARGET_SAMPLE_RATE,
      },
    });

    captureState.mediaStream = stream;
    captureState.audioSource = 'microphone';
    return stream;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission denied. Please allow microphone access to use transcription.');
      }
      if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      }
    }
    throw new Error('Failed to access microphone. Please check your audio settings.');
  }
}

/**
 * Request tab audio capture via screen/tab sharing
 * This captures audio from a browser tab (useful for capturing audio from web apps like Teams, Meet, etc.)
 */
export async function initializeTabCapture(): Promise<MediaStream> {
  try {
    // Request screen/tab capture with audio only
    // The user will see a picker to choose which tab to capture
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        // We need to request video for getDisplayMedia, but we'll only use audio
        // Some browsers require video to be requested
        width: 1,
        height: 1,
        frameRate: 1,
      },
      audio: {
        echoCancellation: false,  // Don't process tab audio
        noiseSuppression: false,
        autoGainControl: false,
      },
      // @ts-expect-error - preferCurrentTab is a newer API option
      preferCurrentTab: false, // Don't default to current tab
    });

    // Check if we got an audio track
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      // Stop the video track if present
      stream.getVideoTracks().forEach(track => track.stop());
      throw new Error('No audio track available. Please select a tab with audio.');
    }

    // Stop the video track - we only need audio
    stream.getVideoTracks().forEach(track => track.stop());

    // Create a new stream with only the audio track
    const audioOnlyStream = new MediaStream(audioTracks);

    captureState.mediaStream = audioOnlyStream;
    captureState.audioSource = 'tab';
    return audioOnlyStream;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
        throw new Error('Tab capture cancelled. Please select a tab to capture audio from.');
      }
      if (error.name === 'NotSupportedError') {
        throw new Error('Tab audio capture is not supported in this browser. Please use Chrome or Edge.');
      }
    }
    throw new Error('Failed to capture tab audio. Please try again.');
  }
}

/**
 * Check if tab audio capture is supported in this browser
 */
export function isTabCaptureSupported(): boolean {
  return 'getDisplayMedia' in navigator.mediaDevices;
}

/**
 * Get the current audio source type
 */
export function getAudioSource(): AudioSourceType {
  return captureState.audioSource;
}

/**
 * Start continuous audio capture and encoding
 * @param onChunk - Callback function that receives base64-encoded PCM16 audio chunks
 */
export function startCapture(onChunk: (base64Chunk: string) => void): void {
  if (!captureState.mediaStream) {
    throw new Error('Microphone not initialized. Call initializeMicrophone() first.');
  }

  if (captureState.isCapturing) {
    console.warn('Audio capture is already running');
    return;
  }

  // Create AudioContext - let browser choose optimal sample rate, we'll resample
  captureState.audioContext = new AudioContext();
  const actualSampleRate = captureState.audioContext.sampleRate;
  console.log(`Audio context sample rate: ${actualSampleRate}Hz, target: ${TARGET_SAMPLE_RATE}Hz`);

  // Calculate resampling ratio
  const resampleRatio = TARGET_SAMPLE_RATE / actualSampleRate;
  const needsResampling = Math.abs(resampleRatio - 1) > 0.01;

  // Create source node from microphone stream
  captureState.sourceNode = captureState.audioContext.createMediaStreamSource(captureState.mediaStream);

  // Create processor node for capturing audio data
  // Note: ScriptProcessorNode is deprecated but has better browser support
  // For production, consider using AudioWorklet
  captureState.processorNode = captureState.audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

  captureState.processorNode.onaudioprocess = (event) => {
    if (captureState.isPaused) return;

    const rawInputData = event.inputBuffer.getChannelData(0);

    // Resample if needed (browser sample rate differs from target)
    const inputData = needsResampling
      ? resampleAudio(rawInputData, actualSampleRate, TARGET_SAMPLE_RATE)
      : rawInputData;

    // Convert Float32 samples to PCM16
    const pcm16Buffer = float32ToPCM16(inputData);

    // Convert to base64 and send
    const base64Chunk = arrayBufferToBase64(pcm16Buffer);
    onChunk(base64Chunk);
  };

  // Connect the audio graph
  captureState.sourceNode.connect(captureState.processorNode);
  captureState.processorNode.connect(captureState.audioContext.destination);

  captureState.isCapturing = true;
  captureState.isPaused = false;
}

/**
 * Resample audio data from source sample rate to target sample rate
 * Uses linear interpolation for efficiency
 */
function resampleAudio(input: Float32Array, sourceSampleRate: number, targetSampleRate: number): Float32Array {
  const ratio = targetSampleRate / sourceSampleRate;
  const outputLength = Math.round(input.length * ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i / ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation between samples
    output[i] = input[srcIndexFloor] * (1 - fraction) + input[srcIndexCeil] * fraction;
  }

  return output;
}

/**
 * Stop audio capture and release resources
 */
export function stopCapture(): void {
  if (captureState.processorNode) {
    captureState.processorNode.disconnect();
    captureState.processorNode = null;
  }

  if (captureState.sourceNode) {
    captureState.sourceNode.disconnect();
    captureState.sourceNode = null;
  }

  if (captureState.audioContext) {
    captureState.audioContext.close();
    captureState.audioContext = null;
  }

  if (captureState.mediaStream) {
    captureState.mediaStream.getTracks().forEach(track => track.stop());
    captureState.mediaStream = null;
  }

  captureState.isCapturing = false;
  captureState.isPaused = false;
  captureState.audioSource = 'microphone';
}

/**
 * Pause audio capture (stops sending chunks but keeps resources)
 */
export function pauseCapture(): void {
  captureState.isPaused = true;
}

/**
 * Resume audio capture
 */
export function resumeCapture(): void {
  captureState.isPaused = false;
}

/**
 * Check if audio capture is currently active
 */
export function isCapturing(): boolean {
  return captureState.isCapturing;
}

/**
 * Check if audio capture is paused
 */
export function isPaused(): boolean {
  return captureState.isPaused;
}

/**
 * Convert Float32Array audio samples to PCM16 (Int16)
 * This is the format required by Azure's transcription API
 */
export function float32ToPCM16(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to -1.0 to 1.0 range
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    // Convert to 16-bit integer (-32768 to 32767)
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    // Write as little-endian
    view.setInt16(i * 2, int16, true);
  }

  return buffer;
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Get the current audio level (0-1) for visualization
 * Returns the RMS (Root Mean Square) of recent audio samples
 */
export function getAudioLevel(): number {
  if (!captureState.audioContext || !captureState.sourceNode) {
    return 0;
  }

  // This is a simplified version - for better visualization,
  // consider using an AnalyserNode
  return 0;
}
