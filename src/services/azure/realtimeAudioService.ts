/**
 * Azure OpenAI Realtime Audio Service
 * Handles text-to-speech via WebSocket connection
 *
 * Note: Azure OpenAI Realtime API requires specific WebSocket authentication.
 * The API key must be passed via the 'api-key' query parameter for browser WebSocket connections.
 */

export type VoiceOption = 'alloy' | 'echo' | 'shimmer';
export type PlaybackSpeed = 0.5 | 0.75 | 1.0 | 1.25 | 1.5;

interface RealtimeConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
}

function getRealtimeConfig(): RealtimeConfig {
  let endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT?.trim();
  const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY?.trim();
  const deployment = import.meta.env.VITE_AZURE_OPENAI_REALTIME_DEPLOYMENT?.trim() || 'gpt-4o-mini-realtime-preview';

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI configuration missing for realtime audio.');
  }

  // Convert HTTP endpoint to WebSocket endpoint
  // Remove trailing slash and protocol, then rebuild
  endpoint = endpoint.replace(/\/$/, '').replace('https://', '').replace('http://', '');

  return { endpoint: `wss://${endpoint}`, apiKey, deployment };
}

interface AudioSession {
  ws: WebSocket;
  audioContext: AudioContext;
  audioQueue: Float32Array[];
  isPlaying: boolean;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

let currentSession: AudioSession | null = null;

/**
 * Synthesize Turkish text to speech using Azure OpenAI Realtime API
 */
export async function synthesizeSpeech(
  text: string,
  options: {
    voice?: VoiceOption;
    speed?: PlaybackSpeed;
    onStart?: () => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<void> {
  const { voice = 'alloy', speed = 1.0, onStart, onComplete, onError } = options;

  // Stop any existing playback
  stopPlayback();

  const config = getRealtimeConfig();
  const apiVersion = '2024-10-01-preview';

  // Build WebSocket URL with API key as query parameter (required for browser WebSocket)
  // Azure OpenAI Realtime API accepts the api-key in the URL for browser clients
  const wsUrl = `${config.endpoint}/openai/realtime?api-version=${apiVersion}&deployment=${config.deployment}&api-key=${encodeURIComponent(config.apiKey)}`;

  return new Promise((resolve, reject) => {
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      const error = new Error(
        'Failed to create WebSocket connection. Make sure the gpt-4o-mini-realtime-preview model is deployed in your Azure OpenAI resource.'
      );
      onError?.(error);
      reject(error);
      return;
    }

    const audioContext = new AudioContext({ sampleRate: 24000 });
    const audioQueue: Float32Array[] = [];

    currentSession = {
      ws,
      audioContext,
      audioQueue,
      isPlaying: false,
      onComplete,
      onError,
    };

    ws.onopen = () => {
      // Configure session for TTS
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: voice,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          instructions: 'You are a Turkish language teacher. Speak the given text clearly in Turkish.',
          turn_detection: null, // Disable turn detection for TTS mode
        },
      };

      ws.send(JSON.stringify(sessionConfig));

      // Send text to speak
      const conversationItem = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Please say the following Turkish text clearly: "${text}"`,
            },
          ],
        },
      };

      ws.send(JSON.stringify(conversationItem));

      // Trigger response with both text and audio modalities (required by Azure)
      const responseCreate = {
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
        },
      };

      ws.send(JSON.stringify(responseCreate));

      onStart?.();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'response.audio.delta': {
            // Decode base64 audio data
            const audioData = base64ToFloat32Array(message.delta);
            audioQueue.push(audioData);

            // Start playing if not already
            if (currentSession && !currentSession.isPlaying) {
              currentSession.isPlaying = true;
              playAudioQueue(audioContext, audioQueue, speed);
            }
            break;
          }

          case 'response.audio.done': {
            // Audio generation complete
            break;
          }

          case 'response.done': {
            // Full response complete, close connection after audio plays
            setTimeout(() => {
              ws.close();
              onComplete?.();
              resolve();
            }, 500);
            break;
          }

          case 'error': {
            const error = new Error(message.error?.message || 'Realtime API error');
            onError?.(error);
            reject(error);
            ws.close();
            break;
          }
        }
      } catch (err) {
        console.error('Error processing realtime message:', err);
      }
    };

    ws.onerror = () => {
      const error = new Error(
        'WebSocket connection failed. Possible causes:\n' +
        '1. The gpt-4o-mini-realtime-preview model is not deployed in your Azure OpenAI resource\n' +
        '2. The Realtime API may not be available in your Azure region\n' +
        '3. Check your Azure OpenAI deployment settings in the Azure Portal'
      );
      onError?.(error);
      reject(error);
    };

    ws.onclose = () => {
      if (currentSession?.ws === ws) {
        currentSession = null;
      }
    };
  });
}

/**
 * Convert base64 PCM16 audio to Float32Array for Web Audio API
 */
function base64ToFloat32Array(base64: string): Float32Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert PCM16 to Float32
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);

  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768;
  }

  return float32;
}

/**
 * Play audio queue through Web Audio API
 */
async function playAudioQueue(
  audioContext: AudioContext,
  audioQueue: Float32Array[],
  speed: PlaybackSpeed
): Promise<void> {
  let currentTime = audioContext.currentTime;

  while (currentSession?.isPlaying) {
    if (audioQueue.length === 0) {
      // Wait for more audio data
      await new Promise((resolve) => setTimeout(resolve, 50));
      continue;
    }

    const audioData = audioQueue.shift()!;
    const buffer = audioContext.createBuffer(1, audioData.length, 24000);
    buffer.getChannelData(0).set(audioData);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = speed;
    source.connect(audioContext.destination);
    source.start(currentTime);

    currentTime += buffer.duration / speed;

    // Small delay to avoid overwhelming the audio system
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Stop current audio playback
 */
export function stopPlayback(): void {
  if (currentSession) {
    currentSession.isPlaying = false;

    if (currentSession.ws.readyState === WebSocket.OPEN) {
      currentSession.ws.close();
    }

    if (currentSession.audioContext.state !== 'closed') {
      currentSession.audioContext.close();
    }

    currentSession = null;
  }
}

/**
 * Check if audio is currently playing
 */
export function isPlaying(): boolean {
  return currentSession?.isPlaying ?? false;
}

/**
 * Check if realtime audio is available
 */
export function isRealtimeAudioAvailable(): boolean {
  const enabled = import.meta.env.VITE_ENABLE_REALTIME_AUDIO === 'true';
  const hasConfig = !!import.meta.env.VITE_AZURE_OPENAI_ENDPOINT && !!import.meta.env.VITE_AZURE_OPENAI_API_KEY;
  return enabled && hasConfig;
}
