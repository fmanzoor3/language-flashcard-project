/**
 * Azure OpenAI Client
 * Handles all communication with Azure OpenAI APIs
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: 'gpt-4o' | 'gpt-4o-mini';
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  gpt4oDeployment: string;
  gpt4oMiniDeployment: string;
}

function getConfig(): AzureOpenAIConfig {
  let endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT?.trim();
  const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY?.trim();
  const gpt4oDeployment = import.meta.env.VITE_AZURE_OPENAI_GPT4O_DEPLOYMENT?.trim() || 'gpt-4o';
  const gpt4oMiniDeployment = import.meta.env.VITE_AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT?.trim() || 'gpt-4o-mini';

  if (!endpoint || !apiKey) {
    throw new Error(
      'Azure OpenAI configuration missing. Please set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_API_KEY in your .env file.'
    );
  }

  // Ensure endpoint ends with a slash
  if (!endpoint.endsWith('/')) {
    endpoint += '/';
  }

  return { endpoint, apiKey, gpt4oDeployment, gpt4oMiniDeployment };
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  const config = getConfig();
  const {
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 1000,
    topP = 1,
  } = options;

  const deployment = model === 'gpt-4o' ? config.gpt4oDeployment : config.gpt4oMiniDeployment;
  const apiVersion = '2024-08-01-preview';

  const url = `${config.endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  options: ChatCompletionOptions = {}
): Promise<string> {
  const config = getConfig();
  const {
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 1000,
    topP = 1,
  } = options;

  const deployment = model === 'gpt-4o' ? config.gpt4oDeployment : config.gpt4oMiniDeployment;
  const apiVersion = '2024-08-01-preview';

  const url = `${config.endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      } catch {
        // Skip invalid JSON chunks
      }
    }
  }

  return fullContent;
}

export function isConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if realtime audio feature is enabled
 */
export function isRealtimeAudioEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_REALTIME_AUDIO === 'true';
}

/**
 * Get realtime audio configuration
 */
export function getRealtimeConfig(): { deployment: string; region: string } | null {
  if (!isRealtimeAudioEnabled()) return null;

  const deployment = import.meta.env.VITE_AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-4o-mini-realtime-preview';
  const region = import.meta.env.VITE_AZURE_REGION || 'swedencentral';

  return { deployment, region };
}
